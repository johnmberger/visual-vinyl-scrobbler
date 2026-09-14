import { NextRequest, NextResponse } from "next/server";
import { getAllAlbums } from "@/lib/database";
import {
  embedImage,
  findTopEmbeddingMatches,
  shouldAutoAcceptEmbedding,
  shouldShowEmbeddingCandidates,
  EMBEDDING_CANDIDATE_MIN,
} from "@/lib/embeddings";

/**
 * Visual match via Gemini Embedding 2 cosine search against the local DB.
 */
export async function POST(request: NextRequest) {
  try {
    const { image, limit = 5 } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    const albums = getAllAlbums();
    const withEmbeddings = albums.filter(
      (a) => a.embedding && a.embedding.length > 0
    );

    if (withEmbeddings.length === 0) {
      return NextResponse.json({
        success: false,
        noEmbeddings: true,
        message:
          "No visual embeddings in database. Rebuild the database to enable visual matching.",
        matches: [],
      });
    }

    let queryEmbedding: number[];
    try {
      queryEmbedding = await embedImage(image);
    } catch (error: any) {
      if (error.message?.includes("GEMINI_API_KEY")) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 503 }
        );
      }
      throw error;
    }

    const matches = findTopEmbeddingMatches(
      queryEmbedding,
      withEmbeddings,
      Math.min(Number(limit) || 5, 10)
    );

    if (matches.length === 0) {
      return NextResponse.json({
        success: false,
        matches: [],
        message: "No embedding matches found",
      });
    }

    const autoAccept = shouldAutoAcceptEmbedding(matches);
    const showCandidates = shouldShowEmbeddingCandidates(matches);
    const top = matches[0];

    return NextResponse.json({
      success: autoAccept || showCandidates,
      autoAccept,
      showCandidates,
      match: {
        album: top.album,
        similarity: top.similarity,
        confidence: top.confidence,
        belowThreshold: top.similarity < EMBEDDING_CANDIDATE_MIN,
      },
      matches: matches.map((m) => ({
        album: {
          discogsId: m.album.discogsId,
          masterId: m.album.masterId,
          artist: m.album.artist,
          album: m.album.album,
          year: m.album.year,
          coverImageUrl: m.album.coverImageUrl,
          thumbUrl: m.album.thumbUrl,
          labels: m.album.labels,
          formats: m.album.formats,
        },
        similarity: m.similarity,
        confidence: m.confidence,
      })),
    });
  } catch (error) {
    console.error("Error in match-image API:", error);
    return NextResponse.json(
      {
        error: "Failed to match image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
