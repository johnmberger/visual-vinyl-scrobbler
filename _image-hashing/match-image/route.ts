import { NextRequest, NextResponse } from "next/server";
import { generateHashFromBase64, findTopMatches } from "../imageMatching";
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

    // Find top matches to enable quality validation
    // Get top 3 matches to check if best match is significantly better than others
    const topMatches = await findTopMatches(capturedHash, albumsWithHashes, 3);

    if (topMatches.length === 0) {
      // No matches found at all
      return NextResponse.json(
        {
          success: false,
          error: "No matching album found in database",
          matches: [],
          debug: {
            closestMatches: [],
            totalAlbumsWithHashes: albumsWithHashes.length,
            message: "No albums found. The captured image may be very different from database images.",
          },
        },
        { status: 200 }
      );
    }

    const bestMatch = topMatches[0];
    const secondBestMatch = topMatches[1];

    // Quality gap: how many bits better is the best match vs second best?
    // Positive = best is better. e.g. best.distance=10, second.distance=15 → gap=5
    const qualityGap = secondBestMatch 
      ? secondBestMatch.distance - bestMatch.distance 
      : Infinity;
    
    // Thresholds: loosened so hash matching works for more than just highly distinctive covers.
    // Phone photos often differ in lighting, angle, focus vs. clean DB images.
    // High: >= 70% — accept (strong match). Medium: 65–70% — accept if best is clearly ahead.
    // Low: 55–65% — visual feedback only. Below 55%: reject.
    const HIGH_QUALITY_THRESHOLD = 0.70;  // 70% similarity
    const MEDIUM_QUALITY_THRESHOLD = 0.65; // 65% similarity
    const LOW_QUALITY_THRESHOLD = 0.55;    // 55% similarity — visual only
    
    let shouldAccept = false;
    let isBelowThreshold = false;
    
    if (bestMatch.similarity >= HIGH_QUALITY_THRESHOLD) {
      // Strong match: accept. No gap requirement — 70%+ is enough.
      shouldAccept = true;
    } else if (bestMatch.similarity >= MEDIUM_QUALITY_THRESHOLD) {
      // Decent match: accept only if best is clearly ahead of second (gap >= 2)
      // or there is no second candidate
      shouldAccept = qualityGap >= 2 || !secondBestMatch;
    } else if (bestMatch.similarity >= LOW_QUALITY_THRESHOLD) {
      shouldAccept = false;
      isBelowThreshold = true;
    } else {
      shouldAccept = false;
      isBelowThreshold = true;
    }

    // If we shouldn't accept, return no match (will fall through to Gemini)
    if (!shouldAccept && bestMatch.similarity < LOW_QUALITY_THRESHOLD) {
      // Return top 5 closest matches for debugging
      const allTopMatches = await findTopMatches(capturedHash, albumsWithHashes, 5);
      const debugMatches = allTopMatches.map((m) => ({
        artist: m.album.artist,
        album: m.album.album,
        distance: m.distance,
        similarity: m.similarity,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "No matching album found in database",
          matches: [],
          debug: {
            closestMatches: debugMatches,
            totalAlbumsWithHashes: albumsWithHashes.length,
            message:
              debugMatches.length > 0
                ? `Closest match was "${debugMatches[0].album}" by "${debugMatches[0].artist}" with ${debugMatches[0].distance} bits difference (${Math.round(debugMatches[0].similarity * 100)}% similarity). Quality too low for matching.`
                : "No albums found. The captured image may be very different from database images.",
          },
        },
        { status: 200 }
      );
    }

    // Return top matches for user selection (always show top 3 when we have candidates)
    // This helps catch false positives by letting the user verify
    const topMatchesForSelection = topMatches.slice(0, 3).map((m) => ({
      album: m.album,
      distance: m.distance,
      similarity: m.similarity,
      confidence:
        m.similarity >= 0.75
          ? "high"
          : m.similarity >= 0.70
          ? "medium"
          : "low",
    }));

    return NextResponse.json({
      success: true,
      match: {
        album: bestMatch.album,
        distance: bestMatch.distance,
        similarity: bestMatch.similarity,
        confidence:
          bestMatch.similarity >= 0.75
            ? "high"
            : bestMatch.similarity >= 0.70
            ? "medium"
            : "low",
        belowThreshold: isBelowThreshold || !shouldAccept,
      },
      topMatches: topMatchesForSelection, // Top 3 for user selection
      debug: {
        qualityGap: qualityGap !== Infinity ? qualityGap : null,
        secondBestDistance: secondBestMatch?.distance || null,
        secondBestSimilarity: secondBestMatch?.similarity || null,
        distance: bestMatch.distance,
        similarityPercent: Math.round(bestMatch.similarity * 100),
        belowThreshold: isBelowThreshold || !shouldAccept,
        accepted: shouldAccept,
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
