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
      return NextResponse.json(
        {
          error:
            "No albums with image hashes in database. Please rebuild the database with hash generation enabled.",
        },
        { status: 404 }
      );
    }

    // Find best match with more forgiving threshold (18 bits = ~72% similarity minimum)
    // First, try with the standard threshold
    let bestMatch = await findBestMatch(
      capturedHash,
      albumsWithHashes,
      18 // Threshold: max Hamming distance (increased from 15 for more forgiveness)
    );

    // If no match found, try with an even more forgiving threshold (22 bits = ~66% similarity)
    if (!bestMatch) {
      bestMatch = await findBestMatch(
        capturedHash,
        albumsWithHashes,
        22 // Very forgiving threshold for difficult cases
      );
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

      return NextResponse.json(
        {
          error: "No matching album found in database",
          matches: [],
          debug: {
            closestMatches: topMatches,
            totalAlbumsWithHashes: albumsWithHashes.length,
            message:
              topMatches.length > 0
                ? `Closest match was "${topMatches[0].album}" by "${topMatches[0].artist}" with ${topMatches[0].distance} bits difference (${Math.round(topMatches[0].similarity * 100)}% similarity). This is below the threshold of 22 bits.`
                : "No albums found within 30 bits difference. The captured image may be very different from database images.",
          },
        },
        { status: 404 }
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
          bestMatch.similarity > 0.75
            ? "high"
            : bestMatch.similarity > 0.5
            ? "medium"
            : "low",
      },
      debug: {
        thresholdUsed: bestMatch.distance <= 18 ? "standard (18)" : "forgiving (22)",
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
