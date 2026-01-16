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

    // Find best match
    const bestMatch = await findBestMatch(
      capturedHash,
      albumsWithHashes,
      15 // Threshold: max Hamming distance
    );

    if (!bestMatch) {
      return NextResponse.json(
        {
          error: "No matching album found in database",
          matches: [],
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
          bestMatch.similarity > 0.8
            ? "high"
            : bestMatch.similarity > 0.6
            ? "medium"
            : "low",
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
