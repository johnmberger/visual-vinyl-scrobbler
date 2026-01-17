"use client";

interface LastFmVerificationStatusProps {
  verified: boolean;
  message?: string;
  trackName?: string;
  isSingleTrack?: boolean;
}

export default function LastFmVerificationStatus({
  verified,
  message,
  trackName,
  isSingleTrack,
}: LastFmVerificationStatusProps) {
  return (
    <div
      className={`mb-4 p-3 rounded text-sm ${
        verified
          ? "bg-green-900/50 border border-green-600 text-green-200"
          : "bg-yellow-900/50 border border-yellow-600 text-yellow-200"
      }`}
    >
      <div className="flex items-center gap-2">
        {verified ? (
          <svg
            className="w-5 h-5 flex-shrink-0 text-green-400"
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
        ) : (
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        <p className="font-semibold">
          {verified ? "Verified on Last.fm" : "Not found on Last.fm"}
        </p>
      </div>
    </div>
  );
}
