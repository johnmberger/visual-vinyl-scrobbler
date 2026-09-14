import axios from "axios";
import crypto from "crypto";
import { config } from "../config";
import { normalizeName } from "../fuzzy";
import { getSessionKey } from "./auth";
import { searchLastFmAlbum, searchLastFmTrack } from "./search";
import type { LastFmTrack } from "./types";

function parseDuration(duration: string): number {
  const parts = duration.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 180;
}

export async function scrobbleTrack(track: LastFmTrack): Promise<boolean> {
  try {
    const sessionKey = await getSessionKey();
    if (!sessionKey) {
      throw new Error("Failed to authenticate with Last.fm");
    }

    const timestamp = track.timestamp || Math.floor(Date.now() / 1000);
    const method = "track.scrobble";

    const params: Record<string, string> = {
      method,
      api_key: config.lastfm.apiKey,
      artist: track.artist,
      track: track.track,
      timestamp: timestamp.toString(),
      sk: sessionKey,
    };

    if (track.album) {
      params.album = track.album;
    }

    const sigString =
      Object.keys(params)
        .sort()
        .map((key) => `${key}${params[key]}`)
        .join("") + config.lastfm.apiSecret;

    const apiSig = crypto.createHash("md5").update(sigString).digest("hex");

    const response = await axios.post(
      "https://ws.audioscrobbler.com/2.0/",
      null,
      {
        params: {
          ...params,
          api_sig: apiSig,
          format: "json",
        },
      }
    );

    if (response.data?.error) {
      console.error(
        "Last.fm scrobble error:",
        response.data.error,
        response.data.message
      );
      throw new Error(
        `Last.fm scrobble failed: ${
          response.data.message || response.data.error
        }`
      );
    }

    const scrobbles = response.data?.scrobbles;
    const attrs = scrobbles?.["@attr"] || {};
    const accepted = attrs.accepted;
    const ignored = attrs.ignored || "0";
    const scrobbleArray = scrobbles?.scrobble;

    if (accepted === "1" || accepted === 1) {
      return true;
    }

    if (ignored !== "0" && ignored !== 0) {
      let ignoreReason = "unknown reason";
      if (scrobbleArray) {
        const scrobble = Array.isArray(scrobbleArray)
          ? scrobbleArray[0]
          : scrobbleArray;
        ignoreReason =
          scrobble?.["@attr"]?.ignoredMessage ||
          scrobble?.ignoredMessage ||
          ignored.toString();
      }

      console.warn(`Scrobble ignored by Last.fm: ${ignoreReason}`);

      const ignoreStr = ignoreReason.toString().toLowerCase();
      if (
        ignoreStr.includes("duplicate") ||
        ignoreStr.includes("recent") ||
        ignoreStr.includes("recently")
      ) {
        return true;
      }

      throw new Error(
        `Scrobble ignored by Last.fm: ${ignoreReason}. ` +
          `This might mean the track doesn't exist or there's a naming mismatch.`
      );
    }

    let errorMsg = "Unknown reason";
    if (scrobbleArray) {
      const scrobble = Array.isArray(scrobbleArray)
        ? scrobbleArray[0]
        : scrobbleArray;
      errorMsg =
        scrobble?.["@attr"]?.ignoredMessage ||
        scrobble?.ignoredMessage ||
        scrobble?.["@attr"]?.error ||
        "Not accepted";
    }

    console.error("Scrobble not accepted by Last.fm:", {
      accepted,
      ignored,
      errorMsg,
      fullResponse: response.data,
    });

    throw new Error(
      `Scrobble was not accepted by Last.fm: ${errorMsg}. ` +
        `This might mean the track/album doesn't exist in Last.fm's database or the names don't match. ` +
        `Try verifying the artist and album names match Last.fm's database.`
    );
  } catch (error: any) {
    console.error("Error scrobbling to Last.fm:", error);
    if (error.response?.data) {
      console.error("Last.fm API response:", error.response.data);
    }
    throw error;
  }
}

export async function scrobbleTracks(
  tracks: Array<{
    artist: string;
    track: string;
    album: string;
    timestamp: number;
  }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < tracks.length; i++) {
    try {
      const result = await scrobbleTrack(tracks[i]);
      if (result) {
        success++;
      } else {
        failed++;
        errors.push(`Failed to scrobble: ${tracks[i].track}`);
      }
    } catch (error: any) {
      failed++;
      errors.push(
        `Error scrobbling "${tracks[i].track}": ${
          error.message || "Unknown error"
        }`
      );
    }

    if (i < tracks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { success, failed, errors };
}

/**
 * Scrobble an album using Discogs sides when available, else Last.fm tracklist.
 */
export async function scrobbleAlbum(
  artist: string,
  album: string,
  timestamp?: number,
  discogsRelease?: any,
  selectedSides?: string[]
): Promise<boolean> {
  const scrobbleTimestamp = timestamp || Math.floor(Date.now() / 1000);

  if (
    selectedSides &&
    selectedSides.length > 0 &&
    discogsRelease?.tracklist &&
    discogsRelease.tracklist.length > 0
  ) {
    const { parseTracklistSides } = await import("../discogs");
    const sides = parseTracklistSides(discogsRelease.tracklist);
    const selectedSidesData = sides.filter((s) =>
      selectedSides.includes(s.side)
    );

    if (selectedSidesData.length > 0) {
      const lastFmAlbum = await searchLastFmAlbum(artist, album);
      const lastFmTracks = lastFmAlbum?.tracks || [];

      const tracksToScrobble: Array<{
        artist: string;
        track: string;
        album: string;
        timestamp: number;
      }> = [];

      let currentTimestamp = scrobbleTimestamp;

      for (const side of selectedSidesData) {
        for (const discogsTrack of side.tracks) {
          let trackName = discogsTrack.title;
          let trackArtist = artist;

          if (lastFmTracks.length > 0) {
            const normalizedDiscogsTitle = normalizeName(discogsTrack.title);
            const match = lastFmTracks.find((lfmTrack) => {
              const normalizedLfmTitle = normalizeName(lfmTrack.name);
              return (
                normalizedLfmTitle === normalizedDiscogsTitle ||
                normalizedLfmTitle.includes(normalizedDiscogsTitle) ||
                normalizedDiscogsTitle.includes(normalizedLfmTitle)
              );
            });

            if (match) {
              trackName = match.name;
              trackArtist = match.artist || artist;
            }
          }

          tracksToScrobble.push({
            artist: trackArtist,
            track: trackName,
            album: lastFmAlbum?.name || album,
            timestamp: currentTimestamp,
          });

          const duration = discogsTrack.duration
            ? parseDuration(discogsTrack.duration)
            : 180;
          currentTimestamp += duration;
        }
      }

      if (tracksToScrobble.length > 0) {
        const result = await scrobbleTracks(tracksToScrobble);
        if (result.success > 0) {
          if (result.errors.length > 0) {
            console.warn("Scrobble errors:", result.errors);
          }
          return result.failed === 0;
        }
      }
    }
  }

  const lastFmAlbum = await searchLastFmAlbum(artist, album);

  if (lastFmAlbum?.tracks && lastFmAlbum.tracks.length > 0) {
    const tracksToScrobble: Array<{
      artist: string;
      track: string;
      album: string;
      timestamp: number;
    }> = [];

    let currentTimestamp = scrobbleTimestamp;

    for (const lfmTrack of lastFmAlbum.tracks) {
      tracksToScrobble.push({
        artist: lfmTrack.artist || lastFmAlbum.artist,
        track: lfmTrack.name,
        album: lastFmAlbum.name,
        timestamp: currentTimestamp,
      });

      let duration = 180;
      if (lfmTrack.duration) {
        if (typeof lfmTrack.duration === "number") {
          duration = lfmTrack.duration;
        } else if (typeof lfmTrack.duration === "string") {
          duration = parseInt(lfmTrack.duration) || 180;
        }
      }
      currentTimestamp += duration;
    }

    if (tracksToScrobble.length > 0) {
      const result = await scrobbleTracks(tracksToScrobble);
      if (result.success > 0) {
        if (result.errors.length > 0) {
          console.warn("Scrobble errors:", result.errors);
        }
        return result.failed === 0;
      }
    }
  }

  const verifiedTrack = await searchLastFmTrack(artist, album);

  if (verifiedTrack) {
    return await scrobbleTrack({
      artist: verifiedTrack.artist,
      track: verifiedTrack.name,
      album,
      timestamp: scrobbleTimestamp,
    });
  }

  console.warn(
    `Could not find "${album}" by "${artist}" on Last.fm. Attempting to scrobble album title as track (may fail).`
  );

  return await scrobbleTrack({
    artist,
    track: album,
    album,
    timestamp: scrobbleTimestamp,
  });
}
