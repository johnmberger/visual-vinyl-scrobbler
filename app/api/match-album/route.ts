import { NextRequest, NextResponse } from "next/server";
import { searchDiscogsAlbum } from "@/lib/discogs";
import { parseAlbumInfo } from "@/lib/vision";
import {
  searchDatabase,
  getAlbumById,
  albumCoverToDiscogsRelease,
} from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const {
      text,
      artist: providedArtist,
      album: providedAlbum,
      discogsId,
    } = await request.json();

    if (typeof discogsId === "number") {
      const byId = getAlbumById(discogsId);
      if (byId) {
        return NextResponse.json({
          success: true,
          album: albumCoverToDiscogsRelease(byId),
          artist: byId.artist,
          albumTitle: byId.album,
          fromDatabase: true,
          matchMethod: "discogsId",
        });
      }
    }

    let artist: string | undefined;
    let album: string | undefined;

    if (providedArtist && providedAlbum) {
      artist = providedArtist.trim();
      album = providedAlbum.trim();
    } else if (text) {
      const parsed = parseAlbumInfo(text);
      artist = parsed.artist;
      album = parsed.album;
    }

    if (!artist || !album) {
      return NextResponse.json(
        {
          error:
            "Could not parse artist and album. Provide either 'text' or both 'artist' and 'album'.",
        },
        { status: 400 }
      );
    }

    const dbResults = searchDatabase(artist, album);
    if (dbResults.length > 0) {
      const dbMatch = dbResults[0];
      return NextResponse.json({
        success: true,
        album: albumCoverToDiscogsRelease(dbMatch),
        artist: dbMatch.artist,
        albumTitle: dbMatch.album,
        fromDatabase: true,
        alternatives: dbResults.slice(1, 4).map((a) => ({
          discogsId: a.discogsId,
          artist: a.artist,
          album: a.album,
          coverImageUrl: a.coverImageUrl,
          thumbUrl: a.thumbUrl,
        })),
      });
    }

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
