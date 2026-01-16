"use client";

interface ScrobbleSuccessToastProps {
  artist: string;
  album: string;
  trackCount?: number;
  onClose: () => void;
}

export default function ScrobbleSuccessToast({
  artist,
  album,
  trackCount,
  onClose,
}: ScrobbleSuccessToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5">
      <div className="bg-green-600 text-white rounded-lg shadow-lg p-4 min-w-[300px] max-w-md border border-green-500">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg mb-1">
              Successfully scrobbled!
            </p>
            <p className="text-green-50 text-sm">
              {artist} - {album}
            </p>
            {trackCount !== undefined && (
              <p className="text-green-100 text-xs mt-1">
                {trackCount} track{trackCount !== 1 ? "s" : ""} scrobbled
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
