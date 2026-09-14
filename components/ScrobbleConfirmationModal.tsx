"use client";

import LastFmVerificationStatus from "./LastFmVerificationStatus";
import AlbumInfoCard from "./AlbumInfoCard";
import TracklistSideSelector from "./TracklistSideSelector";
import TimestampPicker from "./TimestampPicker";
import Modal from "./ui/Modal";
import { buttonClass } from "./ui/buttonClasses";
import {
  LastFmVerificationSkeleton,
  TracklistSkeleton,
} from "./SkeletonLoader";
import type {
  LastFmVerification,
  PendingScrobble,
  TracklistSide,
} from "@/lib/scrobbleTypes";

interface ScrobbleConfirmationModalProps {
  pendingScrobble: PendingScrobble;
  lastFmVerification: LastFmVerification | null;
  tracklistSides: TracklistSide[];
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
    <Modal
      onClose={onCancel}
      closeOnEscape={!isScrobbling}
      maxWidthClass="max-w-5xl"
      panelClassName="p-5 max-h-[95vh] overflow-hidden flex flex-col"
    >
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
                isLoading={isLoadingTracklist}
              />
            )}

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

      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
        <button
          onClick={onConfirm}
          disabled={isScrobbling}
          className={buttonClass("primary", { block: true })}
        >
          {isScrobbling ? "Scrobbling..." : "Confirm & Scrobble"}
        </button>
        <button
          onClick={onCancel}
          disabled={isScrobbling}
          className={buttonClass("secondary")}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
