import { NextResponse } from "next/server";
import { getAllDiscogsAlbums } from "@/lib/discogs";

export async function GET() {
  try {
    const albums = await getAllDiscogsAlbums();
    return NextResponse.json({ albums });
  } catch (error) {
    console.error("Error fetching Discogs collection:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}
