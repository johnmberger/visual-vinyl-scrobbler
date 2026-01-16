import axios from "axios";
import crypto from "crypto";
import { config } from "./config";

export interface LastFmTrack {
  artist: string;
  track: string;
  album?: string;
  timestamp?: number;
}

export interface LastFmTrackInfo {
  name: string;
  artist: string;
  album?: string;
  mbid?: string;
}

export interface LastFmAlbumInfo {
  name: string;
  artist: string;
  tracks?: Array<{
    name: string;
    artist: string;
    duration?: string | number;
  }>;
}

// Normalize artist/album names for better matching
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/[^\w\s-]/g, "") // Remove special chars except hyphens
    .toLowerCase();
}

// Search for a track on Last.fm to verify it exists
export async function searchLastFmTrack(
  artist: string,
  track: string
): Promise<LastFmTrackInfo | null> {
  try {
    const response = await axios.get("https://ws.audioscrobbler.com/2.0/", {
      params: {
        method: "track.search",
        track,
        artist,
        api_key: config.lastfm.apiKey,
        format: "json",
        limit: 10,
      },
    });

    const tracks = response.data?.results?.trackmatches?.track;
    if (!tracks || tracks.length === 0) {
      return null;
    }

    // Try to find exact match (case-insensitive)
    const normalizedTrack = normalizeName(track);
    const normalizedArtist = normalizeName(artist);

    for (const result of Array.isArray(tracks) ? tracks : [tracks]) {
      if (
        normalizeName(result.name) === normalizedTrack &&
        normalizeName(result.artist) === normalizedArtist
      ) {
        return {
          name: result.name,
          artist: result.artist,
          mbid: result.mbid,
        };
      }
    }

    // Return first result if no exact match
    const first = Array.isArray(tracks) ? tracks[0] : tracks;
    return {
      name: first.name,
      artist: first.artist,
      mbid: first.mbid,
    };
  } catch (error) {
    console.error("Error searching Last.fm for track:", error);
    return null;
  }
}

// Search for an album on Last.fm to verify it exists and get tracklist
export async function searchLastFmAlbum(
  artist: string,
  album: string
): Promise<LastFmAlbumInfo | null> {
  try {
    const response = await axios.get("https://ws.audioscrobbler.com/2.0/", {
      params: {
        method: "album.search",
        album,
        artist,
        api_key: config.lastfm.apiKey,
        format: "json",
        limit: 10,
      },
    });

    const albums = response.data?.results?.albummatches?.album;
    if (!albums || albums.length === 0) {
      return null;
    }

    // Try to find exact match
    const normalizedAlbum = normalizeName(album);
    const normalizedArtist = normalizeName(artist);

    for (const result of Array.isArray(albums) ? albums : [albums]) {
      if (
        normalizeName(result.name) === normalizedAlbum &&
        normalizeName(result.artist) === normalizedArtist
      ) {
        // Get album info with tracklist
        try {
          const albumInfo = await getLastFmAlbumInfo(
            result.artist,
            result.name
          );
          return albumInfo;
        } catch {
          // Fallback to search result
          return {
            name: result.name,
            artist: result.artist,
          };
        }
      }
    }

    // Return first result if no exact match
    const first = Array.isArray(albums) ? albums[0] : albums;
    try {
      const albumInfo = await getLastFmAlbumInfo(first.artist, first.name);
      return albumInfo;
    } catch {
      return {
        name: first.name,
        artist: first.artist,
      };
    }
  } catch (error) {
    console.error("Error searching Last.fm for album:", error);
    return null;
  }
}

// Get detailed album info including tracklist
async function getLastFmAlbumInfo(
  artist: string,
  album: string
): Promise<LastFmAlbumInfo> {
  try {
    const response = await axios.get("https://ws.audioscrobbler.com/2.0/", {
      params: {
        method: "album.getInfo",
        artist,
        album,
        api_key: config.lastfm.apiKey,
        format: "json",
        autocorrect: 1, // Auto-correct spelling
      },
    });

    const albumData = response.data?.album;
    if (!albumData) {
      throw new Error("No album data returned");
    }

    const tracks = albumData.tracks?.track;
    const trackList = Array.isArray(tracks)
      ? tracks.map((t: any) => ({
          name: t.name,
          artist: t.artist?.name || artist,
          duration: t.duration,
        }))
      : tracks
      ? [
          {
            name: tracks.name,
            artist: tracks.artist?.name || artist,
            duration: tracks.duration,
          },
        ]
      : [];

    return {
      name: albumData.name,
      artist: albumData.artist,
      tracks: trackList,
    };
  } catch (error) {
    console.error("Error getting Last.fm album info:", error);
    throw error;
  }
}

// Get session key using mobile authentication
async function getSessionKey(): Promise<string | null> {
  try {
    // Validate config
    if (!config.lastfm.apiKey || config.lastfm.apiKey === "") {
      throw new Error("Last.fm API key not configured");
    }
    if (!config.lastfm.apiSecret || config.lastfm.apiSecret === "") {
      throw new Error("Last.fm API secret not configured");
    }
    if (!config.lastfm.username || config.lastfm.username === "") {
      throw new Error("Last.fm username not configured");
    }
    if (!config.lastfm.password || config.lastfm.password === "") {
      throw new Error("Last.fm password not configured");
    }

    const apiSig = crypto
      .createHash("md5")
      .update(
        `api_key${config.lastfm.apiKey}methodauth.getMobileSessionpassword${config.lastfm.password}username${config.lastfm.username}${config.lastfm.apiSecret}`
      )
      .digest("hex");

    const response = await axios.post(
      "https://ws.audioscrobbler.com/2.0/",
      null,
      {
        params: {
          method: "auth.getMobileSession",
          username: config.lastfm.username,
          password: config.lastfm.password,
          api_key: config.lastfm.apiKey,
          api_sig: apiSig,
          format: "json",
        },
      }
    );

    if (response.data?.error) {
      console.error(
        "Last.fm API error:",
        response.data.error,
        response.data.message
      );
      throw new Error(
        `Last.fm authentication failed: ${
          response.data.message || response.data.error
        }`
      );
    }

    const sessionKey = response.data?.session?.key;
    if (!sessionKey) {
      throw new Error("No session key returned from Last.fm");
    }

    return sessionKey;
  } catch (error: any) {
    console.error("Error getting Last.fm session:", error);
    if (error.response?.data) {
      console.error("Last.fm API response:", error.response.data);
    }
    throw error; // Re-throw to get better error messages
  }
}

export async function scrobbleTrack(track: LastFmTrack): Promise<boolean> {
  try {
    const sessionKey = await getSessionKey();
    if (!sessionKey) {
      throw new Error("Failed to authenticate with Last.fm");
    }

    const timestamp = track.timestamp || Math.floor(Date.now() / 1000);
    const method = "track.scrobble";

    // Build parameters for signature
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

    // Create API signature
    const sigString =
      Object.keys(params)
        .sort()
        .map((key) => `${key}${params[key]}`)
        .join("") + config.lastfm.apiSecret;

    const apiSig = crypto.createHash("md5").update(sigString).digest("hex");

    // Scrobble the track
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

    // Check for API errors
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

    // Check if scrobble was accepted
    // Last.fm response structure: { scrobbles: { "@attr": { accepted, ignored }, scrobble: [...] } }
    const scrobbles = response.data?.scrobbles;
    const attrs = scrobbles?.["@attr"] || {};
    const accepted = attrs.accepted;
    const ignored = attrs.ignored || "0";
    const scrobbleArray = scrobbles?.scrobble;

    // Log full response for debugging
    console.log(
      "Last.fm scrobble response:",
      JSON.stringify(response.data, null, 2)
    );

    // Check if scrobble was accepted
    if (accepted === "1" || accepted === 1) {
      console.log("Scrobble accepted by Last.fm");
      return true;
    }

    // Check if scrobble was ignored
    if (ignored !== "0" && ignored !== 0) {
      // Get ignore reason from scrobble array if available
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

      // Check if it's a duplicate (common reason for ignoring)
      const ignoreStr = ignoreReason.toString().toLowerCase();
      if (
        ignoreStr.includes("duplicate") ||
        ignoreStr.includes("recent") ||
        ignoreStr.includes("recently")
      ) {
        // Duplicate/recent scrobbles are usually fine - return true
        console.log("Scrobble was duplicate/recent - treating as success");
        return true;
      }

      // Other ignore reasons might be problematic
      throw new Error(
        `Scrobble ignored by Last.fm: ${ignoreReason}. ` +
          `This might mean the track doesn't exist or there's a naming mismatch.`
      );
    }

    // Scrobble was not accepted - get more details
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
    throw error; // Re-throw to get better error messages
  }
}

// Scrobble multiple tracks from selected sides
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

  // Scrobble tracks sequentially with small delay to avoid rate limiting
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

    // Small delay between scrobbles (except for the last one)
    if (i < tracks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { success, failed, errors };
}

export async function scrobbleAlbum(
  artist: string,
  album: string,
  timestamp?: number,
  discogsRelease?: any,
  selectedSides?: string[]
): Promise<boolean> {
  const scrobbleTimestamp = timestamp || Math.floor(Date.now() / 1000);

  console.log("scrobbleAlbum called with:", {
    artist,
    album,
    timestamp: scrobbleTimestamp,
    hasDiscogsRelease: !!discogsRelease,
    hasTracklist: !!discogsRelease?.tracklist,
    tracklistLength: discogsRelease?.tracklist?.length || 0,
    selectedSides,
    selectedSidesLength: selectedSides?.length || 0,
  });

  // If we have selected sides and a Discogs release with tracklist, scrobble those tracks
  if (
    selectedSides &&
    selectedSides.length > 0 &&
    discogsRelease?.tracklist &&
    discogsRelease.tracklist.length > 0
  ) {
    console.log("Using Discogs tracklist with selected sides");
    // Parse tracklist to get tracks from selected sides
    const { parseTracklistSides } = await import("./discogs");
    const sides = parseTracklistSides(discogsRelease.tracklist);

    // Filter to selected sides
    const selectedSidesData = sides.filter((s) =>
      selectedSides.includes(s.side)
    );

    if (selectedSidesData.length > 0) {
      // Get Last.fm album info to match track names
      const lastFmAlbum = await searchLastFmAlbum(artist, album);
      const lastFmTracks = lastFmAlbum?.tracks || [];

      // Build track list to scrobble
      const tracksToScrobble: Array<{
        artist: string;
        track: string;
        album: string;
        timestamp: number;
      }> = [];

      let currentTimestamp = scrobbleTimestamp;

      for (const side of selectedSidesData) {
        for (const discogsTrack of side.tracks) {
          // Try to find matching track in Last.fm tracklist
          let trackName = discogsTrack.title;
          let trackArtist = artist;

          if (lastFmTracks.length > 0) {
            // Try to match by position or title
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

          // Increment timestamp by estimated duration (default 3 minutes if not available)
          const duration = discogsTrack.duration
            ? parseDuration(discogsTrack.duration)
            : 180;
          currentTimestamp += duration;
        }
      }

      if (tracksToScrobble.length > 0) {
        console.log(
          `Scrobbling ${tracksToScrobble.length} tracks from selected sides`
        );
        const result = await scrobbleTracks(tracksToScrobble);
        if (result.success > 0) {
          console.log(
            `Successfully scrobbled ${result.success} tracks, ${result.failed} failed`
          );
          if (result.errors.length > 0) {
            console.warn("Scrobble errors:", result.errors);
          }
          return result.failed === 0; // Return true only if all succeeded
        }
      }
    }
  }

  // Fallback: If no Discogs tracklist but we have selected sides, try to use Last.fm tracklist
  // Or if no selected sides but we want to scrobble the whole album
  const lastFmAlbum = await searchLastFmAlbum(artist, album);

  if (lastFmAlbum && lastFmAlbum.tracks && lastFmAlbum.tracks.length > 0) {
    // If we have selected sides but no Discogs tracklist, filter Last.fm tracks by side
    // Otherwise, scrobble all tracks from Last.fm
    let tracksToScrobble: Array<{
      artist: string;
      track: string;
      album: string;
      timestamp: number;
    }> = [];

    let currentTimestamp = scrobbleTimestamp;

    // If we have selected sides, try to match them (this is a best-effort approach)
    // Otherwise, scrobble all tracks
    const tracksToUse = lastFmAlbum.tracks;

    for (const lfmTrack of tracksToUse) {
      tracksToScrobble.push({
        artist: lfmTrack.artist || lastFmAlbum.artist,
        track: lfmTrack.name,
        album: lastFmAlbum.name,
        timestamp: currentTimestamp,
      });

      // Increment timestamp by estimated duration (default 3 minutes)
      let duration = 180; // Default 3 minutes
      if (lfmTrack.duration) {
        if (typeof lfmTrack.duration === "number") {
          duration = lfmTrack.duration;
        } else if (typeof lfmTrack.duration === "string") {
          // Last.fm duration is in seconds as a string
          duration = parseInt(lfmTrack.duration) || 180;
        }
      }
      currentTimestamp += duration;
    }

    if (tracksToScrobble.length > 0) {
      console.log(
        `Using Last.fm tracklist: scrobbling ${tracksToScrobble.length} tracks from "${lastFmAlbum.name}"`
      );
      const result = await scrobbleTracks(tracksToScrobble);
      if (result.success > 0) {
        console.log(
          `Successfully scrobbled ${result.success} tracks, ${result.failed} failed`
        );
        if (result.errors.length > 0) {
          console.warn("Scrobble errors:", result.errors);
        }
        return result.failed === 0;
      }
    }
  }

  // Fallback: Try to verify track exists before scrobbling
  const verifiedTrack = await searchLastFmTrack(artist, album);

  if (verifiedTrack) {
    // Use verified track name from Last.fm
    console.log(
      `Using verified Last.fm track: "${verifiedTrack.name}" by "${verifiedTrack.artist}"`
    );
    return await scrobbleTrack({
      artist: verifiedTrack.artist,
      track: verifiedTrack.name,
      album: album, // Keep original album name
      timestamp: scrobbleTimestamp,
    });
  }

  // Last resort: Try scrobbling album title as track (original behavior)
  // But warn that it might fail
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

// Helper to parse duration string (mm:ss or hh:mm:ss) to seconds
function parseDuration(duration: string): number {
  const parts = duration.split(":").map(Number);
  if (parts.length === 2) {
    // mm:ss
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // hh:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 180; // Default 3 minutes
}

// Note: For album scrobbling, Last.fm expects individual tracks
// This is a simplified implementation that scrobbles the album as a single track
// For a more complete solution, you'd fetch the tracklist from Discogs or Last.fm
// and scrobble each track individually
