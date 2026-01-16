import { NextRequest, NextResponse } from "next/server";
import { searchDatabase } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const artist = searchParams.get("artist") || undefined;
    const album = searchParams.get("album") || undefined;

    const results = searchDatabase(artist, album);

    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error searching database:", error);
    return NextResponse.json(
      { error: "Failed to search database" },
      { status: 500 }
    );
  }
}
