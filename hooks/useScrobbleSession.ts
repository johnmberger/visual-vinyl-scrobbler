"use client";

import { useState, useCallback } from "react";
import type {
  LastFmVerification,
  PendingScrobble,
  ScrobbleSuccess,
  TracklistSide,
} from "@/lib/scrobbleTypes";

/**
 * Shared Last.fm verify + Discogs tracklist + scrobble POST.
 * Used by CameraView and LibraryView so juniors only learn this once.
 */
export function useScrobbleSession() {
  const [lastFmVerification, setLastFmVerification] =
    useState<LastFmVerification | null>(null);
  const [tracklistSides, setTracklistSides] = useState<TracklistSide[]>([]);
  const [selectedSides, setSelectedSides] = useState<Set<string>>(new Set());
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [isLoadingTracklist, setIsLoadingTracklist] = useState(false);
  const [isScrobbling, setIsScrobbling] = useState(false);
  const [scrobbleTimestamp, setScrobbleTimestamp] = useState(
    Math.floor(Date.now() / 1000)
  );
  const [scrobbleSuccess, setScrobbleSuccess] =
    useState<ScrobbleSuccess | null>(null);

  const resetSession = useCallback(() => {
    setLastFmVerification(null);
    setTracklistSides([]);
    setSelectedSides(new Set());
    setIsLoadingVerification(false);
    setIsLoadingTracklist(false);
  }, []);

  const loadVerificationAndTracklist = useCallback(
    async (artist: string, albumTitle: string, releaseId?: number) => {
      setLastFmVerification(null);
      setIsLoadingVerification(true);
      try {
        const verifyResponse = await fetch("/api/verify-lastfm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artist, album: albumTitle }),
        });
        if (verifyResponse.ok) {
          setLastFmVerification(await verifyResponse.json());
        }
      } catch (err) {
        console.warn("Could not verify with Last.fm:", err);
      } finally {
        setIsLoadingVerification(false);
      }

      setTracklistSides([]);
      setSelectedSides(new Set());
      if (releaseId) {
        setIsLoadingTracklist(true);
        try {
          const tracklistResponse = await fetch(
            `/api/discogs/tracklist?releaseId=${releaseId}`
          );
          if (tracklistResponse.ok) {
            const tracklistData = await tracklistResponse.json();
            if (tracklistData.sides?.length > 0) {
              setTracklistSides(tracklistData.sides);
              setSelectedSides(
                new Set(
                  tracklistData.sides.map((s: { side: string }) => s.side)
                )
              );
            }
          }
        } catch (err) {
          console.warn("Could not fetch tracklist:", err);
        } finally {
          setIsLoadingTracklist(false);
        }
      } else {
        setIsLoadingTracklist(false);
      }
    },
    []
  );

  const beginSession = useCallback(
    async (pending: Pick<PendingScrobble, "artist" | "albumTitle" | "discogsRelease">) => {
      setScrobbleTimestamp(Math.floor(Date.now() / 1000));
      const releaseId =
        pending.discogsRelease?.basic_information?.id ||
        pending.discogsRelease?.id;
      await loadVerificationAndTracklist(
        pending.artist,
        pending.albumTitle,
        releaseId
      );
    },
    [loadVerificationAndTracklist]
  );

  const scrobble = useCallback(
    async (opts: {
      artist: string;
      albumTitle: string;
      discogsRelease?: any;
    }): Promise<{ ok: true; trackCount?: number } | { ok: false; error: string }> => {
      if (tracklistSides.length > 0 && selectedSides.size === 0) {
        return { ok: false, error: "Please select at least one side to scrobble" };
      }

      setIsScrobbling(true);
      try {
        const response = await fetch("/api/scrobble", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artist: opts.artist,
            album: opts.albumTitle,
            timestamp: scrobbleTimestamp,
            discogsRelease: opts.discogsRelease,
            selectedSides:
              tracklistSides.length > 0
                ? Array.from(selectedSides)
                : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to scrobble to Last.fm");
        }

        let trackCount: number | undefined;
        if (tracklistSides.length > 0 && selectedSides.size > 0) {
          trackCount = Array.from(selectedSides).reduce((total, side) => {
            const sideData = tracklistSides.find((s) => s.side === side);
            return total + (sideData?.tracks.length || 0);
          }, 0);
        }

        setScrobbleSuccess({
          artist: opts.artist,
          album: opts.albumTitle,
          trackCount,
        });
        setTimeout(() => setScrobbleSuccess(null), 5000);

        return { ok: true, trackCount };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error ? err.message : "Failed to scrobble to Last.fm",
        };
      } finally {
        setIsScrobbling(false);
      }
    },
    [tracklistSides, selectedSides, scrobbleTimestamp]
  );

  return {
    lastFmVerification,
    tracklistSides,
    selectedSides,
    setSelectedSides,
    isLoadingVerification,
    isLoadingTracklist,
    isScrobbling,
    scrobbleTimestamp,
    setScrobbleTimestamp,
    scrobbleSuccess,
    setScrobbleSuccess,
    beginSession,
    loadVerificationAndTracklist,
    scrobble,
    resetSession,
  };
}
