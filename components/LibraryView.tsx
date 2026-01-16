"use client";

import { useState, useEffect } from "react";
import { DiscogsRelease } from "@/lib/discogs";
import TimestampPicker from "./TimestampPicker";

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

  const handleAlbumClick = (album: DiscogsRelease) => {
    setSelectedAlbum(album);
    setScrobbleTimestamp(Math.floor(Date.now() / 1000));
  };

  const handleScrobble = async () => {
    if (!selectedAlbum) return;

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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to scrobble");
      }

      alert(`Successfully scrobbled: ${artist} - ${albumTitle}`);
      setSelectedAlbum(null);
    } catch (err) {
      console.error("Error scrobbling:", err);
      alert("Failed to scrobble album");
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
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-xl">Loading your collection...</p>
      </div>
    );
  }

  if (error) {
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

      {/* Scrobble Modal */}
      {selectedAlbum && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Scrobble Album</h3>

            <div className="mb-4">
              <p className="text-lg font-medium text-white mb-1">
                {selectedAlbum.basic_information.artists[0]?.name || "Unknown"}
              </p>
              <p className="text-gray-300">
                {selectedAlbum.basic_information.title}
              </p>
            </div>

            <div className="mb-6">
              <TimestampPicker
                initialTimestamp={scrobbleTimestamp}
                onTimestampChange={setScrobbleTimestamp}
                label="Scrobble Time"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleScrobble}
                disabled={isScrobbling}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                {isScrobbling ? "Scrobbling..." : "Scrobble"}
              </button>
              <button
                onClick={() => setSelectedAlbum(null)}
                disabled={isScrobbling}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
