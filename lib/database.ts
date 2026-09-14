import fs from "fs";
import path from "path";
import { DiscogsRelease } from "./discogs";
import { rankFuzzyMatches, normalizeName } from "./fuzzy";
import {
  embedImageFromUrl,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from "./embeddings";

export interface AlbumCover {
  discogsId: number;
  masterId: number | null;
  artist: string;
  album: string;
  year: number | null;
  coverImageUrl: string;
  thumbUrl: string;
  localImagePath?: string;
  labels: string[];
  formats: string[];
  lastUpdated: string;
  /** Visual embedding from gemini-embedding-2 (768-d) */
  embedding?: number[];
  embeddingModel?: string;
  embeddingSource?: "lastfm" | "discogs";
  // Legacy perceptual hash fields (ignored; old DB files may still contain them)
  imageHash?: string;
  thumbHash?: string;
  imageHashSource?: "lastfm" | "discogs";
}

export interface CoverDatabase {
  albums: AlbumCover[];
  lastBuilt: string;
  totalAlbums: number;
  embeddingModel?: string;
  embeddingDimensions?: number;
}

const DATABASE_DIR = path.join(process.cwd(), "data");
const DATABASE_FILE = path.join(DATABASE_DIR, "covers-database.json");

export function ensureDataDirectory(): void {
  if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, { recursive: true });
  }
}

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

export function saveDatabase(database: CoverDatabase): void {
  ensureDataDirectory();

  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(database, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving database:", error);
    throw error;
  }
}

export function discogsReleaseToAlbumCover(
  release: DiscogsRelease
): AlbumCover {
  if (!release.basic_information) {
    throw new Error("Release missing basic_information");
  }

  const basicInfo = release.basic_information;
  return {
    discogsId: basicInfo.id,
    masterId: basicInfo.master_id || null,
    artist: basicInfo.artists[0]?.name || "Unknown",
    album: basicInfo.title || "",
    year: basicInfo.year || null,
    coverImageUrl: basicInfo.cover_image || "",
    thumbUrl: basicInfo.thumb || "",
    labels: (basicInfo.labels || []).map((label) => label.name),
    formats: (basicInfo.formats || []).map((format) => format.name),
    lastUpdated: new Date().toISOString(),
  };
}

/** Minimal album fields needed to build a Discogs-shaped release for the UI/API. */
export type AlbumCoverLike = {
  discogsId: number;
  masterId?: number | null;
  artist: string;
  album: string;
  year?: number | null;
  coverImageUrl?: string;
  thumbUrl?: string;
  labels?: string[];
  formats?: string[];
};

/**
 * Inverse of discogsReleaseToAlbumCover for client/API responses that expect
 * a DiscogsRelease-like shape (scrobble confirmation, match routes).
 */
export function albumCoverToDiscogsRelease(album: AlbumCoverLike) {
  return {
    id: album.discogsId,
    basic_information: {
      id: album.discogsId,
      master_id: album.masterId || 0,
      title: album.album,
      artists: [{ name: album.artist }],
      cover_image: album.coverImageUrl,
      thumb: album.thumbUrl,
      year: album.year || 0,
      labels: (album.labels || []).map((name) => ({ name, catno: "" })),
      formats: (album.formats || []).map((name) => ({ name, qty: "1" })),
    },
  };
}

export type BuildProgress = {
  phase: "embedding";
  current: number;
  total: number;
  album?: string;
};

/**
 * Build database from Discogs collection.
 * When generateEmbeddings is true, embeds cover art via Gemini Embedding 2
 * (prefers Last.fm cover URLs when available).
 */
export async function buildDatabase(
  releases: DiscogsRelease[],
  generateEmbeddings: boolean = true,
  onProgress?: (opts: BuildProgress) => void
): Promise<CoverDatabase> {
  const albums: AlbumCover[] = releases.map(discogsReleaseToAlbumCover);

  if (generateEmbeddings) {
    const { config } = await import("./config");
    if (!config.gemini.apiKey) {
      throw new Error(
        "GEMINI_API_KEY is required to generate visual embeddings. Add it to .env.local or rebuild with generateEmbeddings: false."
      );
    }

    const { getLastFmAlbumCoverUrl } = await import("./lastfm");

    onProgress?.({ phase: "embedding", total: albums.length, current: 0 });

    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];

      // Gentle rate limiting for Last.fm + Gemini
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      if (i > 0 && i % 20 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      try {
        let imageUrl: string | null = null;
        let usedLastFm = false;

        const lastFmUrl = await getLastFmAlbumCoverUrl(
          album.artist,
          album.album
        );
        if (lastFmUrl) {
          imageUrl = lastFmUrl;
          usedLastFm = true;
        } else if (album.coverImageUrl) {
          imageUrl = album.coverImageUrl;
        } else if (album.thumbUrl) {
          imageUrl = album.thumbUrl;
        }

        if (imageUrl) {
          try {
            album.embedding = await embedImageFromUrl(imageUrl);
            album.embeddingModel = EMBEDDING_MODEL;
            album.embeddingSource = usedLastFm ? "lastfm" : "discogs";
          } catch (error: any) {
            if (usedLastFm && (album.coverImageUrl || album.thumbUrl)) {
              const fallback = album.coverImageUrl || album.thumbUrl;
              try {
                album.embedding = await embedImageFromUrl(fallback);
                album.embeddingModel = EMBEDDING_MODEL;
                album.embeddingSource = "discogs";
              } catch (fallbackError: any) {
                console.warn(
                  `Failed to embed ${album.artist} - ${album.album}:`,
                  fallbackError.message || fallbackError
                );
              }
            } else {
              console.warn(
                `Failed to embed ${album.artist} - ${album.album}:`,
                error.message || error
              );
            }
          }
        }
      } catch (error) {
        console.error(
          `Error processing album ${album.artist} - ${album.album}:`,
          error
        );
      }

      onProgress?.({
        phase: "embedding",
        total: albums.length,
        current: i + 1,
        album: `${album.artist} - ${album.album}`,
      });

      if ((i + 1) % 10 === 0) {
        saveDatabase({
          albums,
          lastBuilt: new Date().toISOString(),
          totalAlbums: albums.length,
          embeddingModel: EMBEDDING_MODEL,
          embeddingDimensions: EMBEDDING_DIMENSIONS,
        });
      }
    }
  }

  const database: CoverDatabase = {
    albums,
    lastBuilt: new Date().toISOString(),
    totalAlbums: albums.length,
    embeddingModel: generateEmbeddings ? EMBEDDING_MODEL : undefined,
    embeddingDimensions: generateEmbeddings ? EMBEDDING_DIMENSIONS : undefined,
  };

  saveDatabase(database);
  return database;
}

/**
 * Search database by artist and album (exact/contains, then fuzzy ranking).
 */
export function searchDatabase(artist?: string, album?: string): AlbumCover[] {
  const database = loadDatabase();

  if (!artist && !album) {
    return database.albums;
  }

  if (artist && album) {
    const fuzzy = rankFuzzyMatches(
      database.albums,
      artist,
      album,
      (a) => a.artist,
      (a) => a.album,
      { minScore: 0.55, limit: 10 }
    );
    if (fuzzy.length > 0) {
      return fuzzy.map((m) => m.item);
    }
  }

  const normalizedArtist = artist ? normalizeName(artist) : null;
  const normalizedAlbum = album ? normalizeName(album) : null;

  return database.albums.filter((item) => {
    const normalizedItemArtist = normalizeName(item.artist);
    const normalizedItemAlbum = normalizeName(item.album);

    let artistMatch =
      !normalizedArtist || normalizedItemArtist === normalizedArtist;
    let albumMatch =
      !normalizedAlbum || normalizedItemAlbum === normalizedAlbum;

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

export function getAlbumById(discogsId: number): AlbumCover | null {
  const database = loadDatabase();
  return database.albums.find((album) => album.discogsId === discogsId) || null;
}

export function getAllAlbums(): AlbumCover[] {
  const database = loadDatabase();
  return database.albums;
}

export function getDatabaseStats() {
  const database = loadDatabase();
  const withEmbeddings = database.albums.filter(
    (a) => a.embedding && a.embedding.length > 0
  ).length;
  return {
    totalAlbums: database.totalAlbums,
    lastBuilt: database.lastBuilt,
    albumsWithCovers: database.albums.filter(
      (album) => album.coverImageUrl || album.thumbUrl
    ).length,
    albumsWithEmbeddings: withEmbeddings,
    embeddingModel: database.embeddingModel || null,
  };
}

/** Compact collection refs for Gemini prompts (no embeddings). */
export function getCollectionRefs(): Array<{
  discogsId: number;
  artist: string;
  album: string;
}> {
  return getAllAlbums().map((a) => ({
    discogsId: a.discogsId,
    artist: a.artist,
    album: a.album,
  }));
}
