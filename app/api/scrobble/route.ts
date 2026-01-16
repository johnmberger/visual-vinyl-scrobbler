import { NextRequest, NextResponse } from "next/server";
import { scrobbleAlbum } from "@/lib/lastfm";

export async function POST(request: NextRequest) {
  try {
    const { artist, album, timestamp, discogsRelease, selectedSides } =
      await request.json();

    if (!artist || !album) {
      return NextResponse.json(
        { error: "Artist and album are required" },
        { status: 400 }
      );
    }

    // Validate timestamp if provided (must be a valid Unix timestamp)
    let scrobbleTimestamp: number | undefined;
    if (timestamp !== undefined) {
      scrobbleTimestamp = parseInt(timestamp);
      if (isNaN(scrobbleTimestamp) || scrobbleTimestamp < 0) {
        return NextResponse.json(
          { error: "Invalid timestamp" },
          { status: 400 }
        );
      }
    }

    // If we have selected sides, we need to fetch the full release with tracklist
    let releaseWithTracklist = discogsRelease;
    if (
      selectedSides &&
      selectedSides.length > 0 &&
      discogsRelease?.basic_information?.id
    ) {
      try {
        const { getDiscogsRelease } = await import("@/lib/discogs");
        const fullRelease = await getDiscogsRelease(
          discogsRelease.basic_information.id
        );
        if (fullRelease) {
          releaseWithTracklist = fullRelease;
        }
      } catch (err) {
        console.warn("Could not fetch full release with tracklist:", err);
      }
    }

    const success = await scrobbleAlbum(
      artist,
      album,
      scrobbleTimestamp,
      releaseWithTracklist,
      selectedSides
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Scrobbled successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Failed to scrobble", details: "Unknown error" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error scrobbling:", error);

    // Provide more detailed error information
    let errorMessage = "Failed to scrobble";
    let errorDetails = "Unknown error";

    if (error.message) {
      errorMessage = error.message;
      errorDetails = error.message;
    }

    if (error.response?.data) {
      errorDetails =
        error.response.data.message ||
        error.response.data.error ||
        JSON.stringify(error.response.data);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        hint: "Check your Last.fm API credentials in .env.local",
      },
      { status: 500 }
    );
  }
}
