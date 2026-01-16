import { NextRequest, NextResponse } from "next/server";
import { searchDiscogsAlbum } from "@/lib/discogs";
import { parseAlbumInfo } from "@/lib/vision";
import { searchDatabase, getAlbumById } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const { artist, album } = parseAlbumInfo(text);

    if (!artist || !album) {
      return NextResponse.json(
        { error: "Could not parse artist and album from text" },
        { status: 400 }
      );
    }

    // Try to find in local database first (faster)
    const dbResults = searchDatabase(artist, album);
    if (dbResults.length > 0) {
      // Return the first match from database
      const dbMatch = dbResults[0];
      return NextResponse.json({
        success: true,
        album: {
          id: dbMatch.discogsId,
          basic_information: {
            id: dbMatch.discogsId,
            master_id: dbMatch.masterId || 0,
            title: dbMatch.album,
            artists: [{ name: dbMatch.artist }],
            cover_image: dbMatch.coverImageUrl,
            thumb: dbMatch.thumbUrl,
            year: dbMatch.year || 0,
            labels: dbMatch.labels.map((name) => ({ name, catno: "" })),
            formats: dbMatch.formats.map((name) => ({ name, qty: "1" })),
          },
        },
        artist: dbMatch.artist,
        albumTitle: dbMatch.album,
        fromDatabase: true,
      });
    }

    // Fall back to Discogs API search
    const discogsRelease = await searchDiscogsAlbum(artist, album);

    if (!discogsRelease) {
      return NextResponse.json(
        { error: "Album not found in Discogs collection" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      album: discogsRelease,
      artist,
      albumTitle: album,
    });
  } catch (error) {
    console.error("Error matching album:", error);
    return NextResponse.json(
      { error: "Failed to match album" },
      { status: 500 }
    );
  }
}
