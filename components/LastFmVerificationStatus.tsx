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
      <p className="font-semibold">
        {verified ? "✓ Verified on Last.fm" : "⚠ Not found on Last.fm"}
      </p>
      {message && <p className="text-xs mt-1">{message}</p>}
      {isSingleTrack && trackName && (
        <p className="text-xs mt-1">Will scrobble as: "{trackName}"</p>
      )}
    </div>
  );
}
