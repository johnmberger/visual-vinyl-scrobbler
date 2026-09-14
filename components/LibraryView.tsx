"use client";

import { useState, useEffect } from "react";
import { DiscogsRelease } from "@/lib/discogs";
import ScrobbleConfirmationModal from "./ScrobbleConfirmationModal";
import ScrobbleSuccessToast from "./ScrobbleSuccessToast";
import AlbumCoverImage from "./ui/AlbumCoverImage";
import StatusBanner from "./ui/StatusBanner";
import { buttonClass } from "./ui/buttonClasses";
import { LibraryGridSkeleton } from "./SkeletonLoader";
import { filterAndSortAlbums, type SortOption } from "@/lib/albumUtils";
import { useScrobbleSession } from "@/hooks/useScrobbleSession";

export default function LibraryView() {
  const [albums, setAlbums] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("artist-asc");
  const [selectedAlbum, setSelectedAlbum] = useState<DiscogsRelease | null>(
    null
  );

  const scrobble = useScrobbleSession();

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/discogs/collection");
      if (!response.ok) throw new Error("Failed to load collection");
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
    if (!album.basic_information) return;

    setSelectedAlbum(album);
    setError(null);

    const artist = album.basic_information.artists[0]?.name || "Unknown";
    const albumTitle = album.basic_information.title || "";

    await scrobble.beginSession({
      artist,
      albumTitle,
      discogsRelease: album,
    });
  };

  const handleScrobble = async () => {
    if (!selectedAlbum?.basic_information) {
      setError("Invalid album data");
      return;
    }

    const artist =
      selectedAlbum.basic_information.artists[0]?.name || "Unknown";
    const albumTitle = selectedAlbum.basic_information.title || "";

    const result = await scrobble.scrobble({
      artist,
      albumTitle,
      discogsRelease: selectedAlbum,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSelectedAlbum(null);
    scrobble.resetSession();
  };

  const filteredAlbums = filterAndSortAlbums(albums, searchQuery, sortBy);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-2xl font-semibold mb-4">Your Library</h2>
          <div className="mb-4 flex gap-3">
            <div className="flex-1 h-10 bg-gray-700 rounded-lg animate-pulse" />
            <div className="w-40 h-10 bg-gray-700 rounded-lg animate-pulse" />
          </div>
          <div className="h-5 bg-gray-700 rounded w-48 mb-4 animate-pulse" />
          <LibraryGridSkeleton count={12} />
        </div>
      </div>
    );
  }

  if (error && !selectedAlbum) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 space-y-4">
        <StatusBanner variant="error">{error}</StatusBanner>
        <button onClick={loadAlbums} className={buttonClass("primary")}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && selectedAlbum && (
        <StatusBanner variant="error">{error}</StatusBanner>
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
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white cursor-pointer"
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
          {filteredAlbums
            .filter((album) => album.basic_information)
            .map((album) => {
              const basicInfo = album.basic_information!;
              const artist = basicInfo.artists[0]?.name || "Unknown";
              const title = basicInfo.title || "";

              return (
                <div
                  key={album.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`${artist} - ${title}`}
                  className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                  onClick={() => handleAlbumClick(album)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleAlbumClick(album);
                    }
                  }}
                >
                  <AlbumCoverImage
                    coverImage={basicInfo.cover_image}
                    thumb={basicInfo.thumb}
                    alt={`${artist} - ${title}`}
                    variant="fill"
                  />
                  <div className="p-2">
                    <p className="text-sm font-semibold truncate" title={title}>
                      {title}
                    </p>
                    <p
                      className="text-xs text-gray-400 truncate"
                      title={artist}
                    >
                      {artist}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {scrobble.scrobbleSuccess && (
        <ScrobbleSuccessToast
          artist={scrobble.scrobbleSuccess.artist}
          album={scrobble.scrobbleSuccess.album}
          trackCount={scrobble.scrobbleSuccess.trackCount}
          onClose={() => scrobble.setScrobbleSuccess(null)}
        />
      )}

      {selectedAlbum?.basic_information && (
        <ScrobbleConfirmationModal
          pendingScrobble={{
            artist:
              selectedAlbum.basic_information.artists[0]?.name || "Unknown",
            album: selectedAlbum.basic_information.title || "",
            albumTitle: selectedAlbum.basic_information.title || "",
            discogsRelease: selectedAlbum,
          }}
          lastFmVerification={scrobble.lastFmVerification}
          tracklistSides={scrobble.tracklistSides}
          selectedSides={scrobble.selectedSides}
          onSelectionChange={scrobble.setSelectedSides}
          scrobbleTimestamp={scrobble.scrobbleTimestamp}
          onTimestampChange={scrobble.setScrobbleTimestamp}
          onConfirm={handleScrobble}
          onCancel={() => {
            setSelectedAlbum(null);
            scrobble.resetSession();
            setError(null);
          }}
          isScrobbling={scrobble.isScrobbling}
          isLoadingVerification={scrobble.isLoadingVerification}
          isLoadingTracklist={scrobble.isLoadingTracklist}
        />
      )}
    </div>
  );
}
