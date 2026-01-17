import { NextRequest, NextResponse } from "next/server";
import { generateHashFromBase64, findBestMatch } from "@/lib/imageMatching";
import { getAllAlbums } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Generate hash from captured image
    const capturedHash = await generateHashFromBase64(image);

    // Get all albums from database
    const databaseAlbums = getAllAlbums();

    // Filter to only albums with hashes
    const albumsWithHashes = databaseAlbums.filter(
      (album) => album.imageHash || album.thumbHash
    );

    if (albumsWithHashes.length === 0) {
      // Return 200 with a specific flag - this is expected, not an error
      // The client will fall through to OCR/Gemini
      return NextResponse.json(
        {
          success: false,
          error: "No albums with image hashes in database",
          message: "Please rebuild the database with hash generation enabled.",
          noHashes: true,
        },
        { status: 200 }
      );
    }

    // Find best match with moderate threshold (15 bits = ~77% similarity)
    // Using moderate matching - Gemini fallback is available for difficult cases
    let bestMatch = await findBestMatch(
      capturedHash,
      albumsWithHashes,
      15 // Threshold: max Hamming distance (moderate - allows more matches)
    );

    // Accept matches with moderate similarity (70%+)
    // Lower threshold since Gemini can catch false positives
    if (bestMatch && bestMatch.similarity < 0.7) {
      bestMatch = null;
    }

    // If still no match, get all matches sorted by distance to help debug
    if (!bestMatch) {
      const { findMatchingAlbums } = await import("@/lib/imageMatching");
      const allMatches = await findMatchingAlbums(
        capturedHash,
        albumsWithHashes,
        30 // Very wide threshold to see what's closest
      );

      // Return top 5 closest matches for debugging
      const topMatches = allMatches.slice(0, 5).map((m) => ({
        artist: m.album.artist,
        album: m.album.album,
        distance: m.distance,
        similarity: m.similarity,
      }));

      // Return 200 with no match - this is expected, client will fall through to Gemini
      return NextResponse.json(
        {
          success: false,
          error: "No matching album found in database",
          matches: [],
          debug: {
            closestMatches: topMatches,
            totalAlbumsWithHashes: albumsWithHashes.length,
            message:
              topMatches.length > 0
                ? `Closest match was "${topMatches[0].album}" by "${topMatches[0].artist}" with ${topMatches[0].distance} bits difference (${Math.round(topMatches[0].similarity * 100)}% similarity). This is below the threshold of 15 bits (70% similarity minimum).`
                : "No albums found within 30 bits difference. The captured image may be very different from database images.",
          },
        },
        { status: 200 }
      );
    }

    // Return match with similarity info
    return NextResponse.json({
      success: true,
      match: {
        album: bestMatch.album,
        distance: bestMatch.distance,
        similarity: bestMatch.similarity,
        confidence:
          bestMatch.similarity > 0.85
            ? "high"
            : bestMatch.similarity > 0.75
            ? "medium"
            : "low",
      },
      debug: {
        thresholdUsed: "moderate (15 bits, min 70% similarity)",
        distance: bestMatch.distance,
        similarityPercent: Math.round(bestMatch.similarity * 100),
      },
    });
  } catch (error) {
    console.error("Error matching image:", error);
    return NextResponse.json(
      {
        error: "Failed to match image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
