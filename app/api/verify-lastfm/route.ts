import { NextRequest, NextResponse } from "next/server";
import { searchLastFmAlbum, searchLastFmTrack } from "@/lib/lastfm";

export async function POST(request: NextRequest) {
  try {
    const { artist, album } = await request.json();

    if (!artist || !album) {
      return NextResponse.json(
        { error: "Artist and album are required" },
        { status: 400 }
      );
    }

    // Try to find album on Last.fm
    const lastFmAlbum = await searchLastFmAlbum(artist, album);

    if (lastFmAlbum) {
      const hasTracklist =
        !!lastFmAlbum.tracks && lastFmAlbum.tracks.length > 0;
      return NextResponse.json({
        verified: true,
        message: hasTracklist
          ? `Found "${lastFmAlbum.name}" by "${lastFmAlbum.artist}" on Last.fm with ${lastFmAlbum.tracks.length} tracks`
          : `Found "${lastFmAlbum.name}" by "${lastFmAlbum.artist}" on Last.fm`,
        artistName: lastFmAlbum.artist,
        albumName: lastFmAlbum.name,
        hasTracklist,
        trackCount: lastFmAlbum.tracks?.length || 0,
      });
    }

    // Try searching for track (album title as track)
    const track = await searchLastFmTrack(artist, album);

    if (track) {
      return NextResponse.json({
        verified: true,
        message: `Found track "${track.name}" by "${track.artist}" on Last.fm. Will scrobble this track (album tracklist not available).`,
        trackName: track.name,
        artistName: track.artist,
        hasTracklist: false,
        isSingleTrack: true,
      });
    }

    // Not found
    return NextResponse.json({
      verified: false,
      message: `Could not find "${album}" by "${artist}" on Last.fm. Scrobble may fail.`,
      warning:
        "Album/track not found in Last.fm database. The scrobble might be rejected.",
    });
  } catch (error) {
    console.error("Error verifying with Last.fm:", error);
    return NextResponse.json(
      {
        verified: false,
        message: "Could not verify with Last.fm",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
