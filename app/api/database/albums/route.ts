import { NextResponse } from "next/server";
import { getAllAlbums, getDatabaseStats } from "@/lib/database";

export async function GET() {
  try {
    const albums = getAllAlbums();
    const stats = getDatabaseStats();

    return NextResponse.json({
      albums,
      stats,
    });
  } catch (error) {
    console.error("Error getting albums:", error);
    return NextResponse.json(
      { error: "Failed to get albums" },
      { status: 500 }
    );
  }
}
