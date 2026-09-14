"use client";

import { useState } from "react";
import Image from "next/image";

type AlbumCoverImageProps = {
  coverImage?: string | null;
  thumb?: string | null;
  alt: string;
  /** fill = square container that fills parent; thumb = fixed small square */
  variant?: "fill" | "thumb" | "card";
  className?: string;
  /** Prefer next/image for remote Discogs URLs; use img for data URLs / captured frames */
  unoptimized?: boolean;
  priority?: boolean;
  sizes?: string;
  placeholderLabel?: string;
};

/**
 * One place for cover fallback: cover → thumb → placeholder.
 * Juniors: always use this instead of hand-rolling img/Image + skeleton.
 */
export default function AlbumCoverImage({
  coverImage,
  thumb,
  alt,
  variant = "fill",
  className = "",
  unoptimized = false,
  priority = false,
  sizes,
  placeholderLabel = "No Cover",
}: AlbumCoverImageProps) {
  const [loaded, setLoaded] = useState(false);
  const src = coverImage || thumb || null;

  const frameClass =
    variant === "thumb"
      ? `relative w-20 h-20 rounded overflow-hidden bg-gray-600 flex-shrink-0 ${className}`
      : variant === "card"
        ? `relative w-full max-w-xs aspect-square rounded-lg border-2 border-gray-600 overflow-hidden bg-gray-600 ${className}`
        : `relative w-full aspect-square bg-gray-600 overflow-hidden ${className}`;

  if (!src) {
    return (
      <div className={`${frameClass} flex items-center justify-center`}>
        <span className="text-gray-400 text-xs sm:text-sm">
          {placeholderLabel}
        </span>
      </div>
    );
  }

  const isDataUrl = src.startsWith("data:");

  return (
    <div className={frameClass}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-600 animate-pulse">
          <div className="w-full h-full bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600" />
        </div>
      )}
      {isDataUrl || unoptimized ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={
            sizes ||
            (variant === "thumb"
              ? "80px"
              : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw")
          }
          className={`object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          priority={priority}
          quality={variant === "card" ? 90 : 85}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      )}
    </div>
  );
}
