import { NextRequest, NextResponse } from "next/server";
import { getAllDiscogsAlbums } from "@/lib/discogs";
import { buildDatabase } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const generateHashes = body.generateHashes === true;

    // Fetch all albums from Discogs
    let releases;
    try {
      releases = await getAllDiscogsAlbums();
    } catch (discogsError: any) {
      console.error("Discogs API error:", discogsError);

      // Check for common Discogs API errors
      if (discogsError.response?.status === 401) {
        return NextResponse.json(
          {
            error: "Discogs authentication failed",
            details: "Please check your DISCOGS_USER_TOKEN in .env.local",
          },
          { status: 401 }
        );
      }

      if (discogsError.response?.status === 404) {
        return NextResponse.json(
          {
            error: "Discogs user not found",
            details: "Please check your DISCOGS_USERNAME in .env.local",
          },
          { status: 404 }
        );
      }

      if (
        discogsError.code === "ENOTFOUND" ||
        discogsError.code === "ECONNREFUSED"
      ) {
        return NextResponse.json(
          {
            error: "Network error",
            details:
              "Could not connect to Discogs API. Check your internet connection.",
          },
          { status: 503 }
        );
      }

      throw discogsError; // Re-throw if it's not a known error
    }

    if (!releases || releases.length === 0) {
      return NextResponse.json(
        {
          error: "No albums found",
          details: "Your Discogs collection appears to be empty",
        },
        { status: 404 }
      );
    }

    // Build the database (optionally with hashes)
    const database = await buildDatabase(releases, generateHashes);

    return NextResponse.json({
      success: true,
      message: `Database built successfully with ${database.totalAlbums} albums`,
      stats: {
        totalAlbums: database.totalAlbums,
        lastBuilt: database.lastBuilt,
        albumsWithCovers: database.albums.filter(
          (album) => album.coverImageUrl || album.thumbUrl
        ).length,
      },
    });
  } catch (error) {
    console.error("Error building database:", error);

    // Ensure we always return JSON, not HTML
    return NextResponse.json(
      {
        error: "Failed to build database",
        details: error instanceof Error ? error.message : "Unknown error",
        hint: "Check your .env.local file for Discogs API credentials",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Use dynamic import to avoid loading imageMatching on GET requests
    // (which would try to load WASM files)
    const database = await import("@/lib/database");
    const stats = database.getDatabaseStats();

    return NextResponse.json({
      stats,
    });
  } catch (error) {
    console.error("Error getting database stats:", error);
    return NextResponse.json(
      { error: "Failed to get database stats" },
      { status: 500 }
    );
  }
}
