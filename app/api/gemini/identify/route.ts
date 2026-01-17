import { NextRequest, NextResponse } from "next/server";
import { identifyAlbumWithGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await identifyAlbumWithGemini(image);
    } catch (error: any) {
      // If Gemini API key is not configured, return a helpful error
      if (error.message?.includes("GEMINI_API_KEY is not configured")) {
        return NextResponse.json(
          {
            success: false,
            error: "Gemini API key not configured. Add GEMINI_API_KEY to your .env.local file.",
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

    return NextResponse.json({
      success: true,
      artist: result.artist,
      album: result.album,
    });
  } catch (error) {
    console.error("Error in Gemini identify API:", error);
    return NextResponse.json(
      {
        error: "Failed to identify album with Gemini",
        details:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
