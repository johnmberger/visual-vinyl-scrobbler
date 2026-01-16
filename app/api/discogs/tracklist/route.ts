import { NextRequest, NextResponse } from "next/server";
import { getDiscogsRelease, parseTracklistSides } from "@/lib/discogs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const releaseId = searchParams.get("releaseId");

    if (!releaseId) {
      return NextResponse.json(
        { error: "releaseId is required" },
        { status: 400 }
      );
    }

    const releaseIdNum = parseInt(releaseId);
    if (isNaN(releaseIdNum)) {
      return NextResponse.json({ error: "Invalid releaseId" }, { status: 400 });
    }

    const release = await getDiscogsRelease(releaseIdNum);

    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    console.log("Full release data:", JSON.stringify(release, null, 2));
    console.log("Tracklist from release:", release.tracklist);
    console.log("Tracklist type:", typeof release.tracklist);
    console.log("Tracklist length:", release.tracklist?.length);

    const tracklist = release.tracklist || [];
    console.log("Parsed tracklist array:", tracklist);

    const sides = parseTracklistSides(tracklist);
    console.log("Parsed sides:", sides);

    // Handle both collection format (basic_information) and full release format
    const title =
      release.basic_information?.title || release.title || "Unknown";
    const artist =
      release.basic_information?.artists?.[0]?.name ||
      release.artists?.[0]?.name ||
      "Unknown";

    return NextResponse.json({
      success: true,
      tracklist,
      sides,
      release: {
        id: release.id,
        title,
        artist,
      },
      debug: {
        tracklistLength: tracklist.length,
        sidesCount: sides.length,
        hasTracklist: !!release.tracklist,
      },
    });
  } catch (error) {
    console.error("Error fetching tracklist:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracklist" },
      { status: 500 }
    );
  }
}
