"use client";

import Modal from "./ui/Modal";
import AlbumCoverImage from "./ui/AlbumCoverImage";
import { buttonClass } from "./ui/buttonClasses";
import type { RecognitionError } from "@/lib/scrobbleTypes";

interface RecognitionErrorModalProps {
  error: RecognitionError;
  onRetry: () => void;
  onCancel: () => void;
  onManualEntry?: () => void;
}

function suggestionsFor(type: RecognitionError["type"]): string[] {
  switch (type) {
    case "gemini":
      return [
        "Ensure the album cover is clearly visible",
        "Try better lighting and focus",
        "Make sure the cover is centered in the frame",
        "Check that Gemini API is configured (GEMINI_API_KEY in .env.local)",
        "Rebuild the database with visual embeddings enabled",
        "Try scrobbling from the Library view instead",
      ];
    case "not_found":
      return [
        "Verify the album is in your Discogs collection",
        "Rebuild the local database if you recently added the album",
        "Try scrobbling from the Library view instead",
      ];
    default:
      return [
        "Try capturing again with better lighting",
        "Ensure the cover is clearly visible and in focus",
        "Try scrobbling from the Library view instead",
      ];
  }
}

export default function RecognitionErrorModal({
  error,
  onRetry,
  onCancel,
  onManualEntry,
}: RecognitionErrorModalProps) {
  const title =
    error.type === "gemini"
      ? "AI Recognition Failed"
      : error.type === "not_found"
        ? "Album Not Found"
        : "Recognition Failed";

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-2xl">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0">
          <svg
            className={`w-12 h-12 ${
              error.type === "gemini" ? "text-purple-500" : "text-red-500"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                error.type === "gemini"
                  ? "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              }
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-300">{error.message}</p>
        </div>
      </div>

      {error.capturedImage && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-400 mb-2">
            Captured Image:
          </p>
          <div className="max-w-xs mx-auto rounded-lg overflow-hidden border-2 border-gray-700">
            <AlbumCoverImage
              coverImage={error.capturedImage}
              alt="Captured album cover"
              variant="fill"
              unoptimized
            />
          </div>
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-300 mb-3">Suggestions:</p>
        <ul className="space-y-2">
          {suggestionsFor(error.type).map((suggestion) => (
            <li
              key={suggestion}
              className="flex items-start gap-2 text-sm text-gray-400"
            >
              <span className="text-blue-500 mt-1">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className={buttonClass("primary", { block: true })}
        >
          Try Again
        </button>
        {onManualEntry && (
          <button onClick={onManualEntry} className={buttonClass("accent")}>
            Use Library
          </button>
        )}
        <button onClick={onCancel} className={buttonClass("secondary")}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
