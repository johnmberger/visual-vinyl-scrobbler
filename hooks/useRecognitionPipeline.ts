"use client";

import { useState, useCallback, RefObject } from "react";
import { MatchCandidate } from "@/components/MatchSelectionModal";
import { albumCoverToDiscogsRelease } from "@/lib/database";
import { EMBEDDING_SHORTLIST_MIN } from "@/lib/recognitionConstants";
import { cropImageFromVideo } from "@/lib/imageUtils";
import type { PendingScrobble, RecognitionError } from "@/lib/scrobbleTypes";
import { useScrobbleSession } from "@/hooks/useScrobbleSession";

export type { RecognitionError } from "@/lib/scrobbleTypes";

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stopCamera: () => void;
};

/**
 * Hybrid recognition: embedding → candidate picker → Gemini,
 * then shared scrobble session (verify / tracklist / POST).
 */
export function useRecognitionPipeline({
  videoRef,
  canvasRef,
  stopCamera,
}: Options) {
  const {
    beginSession,
    resetSession,
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
    scrobble,
  } = useScrobbleSession();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);
  const [embeddingSimilarity, setEmbeddingSimilarity] = useState<number | null>(
    null
  );
  const [pendingScrobble, setPendingScrobble] =
    useState<PendingScrobble | null>(null);
  const [matchCandidates, setMatchCandidates] = useState<{
    image: string;
    candidates: MatchCandidate[];
    allowGemini: boolean;
  } | null>(null);
  const [recognitionError, setRecognitionError] =
    useState<RecognitionError | null>(null);

  const openScrobbleFlow = useCallback(
    async (opts: {
      artist: string;
      albumTitle: string;
      image: string;
      matchMethod: string;
      confidence?: string;
      discogsRelease: any;
    }) => {
      stopCamera();
      setPendingScrobble({
        artist: opts.artist,
        album: opts.albumTitle,
        albumTitle: opts.albumTitle,
        image: opts.image,
        matchMethod: opts.matchMethod,
        confidence: opts.confidence,
        discogsRelease: opts.discogsRelease,
      });
      await beginSession({
        artist: opts.artist,
        albumTitle: opts.albumTitle,
        discogsRelease: opts.discogsRelease,
      });
      setTimeout(() => setIsProcessing(false), 100);
    },
    [stopCamera, beginSession]
  );

  const runGeminiIdentify = useCallback(
    async (
      imageData: string,
      shortlistIds?: number[]
    ): Promise<boolean> => {
      const geminiResponse = await fetch("/api/gemini/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData,
          ...(shortlistIds && shortlistIds.length > 0
            ? { shortlistIds }
            : {}),
        }),
      });

      if (geminiResponse.status === 503) {
        stopCamera();
        setIsProcessing(false);
        setRecognitionError({
          type: "gemini",
          message:
            "Gemini API is not configured. Please add GEMINI_API_KEY to your .env.local file.",
          capturedImage: imageData,
        });
        return false;
      }

      if (!geminiResponse.ok) {
        throw new Error("Gemini API failed");
      }

      const geminiData = await geminiResponse.json();
      if (!geminiData.success || !geminiData.artist || !geminiData.album) {
        throw new Error("Gemini could not identify the album");
      }

      if (geminiData.matchedAlbum) {
        await openScrobbleFlow({
          artist:
            geminiData.matchedAlbum.basic_information.artists[0]?.name ||
            geminiData.artist,
          albumTitle:
            geminiData.matchedAlbum.basic_information.title ||
            geminiData.album,
          image: imageData,
          matchMethod: "gemini",
          confidence: geminiData.confidence,
          discogsRelease: geminiData.matchedAlbum,
        });
        return true;
      }

      const geminiCandidates: MatchCandidate[] = (geminiData.candidates || [])
        .filter((c: any) => typeof c.discogsId === "number")
        .map((c: any) => ({
          album: {
            discogsId: c.discogsId,
            artist: c.artist,
            album: c.album,
          },
          confidence: c.confidence || "low",
          source: "gemini" as const,
        }));

      if (geminiCandidates.length > 1 && geminiData.confidence !== "high") {
        const enriched: MatchCandidate[] = [];
        for (const c of geminiCandidates.slice(0, 4)) {
          try {
            const r = await fetch("/api/match-album", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ discogsId: c.album.discogsId }),
            });
            if (r.ok) {
              const data = await r.json();
              enriched.push({
                ...c,
                album: {
                  discogsId: data.album.basic_information.id,
                  masterId: data.album.basic_information.master_id,
                  artist: data.artist,
                  album: data.albumTitle,
                  year: data.album.basic_information.year,
                  coverImageUrl: data.album.basic_information.cover_image,
                  thumbUrl: data.album.basic_information.thumb,
                },
              });
            }
          } catch {
            // skip
          }
        }
        if (enriched.length > 1) {
          stopCamera();
          setIsProcessing(false);
          setMatchCandidates({
            image: imageData,
            candidates: enriched,
            allowGemini: false,
          });
          return true;
        }
      }

      const matchResponse = await fetch("/api/match-album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist: geminiData.artist,
          album: geminiData.album,
          discogsId: geminiData.discogsId ?? undefined,
        }),
      });

      if (!matchResponse.ok) {
        stopCamera();
        setIsProcessing(false);
        setRecognitionError({
          type: "not_found",
          message: `Identified as "${geminiData.artist} - ${geminiData.album}", but it's not in your Discogs collection.`,
          capturedImage: imageData,
        });
        return false;
      }

      const matchData = await matchResponse.json();
      await openScrobbleFlow({
        artist: matchData.artist,
        albumTitle: matchData.albumTitle,
        image: imageData,
        matchMethod: "gemini",
        confidence: geminiData.confidence,
        discogsRelease: matchData.album,
      });
      return true;
    },
    [openScrobbleFlow, stopCamera]
  );

  const processSelectedMatch = useCallback(
    async (candidate: MatchCandidate, imageData: string) => {
      setMatchCandidates(null);
      setIsProcessing(true);
      await openScrobbleFlow({
        artist: candidate.album.artist,
        albumTitle: candidate.album.album,
        image: imageData,
        matchMethod: candidate.source === "gemini" ? "gemini" : "embedding",
        confidence: candidate.confidence,
        discogsRelease: albumCoverToDiscogsRelease(candidate.album),
      });
    },
    [openScrobbleFlow]
  );

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setIsCapturingFrame(false);
    setRecognitionError(null);

    try {
      const imageData = cropImageFromVideo(videoRef.current, canvasRef.current);
      let geminiShortlistIds: number[] | undefined;

      try {
        const imageMatchResponse = await fetch("/api/match-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageData }),
        });

        if (imageMatchResponse.ok) {
          const imageMatch = await imageMatchResponse.json();

          if (!imageMatch.noEmbeddings && imageMatch.matches?.length > 0) {
            setEmbeddingSimilarity(imageMatch.match?.similarity ?? null);

            if (imageMatch.autoAccept && imageMatch.match?.album) {
              await openScrobbleFlow({
                artist: imageMatch.match.album.artist,
                albumTitle: imageMatch.match.album.album,
                image: imageData,
                matchMethod: "embedding",
                confidence: imageMatch.match.confidence,
                discogsRelease: albumCoverToDiscogsRelease(
                  imageMatch.match.album
                ),
              });
              return;
            }

            if (imageMatch.showCandidates && imageMatch.matches.length >= 1) {
              stopCamera();
              setIsProcessing(false);
              setMatchCandidates({
                image: imageData,
                candidates: imageMatch.matches.map(
                  (m: {
                    album: MatchCandidate["album"];
                    similarity: number;
                    confidence: MatchCandidate["confidence"];
                  }) => ({
                    album: m.album,
                    similarity: m.similarity,
                    confidence: m.confidence,
                    source: "embedding" as const,
                  })
                ),
                allowGemini: true,
              });
              return;
            }

            const topSimilarity = imageMatch.matches[0]?.similarity ?? 0;
            if (topSimilarity >= EMBEDDING_SHORTLIST_MIN) {
              geminiShortlistIds = imageMatch.matches
                .slice(0, 8)
                .map((m: { album: { discogsId: number } }) => m.album.discogsId)
                .filter((id: number) => typeof id === "number");
            }
          }
        }
      } catch (err) {
        console.warn("Embedding match skipped:", err);
      }

      await runGeminiIdentify(imageData, geminiShortlistIds);
    } catch (err) {
      console.error("Error processing image:", err);
      stopCamera();
      setIsProcessing(false);

      let capturedImage: string | undefined;
      try {
        if (videoRef.current && canvasRef.current) {
          capturedImage = cropImageFromVideo(
            videoRef.current,
            canvasRef.current
          );
        }
      } catch {
        // ignore
      }

      setRecognitionError({
        type: "general",
        message:
          err instanceof Error
            ? err.message
            : "Failed to process image. Please try again.",
        capturedImage,
      });
    }
  }, [
    videoRef,
    canvasRef,
    openScrobbleFlow,
    runGeminiIdentify,
    stopCamera,
  ]);

  return {
    // Recognition
    isProcessing,
    isCapturingFrame,
    embeddingSimilarity,
    setEmbeddingSimilarity,
    pendingScrobble,
    matchCandidates,
    recognitionError,
    captureAndProcess,
    processSelectedMatch,
    runGeminiIdentify,
    clearPendingScrobble: () => {
      setPendingScrobble(null);
      setEmbeddingSimilarity(null);
      resetSession();
    },
    clearMatchCandidates: () => {
      setMatchCandidates(null);
      setIsProcessing(false);
    },
    clearRecognitionError: () => setRecognitionError(null),
    markCapturingFrame: () => setIsCapturingFrame(true),
    setMatchCandidates,
    setIsProcessing,
    setRecognitionError,
    // Shared scrobble session
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
    scrobble,
  };
}
