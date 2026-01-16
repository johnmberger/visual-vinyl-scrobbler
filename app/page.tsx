"use client";

import { useState, useEffect } from "react";
import CameraView from "@/components/CameraView";
import LibraryView from "@/components/LibraryView";
import DatabaseView from "@/components/DatabaseView";
import ConfigStatus from "@/components/ConfigStatus";

export default function Home() {
  const [view, setView] = useState<"camera" | "library" | "database">("camera");

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">
          Discogs Scrobbler
        </h1>

        <ConfigStatus />

        <div className="flex gap-4 mb-6 justify-center flex-wrap">
          <button
            onClick={() => setView("camera")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              view === "camera"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Camera
          </button>
          <button
            onClick={() => setView("library")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              view === "library"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setView("database")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              view === "database"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Database
          </button>
        </div>

        {view === "camera" && <CameraView />}
        {view === "library" && <LibraryView />}
        {view === "database" && <DatabaseView />}
      </div>
    </main>
  );
}
