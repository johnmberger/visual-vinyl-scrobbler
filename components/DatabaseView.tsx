"use client";

import { useState, useEffect } from "react";
import { DatabaseStatsSkeleton } from "./SkeletonLoader";
import StatusBanner from "./ui/StatusBanner";
import { buttonClass } from "./ui/buttonClasses";

export default function DatabaseView() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [stats, setStats] = useState<{
    totalAlbums: number;
    lastBuilt: string;
    albumsWithCovers: number;
    albumsWithEmbeddings?: number;
    embeddingModel?: string | null;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generateEmbeddings, setGenerateEmbeddings] = useState(true);
  const [buildLog, setBuildLog] = useState<string[]>([]);

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

  const buildDatabase = async () => {
    setIsBuilding(true);
    setError(null);
    setMessage(null);
    setBuildLog(["Fetching Discogs collection..."]);

    try {
      const response = await fetch("/api/database/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateEmbeddings }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || data.details || "Failed to build database"
        );
      }

      if (contentType.includes("application/x-ndjson")) {
        const reader = response.body?.getReader();
        const dec = new TextDecoder();
        let buf = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                if (data.type === "phase") {
                  setBuildLog((l) => [
                    ...l,
                    `Fetched ${data.total} albums.`,
                    data.generateEmbeddings
                      ? "Generating visual embeddings (Last.fm → Discogs covers)..."
                      : "Building metadata database (no embeddings)...",
                  ]);
                } else if (data.type === "progress" && data.album) {
                  const progressLine = `  ${data.current}/${data.total}  ${data.album}`;
                  setBuildLog((l) =>
                    l.length > 0 && /^\s*\d+\/\d+/.test(l[l.length - 1])
                      ? [...l.slice(0, -1), progressLine]
                      : [...l, progressLine]
                  );
                } else if (data.type === "done") {
                  setMessage(data.message);
                  setStats(data.stats);
                  setBuildLog((l) => [...l, "Done."]);
                  setIsBuilding(false);
                } else if (data.type === "error") {
                  setError(data.error || "Build failed");
                  setBuildLog((l) => [
                    ...l,
                    `Error: ${data.error || "Build failed"}`,
                  ]);
                  setIsBuilding(false);
                }
              } catch {
                // ignore partial JSON lines
              }
            }
          }
          setIsBuilding(false);
        }
        return;
      }

      const data = await response.json();
      setMessage(data.message);
      setStats(data.stats);
    } catch (err) {
      console.error("Error building database:", err);
      setError(err instanceof Error ? err.message : String(err));
      setBuildLog((l) => [
        ...l,
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      ]);
    } finally {
      setIsBuilding(false);
    }
  };

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
                <span className="text-gray-400">Visual Embeddings:</span>{" "}
                <span className="font-semibold">
                  {stats.albumsWithEmbeddings ?? 0}
                </span>
                {stats.embeddingModel ? (
                  <span className="text-gray-500 text-xs ml-2">
                    ({stats.embeddingModel})
                  </span>
                ) : null}
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

        <StatusBanner variant="info">
          Recognition uses{" "}
          <span className="font-semibold">visual embeddings</span> (Gemini
          Embedding 2) plus collection-constrained Gemini vision. Rebuild after
          adding albums to Discogs.
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={generateEmbeddings}
              onChange={(e) => setGenerateEmbeddings(e.target.checked)}
              className="rounded border-gray-500"
            />
            Generate visual embeddings (recommended; needs GEMINI_API_KEY)
          </label>
        </StatusBanner>

        <button
          onClick={buildDatabase}
          disabled={isBuilding}
          className={buttonClass("primary", { size: "lg", block: true })}
        >
          {isBuilding ? "Building Database..." : "Build Database from Discogs"}
        </button>

        {buildLog.length > 0 && (
          <div className="mt-2 p-3 bg-gray-900 rounded-lg text-sm font-mono text-gray-300 max-h-48 overflow-y-auto">
            {buildLog.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-400">
          Fetches your Discogs collection and optionally embeds each cover for
          visual matching. Embedding a large collection can take several
          minutes.
        </p>

        {message && <StatusBanner variant="success">{message}</StatusBanner>}
        {error && <StatusBanner variant="error">{error}</StatusBanner>}
      </div>
    </div>
  );
}
