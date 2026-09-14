import axios from "axios";
import { config } from "../config";
import { normalizeName } from "../fuzzy";
import type { LastFmAlbumInfo, LastFmTrackInfo } from "./types";

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

async function getLastFmAlbumInfo(
  artist: string,
  album: string
): Promise<LastFmAlbumInfo> {
  const response = await axios.get("https://ws.audioscrobbler.com/2.0/", {
    params: {
      method: "album.getInfo",
      artist,
      album,
      api_key: config.lastfm.apiKey,
      format: "json",
      autocorrect: 1,
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
}

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

    const normalizedAlbum = normalizeName(album);
    const normalizedArtist = normalizeName(artist);

    for (const result of Array.isArray(albums) ? albums : [albums]) {
      if (
        normalizeName(result.name) === normalizedAlbum &&
        normalizeName(result.artist) === normalizedArtist
      ) {
        try {
          return await getLastFmAlbumInfo(result.artist, result.name);
        } catch {
          return { name: result.name, artist: result.artist };
        }
      }
    }

    const first = Array.isArray(albums) ? albums[0] : albums;
    try {
      return await getLastFmAlbumInfo(first.artist, first.name);
    } catch {
      return { name: first.name, artist: first.artist };
    }
  } catch (error) {
    console.error("Error searching Last.fm for album:", error);
    return null;
  }
}

/**
 * Cover URL from Last.fm (often cleaner than Discogs physical photos).
 */
export async function getLastFmAlbumCoverUrl(
  artist: string,
  album: string
): Promise<string | null> {
  try {
    if (!config.lastfm.apiKey || config.lastfm.apiKey === "") {
      return null;
    }

    const response = await axios.get("https://ws.audioscrobbler.com/2.0/", {
      params: {
        method: "album.getInfo",
        artist,
        album,
        api_key: config.lastfm.apiKey,
        format: "json",
        autocorrect: 1,
      },
    });

    const images = response.data?.album?.image;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return null;
    }

    const sizeOrder = ["extralarge", "large", "medium", "small"];
    for (const size of sizeOrder) {
      const img = images.find((i: { size: string }) => i.size === size);
      if (img?.["#text"]) {
        return img["#text"];
      }
    }

    const last = images[images.length - 1];
    return last?.["#text"] || null;
  } catch {
    return null;
  }
}
