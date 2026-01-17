"use client";

interface RecognitionErrorModalProps {
  error: {
    type: "hash" | "ocr" | "parsing" | "not_found" | "general";
    message: string;
    capturedImage?: string;
    debugInfo?: {
      closestMatches?: Array<{
        artist: string;
        album: string;
        distance: number;
        similarity: number;
      }>;
      message?: string;
    };
  };
  onRetry: () => void;
  onCancel: () => void;
  onManualEntry?: () => void;
}

export default function RecognitionErrorModal({
  error,
  onRetry,
  onCancel,
  onManualEntry,
}: RecognitionErrorModalProps) {
  const getErrorIcon = () => {
    switch (error.type) {
      case "hash":
        return (
          <svg
            className="w-12 h-12 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case "ocr":
        return (
          <svg
            className="w-12 h-12 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-12 h-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case "hash":
        return "Image Matching Failed";
      case "ocr":
        return "Text Recognition Failed";
      case "parsing":
        return "Could Not Parse Album Info";
      case "not_found":
        return "Album Not Found";
      default:
        return "Recognition Failed";
    }
  };

  const getSuggestions = () => {
    switch (error.type) {
      case "hash":
        return [
          "Make sure the album cover is centered in the frame",
          "Try better lighting - avoid shadows and glare",
          "Ensure the cover is flat and not at an angle",
          "Rebuild your database with image hashes enabled",
          "Try capturing again - sometimes a second attempt works",
        ];
      case "ocr":
        return [
          "Ensure text on the cover is clearly visible",
          "Try better lighting to improve text clarity",
          "Make sure the cover is in focus",
          "Check that the album is in your Discogs collection",
          "Try scrobbling from the Library view instead",
        ];
      case "parsing":
        return [
          "Make sure artist and album name are clearly visible",
          "Try better lighting to improve text clarity",
          "Ensure the cover is flat and not at an angle",
          "Try scrobbling from the Library view instead",
        ];
      case "not_found":
        return [
          "Verify the album is in your Discogs collection",
          "Check that artist and album names match exactly",
          "Try scrobbling from the Library view instead",
        ];
      default:
        return [
          "Try capturing again with better lighting",
          "Ensure the cover is clearly visible and in focus",
          "Try scrobbling from the Library view instead",
        ];
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">{getErrorIcon()}</div>
          <div className="flex-1">
            <h3 className="text-2xl font-semibold text-white mb-2">
              {getErrorTitle()}
            </h3>
            <p className="text-gray-300">{error.message}</p>
          </div>
        </div>

        {/* Captured Image Preview */}
        {error.capturedImage && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-400 mb-2">
              Captured Image:
            </p>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
              <img
                src={error.capturedImage}
                alt="Captured album cover"
                className="w-full max-w-xs mx-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* Debug Info - Show closest matches if available */}
        {error.debugInfo?.closestMatches && error.debugInfo.closestMatches.length > 0 && (
          <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <p className="text-sm font-semibold text-gray-300 mb-2">
              Closest Matches Found:
            </p>
            <p className="text-xs text-gray-400 mb-3">
              {error.debugInfo.message}
            </p>
            <div className="space-y-2">
              {error.debugInfo.closestMatches.slice(0, 3).map((match, idx) => (
                <div
                  key={idx}
                  className="text-xs text-gray-400 flex items-center justify-between"
                >
                  <span>
                    {match.artist} - {match.album}
                  </span>
                  <span className="text-gray-500">
                    {match.distance} bits ({Math.round(match.similarity * 100)}%)
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Tip: If your album appears here, try improving lighting or rebuilding
              the database with fresh hashes.
            </p>
          </div>
        )}

        {/* Suggestions */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-300 mb-3">
            Suggestions:
          </p>
          <ul className="space-y-2">
            {getSuggestions().map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="text-blue-500 mt-1">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
          {onManualEntry && (
            <button
              onClick={onManualEntry}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Use Library
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
