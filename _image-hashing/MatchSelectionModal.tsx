"use client";

import { useEffect, useState } from "react";
import { AlbumCover } from "@/lib/database";

interface MatchCandidate {
  album: AlbumCover;
  distance: number;
  similarity: number;
  confidence: "high" | "medium" | "low";
}

interface MatchSelectionModalProps {
  capturedImage: string;
  candidates: MatchCandidate[];
  onSelect: (candidate: MatchCandidate) => void;
  onUseGemini: () => void;
  onCancel: () => void;
}

export default function MatchSelectionModal({
  capturedImage,
  candidates,
  onSelect,
  onUseGemini,
  onCancel,
}: MatchSelectionModalProps) {
  // Auto-select the first (highest confidence) candidate
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        // Confirm the selected candidate
        onSelect(candidates[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel, onSelect, candidates, selectedIndex]);

  const getConfidenceColor = (confidence: string) => {
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
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "High";
      case "medium":
        return "Medium";
      case "low":
        return "Low";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-white mb-2">
            Select the correct album
          </h3>
          <p className="text-gray-300 text-sm">
            Hash matching found {candidates.length} candidate
            {candidates.length !== 1 ? "s" : ""}. Please select the correct one
            or use Gemini for more accurate identification.
          </p>
        </div>

        {/* Captured Image and Selected Album Preview */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-400 mb-2">
            Comparison:
          </p>
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Captured Image</p>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
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
                {candidates[selectedIndex].album.coverImageUrl ? (
                  <img
                    src={candidates[selectedIndex].album.coverImageUrl}
                    alt={`${candidates[selectedIndex].album.artist} - ${candidates[selectedIndex].album.album}`}
                    className="w-full object-contain"
                  />
                ) : candidates[selectedIndex].album.thumbUrl ? (
                  <img
                    src={candidates[selectedIndex].album.thumbUrl}
                    alt={`${candidates[selectedIndex].album.artist} - ${candidates[selectedIndex].album.album}`}
                    className="w-full object-contain"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No image</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Match Candidates */}
        <div className="space-y-3 mb-6">
          {candidates.map((candidate, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={`${candidate.album.discogsId}-${index}`}
                onClick={() => setSelectedIndex(index)}
                className={`w-full rounded-lg p-4 flex items-center gap-4 transition-colors text-left border-2 ${
                  isSelected
                    ? "bg-blue-600/30 border-blue-500 hover:bg-blue-600/40"
                    : "bg-gray-700 hover:bg-gray-600 border-transparent hover:border-gray-500"
                }`}
              >
              <div className="flex-shrink-0">
                {candidate.album.coverImageUrl ? (
                  <img
                    src={candidate.album.coverImageUrl}
                    alt={`${candidate.album.artist} - ${candidate.album.album}`}
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : candidate.album.thumbUrl ? (
                  <img
                    src={candidate.album.thumbUrl}
                    alt={`${candidate.album.artist} - ${candidate.album.album}`}
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-600 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No image</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">
                  {candidate.album.album}
                </div>
                <div className="text-gray-300 text-sm truncate">
                  {candidate.album.artist}
                </div>
                {candidate.album.year && (
                  <div className="text-gray-400 text-xs mt-1">
                    {candidate.album.year}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <div
                  className={`text-sm font-semibold ${getConfidenceColor(
                    candidate.confidence
                  )}`}
                >
                  {getConfidenceLabel(candidate.confidence)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {Math.round(candidate.similarity * 100)}% match
                </div>
              </div>
            </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => onSelect(candidates[selectedIndex])}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-colors"
          >
            Confirm Selection
          </button>
          <button
            onClick={onUseGemini}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-colors"
          >
            Try Gemini
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to confirm, Esc to cancel
        </p>
      </div>
    </div>
  );
}
