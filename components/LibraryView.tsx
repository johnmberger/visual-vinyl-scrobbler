"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { DiscogsRelease } from "@/lib/discogs";
import ScrobbleConfirmationModal from "./ScrobbleConfirmationModal";
import ScrobbleSuccessToast from "./ScrobbleSuccessToast";
import { LibraryGridSkeleton, AlbumCardSkeleton } from "./SkeletonLoader";

export default function LibraryView() {
  const [albums, setAlbums] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"artist-asc" | "artist-desc" | "title-asc" | "title-desc" | "year-desc" | "year-asc">("artist-asc");
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
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

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
    setSelectedSides(new Set());
    
    // Set loading states BEFORE clearing tracklist to prevent showing "not available" message
    const hasReleaseId = !!album.basic_information?.id;
    setIsLoadingTracklist(hasReleaseId);
    setTracklistSides([]);

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
    if (hasReleaseId) {
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
    } else {
      // No release ID, so no tracklist to load
      setIsLoadingTracklist(false);
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

  const filteredAlbums = albums
    .filter((album) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const artist =
        album.basic_information.artists[0]?.name?.toLowerCase() || "";
      const title = album.basic_information.title.toLowerCase();
      return artist.includes(query) || title.includes(query);
    })
    .sort((a, b) => {
      const artistA = a.basic_information.artists[0]?.name || "";
      const artistB = b.basic_information.artists[0]?.name || "";
      const titleA = a.basic_information.title || "";
      const titleB = b.basic_information.title || "";
      const yearA = a.basic_information.year || 0;
      const yearB = b.basic_information.year || 0;

      switch (sortBy) {
        case "artist-asc":
          return artistA.localeCompare(artistB);
        case "artist-desc":
          return artistB.localeCompare(artistA);
        case "title-asc":
          return titleA.localeCompare(titleB);
        case "title-desc":
          return titleB.localeCompare(titleA);
        case "year-desc":
          return yearB - yearA;
        case "year-asc":
          return yearA - yearB;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-2xl font-semibold mb-4">Your Library</h2>
          <div className="mb-4 flex gap-3">
            <div className="flex-1 h-10 bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="w-40 h-10 bg-gray-700 rounded-lg animate-pulse"></div>
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

        <div className="mb-4 flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pr-10 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Clear search"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-all duration-200 text-white cursor-pointer"
          >
            <option value="artist-asc">Artist (A-Z)</option>
            <option value="artist-desc">Artist (Z-A)</option>
            <option value="title-asc">Album (A-Z)</option>
            <option value="title-desc">Album (Z-A)</option>
            <option value="year-desc">Year (Newest)</option>
            <option value="year-asc">Year (Oldest)</option>
          </select>
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
                tabIndex={0}
                role="button"
                aria-label={`${artist} - ${title}`}
                className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                onClick={() => handleAlbumClick(album)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleAlbumClick(album);
                  }
                }}
              >
                {coverImage ? (
                  <div className="relative w-full aspect-square bg-gray-600 overflow-hidden">
                    {/* Skeleton loader - shows while image is loading */}
                    {!loadedImages.has(album.id) && (
                      <div className="absolute inset-0 bg-gray-600 animate-pulse">
                        <div className="w-full h-full bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600"></div>
                      </div>
                    )}
                    <Image
                      src={coverImage}
                      alt={`${artist} - ${title}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className={`object-cover transition-opacity duration-300 ${
                        loadedImages.has(album.id) ? "opacity-100" : "opacity-0"
                      }`}
                      loading="lazy"
                      quality={85}
                      onLoad={() => {
                        setLoadedImages((prev) => new Set(prev).add(album.id));
                      }}
                      onError={() => {
                        // Mark as loaded even on error to hide skeleton
                        setLoadedImages((prev) => new Set(prev).add(album.id));
                      }}
                    />
                  </div>
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
