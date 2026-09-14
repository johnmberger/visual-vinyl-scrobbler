import { NextRequest, NextResponse } from "next/server";
import { getAllDiscogsAlbums } from "@/lib/discogs";
import { buildDatabase } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    // Default on: generate visual embeddings for hybrid matching
    const generateEmbeddings = body.generateEmbeddings !== false;

    let releases;
    try {
      releases = await getAllDiscogsAlbums();
    } catch (discogsError: any) {
      console.error("Discogs API error:", discogsError);
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
      throw discogsError;
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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (obj: object) =>
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        try {
          enqueue({
            type: "phase",
            phase: "building",
            total: releases!.length,
            generateEmbeddings,
          });
          const database = await buildDatabase(
            releases!,
            generateEmbeddings,
            (p) => enqueue({ type: "progress", ...p })
          );
          const embeddingCount = database.albums.filter(
            (a) => a.embedding && a.embedding.length > 0
          ).length;
          const lastFmCount = database.albums.filter(
            (a) => a.embeddingSource === "lastfm"
          ).length;
          const message =
            `Database built successfully with ${database.totalAlbums} albums` +
            (generateEmbeddings
              ? ` (${embeddingCount} embeddings; ${lastFmCount} from Last.fm covers)`
              : "");
          enqueue({
            type: "done",
            message,
            stats: {
              totalAlbums: database.totalAlbums,
              lastBuilt: database.lastBuilt,
              albumsWithCovers: database.albums.filter(
                (a) => a.coverImageUrl || a.thumbUrl
              ).length,
              albumsWithEmbeddings: embeddingCount,
              embeddingsFromLastFm: lastFmCount,
              embeddingModel: database.embeddingModel,
            },
          });
        } catch (e) {
          enqueue({
            type: "error",
            error: String(e instanceof Error ? e.message : e),
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
  } catch (error) {
    console.error("Error building database:", error);

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
