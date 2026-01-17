import fs from "fs";
import path from "path";
import { DiscogsRelease } from "./discogs";
// Only import imageMatching when actually needed (lazy import)
// This prevents WASM files from being loaded on every import

export interface AlbumCover {
  discogsId: number;
  masterId: number | null;
  artist: string;
  album: string;
  year: number | null;
  coverImageUrl: string;
  thumbUrl: string;
  localImagePath?: string; // If we download images locally
  labels: string[];
  formats: string[];
  lastUpdated: string;
  // Perceptual hash for image matching
  imageHash?: string; // Hex string of the perceptual hash
  thumbHash?: string; // Hash of thumbnail for faster matching
}

export interface CoverDatabase {
  albums: AlbumCover[];
  lastBuilt: string;
  totalAlbums: number;
}

const DATABASE_DIR = path.join(process.cwd(), "data");
const DATABASE_FILE = path.join(DATABASE_DIR, "covers-database.json");

// Ensure data directory exists
export function ensureDataDirectory(): void {
  if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, { recursive: true });
  }
}

// Load the database from disk
export function loadDatabase(): CoverDatabase {
  ensureDataDirectory();

  if (!fs.existsSync(DATABASE_FILE)) {
    return {
      albums: [],
      lastBuilt: new Date().toISOString(),
      totalAlbums: 0,
    };
  }

  try {
    const data = fs.readFileSync(DATABASE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading database:", error);
    return {
      albums: [],
      lastBuilt: new Date().toISOString(),
      totalAlbums: 0,
    };
  }
}

// Save the database to disk
export function saveDatabase(database: CoverDatabase): void {
  ensureDataDirectory();

  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(database, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving database:", error);
    throw error;
  }
}

// Convert Discogs release to AlbumCover
export function discogsReleaseToAlbumCover(
  release: DiscogsRelease
): AlbumCover {
  return {
    discogsId: release.basic_information.id,
    masterId: release.basic_information.master_id || null,
    artist: release.basic_information.artists[0]?.name || "Unknown",
    album: release.basic_information.title,
    year: release.basic_information.year || null,
    coverImageUrl: release.basic_information.cover_image || "",
    thumbUrl: release.basic_information.thumb || "",
    labels: release.basic_information.labels.map((label) => label.name),
    formats: release.basic_information.formats.map((format) => format.name),
    lastUpdated: new Date().toISOString(),
    // Hashes will be generated during build process
    imageHash: undefined,
    thumbHash: undefined,
  };
}

// Build database from Discogs collection
// Optionally generate image hashes for matching
export async function buildDatabase(
  releases: DiscogsRelease[],
  generateHashes: boolean = false
): Promise<CoverDatabase> {
  const albums: AlbumCover[] = releases.map(discogsReleaseToAlbumCover);

  // Optionally generate hashes for image matching
  if (generateHashes) {
    // Lazy import to avoid loading WASM files unless actually needed
    const { generateHashFromUrl } = await import("./imageMatching");

    // Generating image hashes for matching
    // Note: Some images may fail due to Discogs rate limiting (403 errors)
    // This is normal - the database will still be built with available hashes

    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];

      // Add a small delay between requests to avoid rate limiting
      if (i > 0 && i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second pause every 10 albums
      }

      try {
        // Generate hash from cover image if available
        if (album.coverImageUrl) {
          try {
            album.imageHash = await generateHashFromUrl(album.coverImageUrl);
          } catch (error: any) {
            console.warn(
              `Failed to hash cover image for ${album.artist} - ${album.album}:`,
              error.message || error
            );
            // Try thumbnail as fallback if cover fails
            if (album.thumbUrl) {
              try {
                album.thumbHash = await generateHashFromUrl(album.thumbUrl);
              } catch (thumbError: any) {
                console.warn(
                  `Thumbnail hash also failed:`,
                  thumbError.message || thumbError
                );
              }
            }
          }
        } else if (album.thumbUrl) {
          // Only use thumbnail if no cover image
          try {
            album.thumbHash = await generateHashFromUrl(album.thumbUrl);
          } catch (error: any) {
            console.warn(
              `Failed to hash thumbnail for ${album.artist} - ${album.album}:`,
              error.message || error
            );
          }
        }
      } catch (error) {
        console.error(
          `Error processing album ${album.artist} - ${album.album}:`,
          error
        );
      }

      // Save progress every 10 albums
      if ((i + 1) % 10 === 0) {
        const tempDatabase: CoverDatabase = {
          albums,
          lastBuilt: new Date().toISOString(),
          totalAlbums: albums.length,
        };
        saveDatabase(tempDatabase);
      }
    }
  }

  const database: CoverDatabase = {
    albums,
    lastBuilt: new Date().toISOString(),
    totalAlbums: albums.length,
  };

  saveDatabase(database);
  return database;
}

// Search database by artist and album name
// Normalize names for better matching (remove articles, special chars, etc.)
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^the\s+/i, "") // Remove leading "The"
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/[^\w\s-]/g, "") // Remove special chars except hyphens and spaces
    .trim();
}

export function searchDatabase(artist?: string, album?: string): AlbumCover[] {
  const database = loadDatabase();

  if (!artist && !album) {
    return database.albums;
  }

  const normalizedArtist = artist ? normalizeName(artist) : null;
  const normalizedAlbum = album ? normalizeName(album) : null;

  return database.albums.filter((item) => {
    const normalizedItemArtist = normalizeName(item.artist);
    const normalizedItemAlbum = normalizeName(item.album);

    // Try exact match first
    let artistMatch = !normalizedArtist || normalizedItemArtist === normalizedArtist;
    let albumMatch = !normalizedAlbum || normalizedItemAlbum === normalizedAlbum;

    // If exact match fails, try contains match
    if (!artistMatch && normalizedArtist) {
      artistMatch =
        normalizedItemArtist.includes(normalizedArtist) ||
        normalizedArtist.includes(normalizedItemArtist);
    }
    if (!albumMatch && normalizedAlbum) {
      albumMatch =
        normalizedItemAlbum.includes(normalizedAlbum) ||
        normalizedAlbum.includes(normalizedItemAlbum);
    }

    return artistMatch && albumMatch;
  });
}

// Get album by Discogs ID
export function getAlbumById(discogsId: number): AlbumCover | null {
  const database = loadDatabase();
  return database.albums.find((album) => album.discogsId === discogsId) || null;
}

// Get all albums
export function getAllAlbums(): AlbumCover[] {
  const database = loadDatabase();
  return database.albums;
}

// Get database stats
export function getDatabaseStats() {
  const database = loadDatabase();
  return {
    totalAlbums: database.totalAlbums,
    lastBuilt: database.lastBuilt,
    albumsWithCovers: database.albums.filter(
      (album) => album.coverImageUrl || album.thumbUrl
    ).length,
  };
}
