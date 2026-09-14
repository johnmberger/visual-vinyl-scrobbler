"use client";

import AlbumCoverImage from "./ui/AlbumCoverImage";

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
  return (
    <div className="lg:col-span-1 space-y-4">
      {(coverImage || thumb) && (
        <div className="flex justify-center">
          <AlbumCoverImage
            coverImage={coverImage}
            thumb={thumb}
            alt={`${artist} - ${albumTitle}`}
            variant="card"
            priority
            sizes="(max-width: 1024px) 100vw, 320px"
          />
        </div>
      )}

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
              {matchMethod === "embedding" || matchMethod === "image"
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
