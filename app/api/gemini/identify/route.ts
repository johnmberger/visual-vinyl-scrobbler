import { NextRequest, NextResponse } from "next/server";
import { identifyAlbumWithGemini, CollectionAlbumRef } from "@/lib/gemini";
import {
  getCollectionRefs,
  getAlbumById,
  albumCoverToDiscogsRelease,
} from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const {
      image,
      useCollection = true,
      /** Prefer these discogs IDs (from embedding match / picker) over full collection */
      shortlistIds,
    } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    let shortlist: CollectionAlbumRef[] | undefined;
    if (Array.isArray(shortlistIds) && shortlistIds.length > 0) {
      shortlist = shortlistIds
        .map((id: unknown) =>
          typeof id === "number" ? getAlbumById(id) : null
        )
        .filter(Boolean)
        .map((a) => ({
          discogsId: a!.discogsId,
          artist: a!.artist,
          album: a!.album,
        }));
    }

    const collection =
      !shortlist?.length && useCollection ? getCollectionRefs() : undefined;

    let result;
    try {
      result = await identifyAlbumWithGemini(image, {
        shortlist,
        collection,
      });
    } catch (error: any) {
      if (error.message?.includes("GEMINI_API_KEY is not configured")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Gemini API key not configured. Add GEMINI_API_KEY to your .env.local file.",
          },
          { status: 503 }
        );
      }
      throw error;
    }

    if (!result || !result.artist || !result.album) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not identify artist and album from image",
        },
        { status: 404 }
      );
    }

    let matchedAlbum = null;
    if (result.discogsId) {
      const dbAlbum = getAlbumById(result.discogsId);
      if (dbAlbum) {
        matchedAlbum = albumCoverToDiscogsRelease(dbAlbum);
      }
    }

    return NextResponse.json({
      success: true,
      artist: result.artist,
      album: result.album,
      discogsId: result.discogsId ?? null,
      confidence: result.confidence ?? "medium",
      candidates: result.candidates ?? [],
      matchedAlbum,
      collectionConstrained: !!(shortlist?.length || collection?.length),
      usedShortlist: !!(shortlist && shortlist.length > 0),
      shortlistSize: shortlist?.length ?? 0,
    });
  } catch (error) {
    console.error("Error in Gemini identify API:", error);
    return NextResponse.json(
      {
        error: "Failed to identify album with Gemini",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
