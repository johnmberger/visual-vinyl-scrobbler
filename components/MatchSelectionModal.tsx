"use client";

import { useState } from "react";
import Modal from "./ui/Modal";
import AlbumCoverImage from "./ui/AlbumCoverImage";
import { buttonClass } from "./ui/buttonClasses";

export interface MatchCandidateAlbum {
  discogsId: number;
  masterId?: number | null;
  artist: string;
  album: string;
  year?: number | null;
  coverImageUrl?: string;
  thumbUrl?: string;
  labels?: string[];
  formats?: string[];
}

export interface MatchCandidate {
  album: MatchCandidateAlbum;
  similarity?: number;
  confidence: "high" | "medium" | "low";
  source?: "embedding" | "gemini";
}

interface MatchSelectionModalProps {
  capturedImage: string;
  candidates: MatchCandidate[];
  title?: string;
  subtitle?: string;
  onSelect: (candidate: MatchCandidate) => void;
  onUseGemini?: () => void;
  geminiLabel?: string;
  onCancel: () => void;
}

function confidenceColor(confidence: string) {
  switch (confidence) {
    case "high":
      return "text-green-400";
    case "medium":
      return "text-yellow-400";
    case "low":
      return "text-orange-400";
    default:
      return "text-gray-400";
  }
}

export default function MatchSelectionModal({
  capturedImage,
  candidates,
  title = "Select the correct album",
  subtitle,
  onSelect,
  onUseGemini,
  geminiLabel = "Try Gemini",
  onCancel,
}: MatchSelectionModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = candidates[selectedIndex];

  return (
    <Modal
      onClose={onCancel}
      onEnter={() => onSelect(candidates[selectedIndex])}
      maxWidthClass="max-w-4xl"
    >
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-300 text-sm">
          {subtitle ||
            `Found ${candidates.length} candidate${
              candidates.length !== 1 ? "s" : ""
            }. Select the correct album.`}
        </p>
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium text-gray-400 mb-2">Comparison:</p>
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Captured Image</p>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="Captured album cover"
                className="w-full object-contain"
              />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Selected Match</p>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-blue-500">
              <AlbumCoverImage
                coverImage={selected.album.coverImageUrl}
                thumb={selected.album.thumbUrl}
                alt={`${selected.album.artist} - ${selected.album.album}`}
                variant="fill"
                className="rounded-none"
                unoptimized
                placeholderLabel="No image"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {candidates.map((candidate, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={`${candidate.album.discogsId}-${index}`}
              onClick={() => setSelectedIndex(index)}
              className={`w-full cursor-pointer rounded-lg p-4 flex items-center gap-4 transition-colors text-left border-2 ${
                isSelected
                  ? "bg-blue-600/30 border-blue-500 hover:bg-blue-600/40"
                  : "bg-gray-700 hover:bg-gray-600 border-transparent hover:border-gray-500"
              }`}
            >
              <AlbumCoverImage
                coverImage={candidate.album.coverImageUrl}
                thumb={candidate.album.thumbUrl}
                alt={`${candidate.album.artist} - ${candidate.album.album}`}
                variant="thumb"
                unoptimized
                placeholderLabel="No image"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">
                  {candidate.album.album}
                </div>
                <div className="text-gray-300 text-sm truncate">
                  {candidate.album.artist}
                </div>
                {candidate.album.year ? (
                  <div className="text-gray-400 text-xs mt-1">
                    {candidate.album.year}
                  </div>
                ) : null}
              </div>
              <div className="flex-shrink-0 text-right">
                <div
                  className={`text-sm font-semibold ${confidenceColor(
                    candidate.confidence
                  )}`}
                >
                  {candidate.confidence.charAt(0).toUpperCase() +
                    candidate.confidence.slice(1)}
                </div>
                {typeof candidate.similarity === "number" && (
                  <div className="text-xs text-gray-400 mt-1">
                    {Math.round(candidate.similarity * 100)}% match
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onSelect(candidates[selectedIndex])}
          className={buttonClass("primary", { block: true })}
        >
          Confirm Selection
        </button>
        {onUseGemini && (
          <button onClick={onUseGemini} className={buttonClass("accent")}>
            {geminiLabel}
          </button>
        )}
        <button onClick={onCancel} className={buttonClass("secondary")}>
          Cancel
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Press Enter to confirm, Esc to cancel
      </p>
    </Modal>
  );
}
