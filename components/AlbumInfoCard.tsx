"use client";

import { useState } from "react";
import Image from "next/image";

interface AlbumInfoCardProps {
  artist: string;
  albumTitle: string;
  coverImage?: string;
  thumb?: string;
  matchMethod?: string;
  confidence?: string;
}

export default function AlbumInfoCard({
  artist,
  albumTitle,
  coverImage,
  thumb,
  matchMethod,
  confidence,
}: AlbumInfoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="lg:col-span-1 space-y-4">
      {/* Album Art */}
      {(coverImage || thumb) && (
        <div className="flex justify-center">
          <div className="relative w-full max-w-xs aspect-square rounded-lg border-2 border-gray-600 overflow-hidden bg-gray-600">
            {/* Skeleton loader - shows while image is loading */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-600 animate-pulse">
                <div className="w-full h-full bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600"></div>
              </div>
            )}
            <Image
              src={(coverImage || thumb) || ""}
              alt={`${artist} - ${albumTitle}`}
              fill
              sizes="(max-width: 1024px) 100vw, 320px"
              className={`object-cover transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              priority
              quality={90}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          </div>
        </div>
      )}

      {/* Album Info */}
      <div>
        <p className="text-xl font-medium text-white mb-1">{artist}</p>
        <p className="text-gray-300 text-lg">{albumTitle}</p>
        {matchMethod && (
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span>
              {matchMethod === "image"
                ? "Visual matching"
                : "AI recognition (Gemini)"}
              {confidence && ` (${confidence})`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
