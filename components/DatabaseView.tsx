"use client";

import { useState, useEffect } from "react";
import { DatabaseStatsSkeleton } from "./SkeletonLoader";

export default function DatabaseView() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [stats, setStats] = useState<{
    totalAlbums: number;
    lastBuilt: string;
    albumsWithCovers: number;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/database/build");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const [generateHashes, setGenerateHashes] = useState(false);

  const buildDatabase = async () => {
    setIsBuilding(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/database/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ generateHashes }),
      });

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error(
          `Server returned an error. Check your Discogs API credentials in .env.local`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.details || "Failed to build database"
        );
      }

      setMessage(data.message);
      setStats(data.stats);
    } catch (err) {
      console.error("Error building database:", err);
      let errorMessage = "Failed to build database";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      setError(errorMessage);
    } finally {
      setIsBuilding(false);
    }
  };

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-2xl font-semibold mb-4">Cover Database</h2>

      <div className="space-y-4">
        {stats ? (
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Database Statistics</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">Total Albums:</span>{" "}
                <span className="font-semibold">{stats.totalAlbums}</span>
              </p>
              <p>
                <span className="text-gray-400">Albums with Covers:</span>{" "}
                <span className="font-semibold">{stats.albumsWithCovers}</span>
              </p>
              <p>
                <span className="text-gray-400">Last Built:</span>{" "}
                <span className="font-semibold">
                  {new Date(stats.lastBuilt).toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <DatabaseStatsSkeleton />
        )}

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generateHashes}
              onChange={(e) => setGenerateHashes(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm">
              Generate image hashes for visual matching (slower but enables
              image-based recognition)
            </span>
          </label>
        </div>

        <button
          onClick={buildDatabase}
          disabled={isBuilding}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors"
        >
          {isBuilding
            ? generateHashes
              ? "Building Database & Generating Hashes..."
              : "Building Database..."
            : "Build Database from Discogs"}
        </button>

        <p className="text-sm text-gray-400">
          This will fetch all albums from your Discogs collection and create a
          local database of album covers.
          {generateHashes &&
            " With image hashes enabled, this will also download and process cover images for visual matching - this can take significantly longer."}
          {!generateHashes &&
            " This can take a few minutes if you have a large collection."}
        </p>

        {message && (
          <div className="p-4 bg-green-900/50 border border-green-600 rounded-lg">
            <p className="text-green-200">{message}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-600 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
