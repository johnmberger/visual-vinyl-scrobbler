import axios from "axios";
import imghash from "imghash";
// @ts-ignore - hamming-distance doesn't have types
import hammingDistance from "hamming-distance";
import sharp from "sharp";
import { AlbumCover } from "./database";

export interface ImageMatch {
  album: AlbumCover;
  distance: number; // Hamming distance (lower = more similar)
  similarity: number; // Similarity score 0-1 (1 = identical)
}

/**
 * Generate a perceptual hash from an image buffer
 */
export async function generateImageHash(
  imageBuffer: Buffer,
  bits: number = 8
): Promise<string> {
  try {
    // Resize and normalize the image for consistent hashing
    const processed = await sharp(imageBuffer)
      .resize(8 * bits, 8 * bits, {
        fit: "cover",
      })
      .greyscale()
      .toBuffer();

    const hash = await imghash.hash(processed, bits);
    return hash;
  } catch (error) {
    console.error("Error generating image hash:", error);
    throw error;
  }
}

/**
 * Generate a hash from a base64 image string
 */
export async function generateHashFromBase64(
  base64Image: string,
  bits: number = 8
): Promise<string> {
  // Remove data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");
  return generateImageHash(imageBuffer, bits);
}

/**
 * Generate a hash from a URL (downloads the image first)
 * Includes retry logic and proper headers to avoid 403 errors
 */
export async function generateHashFromUrl(
  imageUrl: string,
  bits: number = 8,
  retries: number = 2
): Promise<string> {
  // Skip if URL is empty
  if (!imageUrl || imageUrl.trim() === "") {
    throw new Error("Empty image URL");
  }

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add delay between retries to avoid rate limiting
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }

      // Use proper headers to avoid 403 errors from Discogs
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000, // 15 second timeout
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.discogs.com/",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "cross-site",
        },
        // Follow redirects
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const imageBuffer = Buffer.from(response.data);
      return generateImageHash(imageBuffer, bits);
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (error.response?.status === 404) {
        throw new Error(`Image not found (404)`);
      }

      // If it's a 403 and we have retries left, try again
      if (error.response?.status === 403 && attempt < retries) {
        console.warn(
          `403 error on attempt ${
            attempt + 1
          }, retrying... (${imageUrl.substring(0, 50)}...)`
        );
        continue;
      }

      // Handle specific error cases
      if (error.response?.status === 403) {
        throw new Error(
          `Access denied (403) for image URL. Discogs may be blocking requests.`
        );
      } else if (error.code === "ECONNABORTED") {
        throw new Error(`Request timeout`);
      }

      // If last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
    }
  }

  // Should never reach here, but just in case
  throw lastError || new Error("Failed to download image after retries");
}

/**
 * Calculate Hamming distance between two hashes
 */
export function calculateHammingDistance(hash1: string, hash2: string): number {
  try {
    // Convert hex strings to buffers for comparison
    const buf1 = Buffer.from(hash1, "hex");
    const buf2 = Buffer.from(hash2, "hex");
    return hammingDistance(buf1, buf2);
  } catch (error) {
    console.error("Error calculating Hamming distance:", error);
    return Infinity; // Return max distance on error
  }
}

/**
 * Calculate similarity score (0-1) from Hamming distance
 * For an 8-bit hash (64 bits), max distance is 64
 */
export function calculateSimilarity(
  distance: number,
  maxBits: number = 64
): number {
  return Math.max(0, 1 - distance / maxBits);
}

/**
 * Find matching albums by comparing image hash with database
 * Returns matches sorted by similarity (best match first)
 */
export async function findMatchingAlbums(
  capturedImageHash: string,
  databaseAlbums: AlbumCover[],
  threshold: number = 18 // Maximum Hamming distance to consider a match (increased for more forgiveness)
): Promise<ImageMatch[]> {
  const matches: ImageMatch[] = [];

  for (const album of databaseAlbums) {
    // Try both cover image hash and thumbnail hash, use the best match
    let bestDistance = Infinity;
    
    if (album.imageHash) {
      const distance = calculateHammingDistance(capturedImageHash, album.imageHash);
      if (distance < bestDistance) {
        bestDistance = distance;
      }
    }
    
    if (album.thumbHash) {
      const distance = calculateHammingDistance(capturedImageHash, album.thumbHash);
      if (distance < bestDistance) {
        bestDistance = distance;
      }
    }

    // If we found a hash and it's within threshold, add it
    if (bestDistance !== Infinity && bestDistance <= threshold) {
      matches.push({
        album,
        distance: bestDistance,
        similarity: calculateSimilarity(bestDistance),
      });
    }
  }

  // Sort by distance (lowest = best match)
  matches.sort((a, b) => a.distance - b.distance);

  return matches;
}

/**
 * Find the best matching album from a captured image
 */
export async function findBestMatch(
  capturedImageHash: string,
  databaseAlbums: AlbumCover[],
  threshold: number = 18 // Increased default threshold for more forgiveness
): Promise<ImageMatch | null> {
  const matches = await findMatchingAlbums(
    capturedImageHash,
    databaseAlbums,
    threshold
  );

  return matches.length > 0 ? matches[0] : null;
}
