"use client";

import { useState } from "react";
import LastFmVerificationStatus from "./LastFmVerificationStatus";
import AlbumInfoCard from "./AlbumInfoCard";
import TracklistSideSelector from "./TracklistSideSelector";
import TimestampPicker from "./TimestampPicker";
import {
  LastFmVerificationSkeleton,
  AlbumArtSkeleton,
  AlbumInfoSkeleton,
  TracklistSkeleton,
} from "./SkeletonLoader";

interface Track {
  position: string;
  title: string;
  duration?: string;
}

interface Side {
  side: string;
  tracks: Track[];
  label: string;
}

interface LastFmVerification {
  verified: boolean;
  message?: string;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  hasTracklist?: boolean;
  trackCount?: number;
  isSingleTrack?: boolean;
}

interface PendingScrobble {
  artist: string;
  album: string;
  albumTitle: string;
  image?: string;
  matchMethod?: string;
  confidence?: string;
  discogsRelease?: any;
}

interface ScrobbleConfirmationModalProps {
  pendingScrobble: PendingScrobble;
  lastFmVerification: LastFmVerification | null;
  tracklistSides: Side[];
  selectedSides: Set<string>;
  onSelectionChange: (selectedSides: Set<string>) => void;
  scrobbleTimestamp: number;
  onTimestampChange: (timestamp: number) => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isScrobbling: boolean;
  isLoadingVerification?: boolean;
  isLoadingTracklist?: boolean;
}

export default function ScrobbleConfirmationModal({
  pendingScrobble,
  lastFmVerification,
  tracklistSides,
  selectedSides,
  onSelectionChange,
  scrobbleTimestamp,
  onTimestampChange,
  onConfirm,
  onCancel,
  isScrobbling,
  isLoadingVerification = false,
  isLoadingTracklist = false,
}: ScrobbleConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-5 max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Last.fm Verification Status - Full Width */}
        {isLoadingVerification ? (
          <LastFmVerificationSkeleton />
        ) : lastFmVerification ? (
          <LastFmVerificationStatus
            verified={lastFmVerification.verified}
            message={lastFmVerification.message}
            trackName={lastFmVerification.trackName}
            isSingleTrack={lastFmVerification.isSingleTrack}
          />
        ) : null}

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column: Album Info & Art */}
            <AlbumInfoCard
              artist={pendingScrobble.artist}
              albumTitle={pendingScrobble.albumTitle}
              coverImage={
                pendingScrobble.discogsRelease?.basic_information?.cover_image
              }
              thumb={pendingScrobble.discogsRelease?.basic_information?.thumb}
              matchMethod={pendingScrobble.matchMethod}
              confidence={pendingScrobble.confidence}
            />

            {/* Right Column: Tracklist */}
            <div className="lg:col-span-2">
              {isLoadingTracklist ? (
                <TracklistSkeleton />
              ) : (
                <TracklistSideSelector
                  sides={tracklistSides}
                  selectedSides={selectedSides}
                  onSelectionChange={onSelectionChange}
                  releaseId={
                    pendingScrobble.discogsRelease?.basic_information?.id
                  }
                />
              )}

              {/* Timestamp Picker - Below tracklist */}
              <div className="mt-4">
                <TimestampPicker
                  initialTimestamp={scrobbleTimestamp}
                  onTimestampChange={onTimestampChange}
                  label="Scrobble Time"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={onConfirm}
            disabled={isScrobbling}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {isScrobbling ? "Scrobbling..." : "Confirm & Scrobble"}
          </button>
          <button
            onClick={onCancel}
            disabled={isScrobbling}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
