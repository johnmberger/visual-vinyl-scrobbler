"use client";

import CameraView from "@/components/CameraView";
import ConfigStatus from "@/components/ConfigStatus";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">
          Visual Vinyl Scrobbler
        </h1>

        <ConfigStatus />

        <div className="flex gap-4 mb-6 justify-center flex-wrap">
          <Link
            href="/"
            className="px-6 py-3 cursor-pointer rounded-lg font-semibold transition-colors bg-blue-600 text-white"
          >
            Camera
          </Link>
          <Link
            href="/library"
            className="px-6 py-3 cursor-pointer rounded-lg font-semibold transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Library
          </Link>
          <Link
            href="/database"
            className="px-6 py-3 cursor-pointer rounded-lg font-semibold transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Database
          </Link>
        </div>

        <CameraView />
      </div>
    </main>
  );
}
