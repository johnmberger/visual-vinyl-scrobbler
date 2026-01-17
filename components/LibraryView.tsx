"use client";

import { useState, useEffect } from "react";
import { DiscogsRelease } from "@/lib/discogs";
import ScrobbleConfirmationModal from "./ScrobbleConfirmationModal";
import ScrobbleSuccessToast from "./ScrobbleSuccessToast";
import { LibraryGridSkeleton } from "./SkeletonLoader";

export default function LibraryView() {
  const [albums, setAlbums] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<DiscogsRelease | null>(
    null
  );
  const [scrobbleTimestamp, setScrobbleTimestamp] = useState<number>(
    Math.floor(Date.now() / 1000)
  );
  const [isScrobbling, setIsScrobbling] = useState(false);
  const [lastFmVerification, setLastFmVerification] = useState<{
    verified: boolean;
    message?: string;
    trackName?: string;
    artistName?: string;
    albumName?: string;
    hasTracklist?: boolean;
    trackCount?: number;
    isSingleTrack?: boolean;
  } | null>(null);
  const [tracklistSides, setTracklistSides] = useState<
    Array<{
      side: string;
      tracks: Array<{
        position: string;
        title: string;
        duration?: string;
      }>;
      label: string;
    }>
  >([]);
  const [selectedSides, setSelectedSides] = useState<Set<string>>(new Set());
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [isLoadingTracklist, setIsLoadingTracklist] = useState(false);
  const [scrobbleSuccess, setScrobbleSuccess] = useState<{
    artist: string;
    album: string;
    trackCount?: number;
  } | null>(null);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/discogs/collection");

      if (!response.ok) {
        throw new Error("Failed to load collection");
      }

      const data = await response.json();
      setAlbums(data.albums || []);
    } catch (err) {
      console.error("Error loading albums:", err);
      setError("Failed to load your Discogs collection");
    } finally {
      setLoading(false);
    }
  };

  const handleAlbumClick = async (album: DiscogsRelease) => {
    setSelectedAlbum(album);
    setScrobbleTimestamp(Math.floor(Date.now() / 1000));
    setLastFmVerification(null);
    setTracklistSides([]);
    setSelectedSides(new Set());

    const artist = album.basic_information.artists[0]?.name || "Unknown";
    const albumTitle = album.basic_information.title;

    // Verify album exists on Last.fm
    setIsLoadingVerification(true);
    try {
      const verifyResponse = await fetch("/api/verify-lastfm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artist,
          album: albumTitle,
        }),
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        setLastFmVerification(verifyData);
      }
    } catch (err) {
      console.warn("Could not verify with Last.fm:", err);
    } finally {
      setIsLoadingVerification(false);
    }

    // Fetch tracklist if we have a Discogs release ID
    if (album.basic_information?.id) {
      setIsLoadingTracklist(true);
      try {
        const tracklistResponse = await fetch(
          `/api/discogs/tracklist?releaseId=${album.basic_information.id}`
        );
        if (tracklistResponse.ok) {
          const tracklistData = await tracklistResponse.json();
          if (tracklistData.sides && tracklistData.sides.length > 0) {
            setTracklistSides(tracklistData.sides);
            // Select all sides by default
            setSelectedSides(
              new Set(tracklistData.sides.map((s: any) => s.side))
            );
          }
        }
      } catch (err) {
        console.error("Error fetching tracklist:", err);
      } finally {
        setIsLoadingTracklist(false);
      }
    }
  };

  const handleScrobble = async () => {
    if (!selectedAlbum) return;

    // Check if sides are selected (if tracklist is available)
    if (tracklistSides.length > 0 && selectedSides.size === 0) {
      setError("Please select at least one side to scrobble");
      return;
    }

    setIsScrobbling(true);
    try {
      const artist =
        selectedAlbum.basic_information.artists[0]?.name || "Unknown";
      const albumTitle = selectedAlbum.basic_information.title;

      const response = await fetch("/api/scrobble", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artist,
          album: albumTitle,
          timestamp: scrobbleTimestamp,
          discogsRelease: selectedAlbum,
          selectedSides:
            tracklistSides.length > 0 ? Array.from(selectedSides) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scrobble");
      }

      // Calculate track count for success message
      let trackCount: number | undefined;
      if (tracklistSides.length > 0 && selectedSides.size > 0) {
        trackCount = Array.from(selectedSides).reduce((total, side) => {
          const sideData = tracklistSides.find((s) => s.side === side);
          return total + (sideData?.tracks.length || 0);
        }, 0);
      }

      // Show success toast
      setScrobbleSuccess({
        artist,
        album: albumTitle,
        trackCount,
      });

      // Close modal
      setSelectedAlbum(null);
      setLastFmVerification(null);
      setTracklistSides([]);
      setSelectedSides(new Set());

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setScrobbleSuccess(null);
      }, 5000);
    } catch (err) {
      console.error("Error scrobbling:", err);
      setError(
        err instanceof Error ? err.message : "Failed to scrobble album"
      );
    } finally {
      setIsScrobbling(false);
    }
  };

  const filteredAlbums = albums.filter((album) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const artist =
      album.basic_information.artists[0]?.name?.toLowerCase() || "";
    const title = album.basic_information.title.toLowerCase();
    return artist.includes(query) || title.includes(query);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-2xl font-semibold mb-4">Your Library</h2>
          <div className="mb-4">
            <div className="w-full h-10 bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
          <div className="h-5 bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
          <LibraryGridSkeleton count={12} />
        </div>
      </div>
    );
  }

  if (error && !selectedAlbum) {
    return (
      <div className="bg-gray-800 rounded-lg p-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadAlbums}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && selectedAlbum && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-2xl font-semibold mb-4">Your Library</h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <p className="text-gray-400 mb-4">
          {filteredAlbums.length} album{filteredAlbums.length !== 1 ? "s" : ""}{" "}
          in your collection
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto">
          {filteredAlbums.map((album) => {
            const artist =
              album.basic_information.artists[0]?.name || "Unknown";
            const title = album.basic_information.title;
            const coverImage =
              album.basic_information.cover_image ||
              album.basic_information.thumb;

            return (
              <div
                key={album.id}
                className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => handleAlbumClick(album)}
              >
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={`${artist} - ${title}`}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No Cover</span>
                  </div>
                )}
                <div className="p-2">
                  <p className="text-sm font-semibold truncate" title={title}>
                    {title}
                  </p>
                  <p className="text-xs text-gray-400 truncate" title={artist}>
                    {artist}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Success Toast */}
      {scrobbleSuccess && (
        <ScrobbleSuccessToast
          artist={scrobbleSuccess.artist}
          album={scrobbleSuccess.album}
          trackCount={scrobbleSuccess.trackCount}
          onClose={() => setScrobbleSuccess(null)}
        />
      )}

      {/* Scrobble Modal */}
      {selectedAlbum && (
        <ScrobbleConfirmationModal
          pendingScrobble={{
            artist:
              selectedAlbum.basic_information.artists[0]?.name || "Unknown",
            album: selectedAlbum.basic_information.title,
            albumTitle: selectedAlbum.basic_information.title,
            discogsRelease: selectedAlbum,
          }}
          lastFmVerification={lastFmVerification}
          tracklistSides={tracklistSides}
          selectedSides={selectedSides}
          onSelectionChange={setSelectedSides}
          scrobbleTimestamp={scrobbleTimestamp}
          onTimestampChange={setScrobbleTimestamp}
          onConfirm={handleScrobble}
          onCancel={() => {
            setSelectedAlbum(null);
            setLastFmVerification(null);
            setTracklistSides([]);
            setSelectedSides(new Set());
            setError(null);
          }}
          isScrobbling={isScrobbling}
          isLoadingVerification={isLoadingVerification}
          isLoadingTracklist={isLoadingTracklist}
        />
      )}
    </div>
  );
}
