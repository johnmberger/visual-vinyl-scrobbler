import axios from "axios";
import { config } from "./config";

export interface DiscogsTrack {
  position: string;
  type: string;
  title: string;
  duration?: string;
  artists?: Array<{
    name: string;
  }>;
  extraartists?: Array<{
    name: string;
    role: string;
  }>;
}

export interface DiscogsRelease {
  id: number;
  basic_information?: {
    id: number;
    master_id: number;
    master_url: string;
    title: string;
    year: number;
    formats: Array<{
      name: string;
      qty: string;
      descriptions?: string[];
    }>;
    labels: Array<{
      name: string;
      catno: string;
    }>;
    artists: Array<{
      name: string;
    }>;
    thumb: string;
    cover_image: string;
  };
  // Full release format (from /releases/{id})
  title?: string;
  year?: number;
  formats?: Array<{
    name: string;
    qty: string;
    descriptions?: string[];
  }>;
  labels?: Array<{
    name: string;
    catno: string;
  }>;
  artists?: Array<{
    name: string;
  }>;
  thumb?: string;
  cover_image?: string;
  tracklist?: DiscogsTrack[];
}

export interface DiscogsCollectionResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
  releases: DiscogsRelease[];
}

export async function getDiscogsCollection(
  page: number = 1,
  perPage: number = 100
): Promise<DiscogsCollectionResponse> {
  const response = await axios.get<DiscogsCollectionResponse>(
    `https://api.discogs.com/users/${config.discogs.username}/collection/folders/0/releases`,
    {
      params: {
        page,
        per_page: perPage,
        sort: "artist",
        sort_order: "asc",
      },
      headers: {
        Authorization: `Discogs token=${config.discogs.userToken}`,
        "User-Agent": "DiscogsScrobbler/1.0",
      },
    }
  );
  return response.data;
}

export async function getAllDiscogsAlbums(): Promise<DiscogsRelease[]> {
  // Validate configuration
  if (
    !config.discogs.userToken ||
    config.discogs.userToken === "YOUR_DISCOGS_USER_TOKEN"
  ) {
    throw new Error(
      "Discogs user token not configured. Please set DISCOGS_USER_TOKEN in .env.local"
    );
  }

  if (
    !config.discogs.username ||
    config.discogs.username === "YOUR_DISCOGS_USERNAME"
  ) {
    throw new Error(
      "Discogs username not configured. Please set DISCOGS_USERNAME in .env.local"
    );
  }

  const allAlbums: DiscogsRelease[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await getDiscogsCollection(page, 100);
    allAlbums.push(...response.releases);
    hasMore = page < response.pagination.pages;
    page++;
  }

  return allAlbums;
}

export async function searchDiscogsAlbum(
  artist: string,
  album: string
): Promise<DiscogsRelease | null> {
  try {
    const response = await axios.get(
      "https://api.discogs.com/database/search",
      {
        params: {
          q: `${artist} ${album}`,
          type: "release",
        },
        headers: {
          Authorization: `Discogs token=${config.discogs.userToken}`,
          "User-Agent": "DiscogsScrobbler/1.0",
        },
      }
    );

    const results = response.data.results || [];
    if (results.length > 0) {
      // Try to find exact match in user's collection
      const collection = await getAllDiscogsAlbums();
      const match = collection.find(
        (item) =>
          item.basic_information.id === results[0].id ||
          item.basic_information.master_id === results[0].master_id
      );
      return match || null;
    }
    return null;
  } catch (error) {
    console.error("Error searching Discogs:", error);
    return null;
  }
}

// Get full release details including tracklist
export async function getDiscogsRelease(
  releaseId: number
): Promise<DiscogsRelease | null> {
  try {
    const response = await axios.get(
      `https://api.discogs.com/releases/${releaseId}`,
      {
        headers: {
          Authorization: `Discogs token=${config.discogs.userToken}`,
          "User-Agent": "DiscogsScrobbler/1.0",
        },
      }
    );

    return response.data as DiscogsRelease;
  } catch (error) {
    console.error("Error fetching Discogs release:", error);
    return null;
  }
}

// Parse tracklist to group tracks by side/disc
export interface TrackSide {
  side: string; // e.g., "A", "B", "1", "CD1"
  tracks: DiscogsTrack[];
  label: string; // Display label like "Side A", "Disc 1"
}

export function parseTracklistSides(tracklist: DiscogsTrack[]): TrackSide[] {
  if (!tracklist || tracklist.length === 0) {
    return [];
  }

  // Handle case where tracklist might be an object with a tracklist property
  let tracks: DiscogsTrack[] = tracklist;
  if (Array.isArray(tracklist) === false) {
    // Sometimes Discogs returns { tracklist: [...] } structure
    if (
      tracklist &&
      typeof tracklist === "object" &&
      "tracklist" in tracklist
    ) {
      tracks = (tracklist as any).tracklist || [];
    } else {
      return [];
    }
  }

  const sidesMap = new Map<string, DiscogsTrack[]>();

  for (const track of tracks) {
    if (!track) continue;

    // Skip non-track items (headings, index tracks, etc.)
    if (track.type && track.type !== "track") {
      continue;
    }

    // Parse position to extract side/disc identifier
    // Positions can be: "A1", "B2", "1", "CD1-1", "DVD1-1", etc.
    const position = track.position || "";
    let sideKey = "";

    if (!position) {
      // If no position, assign to default side
      sideKey = "1";
    } else {
      // Check for side letters (A, B, C, etc.) - common for vinyl
      const sideMatch = position.match(/^([A-Z]+)/);
      if (sideMatch) {
        sideKey = sideMatch[1];
      } else {
        // Check for disc identifiers (CD1, DVD1, etc.)
        const discMatch = position.match(/^([A-Z0-9]+)-/);
        if (discMatch) {
          sideKey = discMatch[1];
        } else {
          // Numeric only - treat as single disc/side
          sideKey = "1";
        }
      }
    }

    if (!sidesMap.has(sideKey)) {
      sidesMap.set(sideKey, []);
    }
    sidesMap.get(sideKey)!.push(track);
  }

  // Convert to array and sort
  const sides: TrackSide[] = Array.from(sidesMap.entries()).map(
    ([side, tracks]) => {
      // Create display label
      let label = side;
      if (side.match(/^[A-Z]+$/)) {
        // Side letter (A, B, C, etc.)
        label = `Side ${side}`;
      } else if (side.match(/^CD\d+$/i)) {
        // CD format
        label = side.toUpperCase();
      } else if (side.match(/^DVD\d+$/i)) {
        // DVD format
        label = side.toUpperCase();
      } else if (side === "1" && sidesMap.size === 1) {
        // Single disc/side - no label needed
        label = "All Tracks";
      } else {
        label = `Disc ${side}`;
      }

      return {
        side,
        tracks,
        label,
      };
    }
  );

  // Sort sides: A, B, C... then 1, 2, 3... then CD1, CD2...
  sides.sort((a, b) => {
    // Letter sides first (A, B, C...)
    const aIsLetter = /^[A-Z]+$/.test(a.side);
    const bIsLetter = /^[A-Z]+$/.test(b.side);
    if (aIsLetter && !bIsLetter) return -1;
    if (!aIsLetter && bIsLetter) return 1;
    if (aIsLetter && bIsLetter) {
      return a.side.localeCompare(b.side);
    }

    // Then numeric
    const aNum = parseInt(a.side);
    const bNum = parseInt(b.side);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }

    // Then alphanumeric (CD1, DVD1, etc.)
    return a.side.localeCompare(b.side);
  });

  return sides;
}
