"use client";

import { useState, useCallback, useEffect } from "react";
import CameraPreview from "./CameraPreview";
import ScrobbleSuccessToast from "./ScrobbleSuccessToast";
import ScrobbleConfirmationModal from "./ScrobbleConfirmationModal";
import RecognitionErrorModal from "./RecognitionErrorModal";
import MatchSelectionModal from "./MatchSelectionModal";
import StatusBanner from "./ui/StatusBanner";
import { buttonClass } from "./ui/buttonClasses";
import { useCamera } from "@/hooks/useCamera";
import { useRecognitionPipeline } from "@/hooks/useRecognitionPipeline";
import { useStableAutoCapture } from "@/hooks/useStableAutoCapture";

/**
 * Camera tab UI. Recognition + scrobble logic live in hooks so this file
 * stays mostly layout / wiring (easier for juniors to follow).
 */
export default function CameraView() {
  const {
    isCapturing,
    error: cameraError,
    cameraStatus,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera: stopCameraHook,
  } = useCamera();

  const [error, setError] = useState<string | null>(null);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [stableFrameCount, setStableFrameCount] = useState(0);

  const stopCamera = useCallback(() => {
    stopCameraHook();
    setStableFrameCount(0);
  }, [stopCameraHook]);

  const recognition = useRecognitionPipeline({
    videoRef,
    canvasRef,
    stopCamera,
  });

  useEffect(() => {
    if (cameraError) setError(cameraError);
  }, [cameraError]);

  useStableAutoCapture({
    enabled:
      autoCaptureEnabled &&
      isCapturing &&
      !recognition.isProcessing &&
      recognition.pendingScrobble === null &&
      recognition.matchCandidates === null,
    videoRef,
    canvasRef,
    onStableCountChange: setStableFrameCount,
    onStable: () => {
      recognition.markCapturingFrame();
      recognition.captureAndProcess();
    },
  });

  const handleConfirmScrobble = async () => {
    const pending = recognition.pendingScrobble;
    if (!pending) return;

    const result = await recognition.scrobble({
      artist: pending.artist,
      albumTitle: pending.albumTitle,
      discogsRelease: pending.discogsRelease,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    recognition.clearPendingScrobble();
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-2xl font-semibold mb-4">Camera View</h2>

        <CameraPreview
          videoRef={videoRef}
          canvasRef={canvasRef}
          isCapturing={isCapturing}
          isProcessing={
            recognition.isProcessing && recognition.pendingScrobble === null
          }
          cameraStatus={cameraStatus}
          embeddingSimilarity={recognition.embeddingSimilarity}
          stableFrameCount={stableFrameCount}
          isCapturingFrame={recognition.isCapturingFrame}
        />

        {!isCapturing ? (
          <button
            onClick={startCamera}
            className={buttonClass("primary", {
              size: "lg",
              block: true,
              className: "bg-green-600 hover:bg-green-700 hover:shadow-green-500/20",
            })}
          >
            Start Camera
          </button>
        ) : (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-600 bg-gray-700/50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">
                  Auto-capture
                </span>
                {stableFrameCount > 0 && (
                  <span className="text-xs text-green-400">
                    (holding still…)
                  </span>
                )}
                {recognition.embeddingSimilarity != null &&
                  recognition.embeddingSimilarity > 0.7 && (
                    <span className="text-xs text-green-400">
                      (
                      {Math.round(recognition.embeddingSimilarity * 100)}
                      % visual)
                    </span>
                  )}
              </div>
              <span className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={autoCaptureEnabled}
                  onChange={(e) => {
                    setAutoCaptureEnabled(e.target.checked);
                    recognition.setEmbeddingSimilarity(null);
                    setStableFrameCount(0);
                  }}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 rounded-full bg-gray-600 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800" />
              </span>
            </label>

            <div className="flex gap-4">
              <button
                onClick={recognition.captureAndProcess}
                disabled={recognition.isProcessing || autoCaptureEnabled}
                className={buttonClass("primary", { size: "lg", block: true })}
              >
                {recognition.isProcessing ? "Processing..." : "Capture Album"}
              </button>
              <button
                onClick={stopCamera}
                disabled={recognition.isProcessing}
                className={buttonClass("danger", { size: "lg" })}
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {error && (
          <StatusBanner variant="error" title="Camera Error" className="mt-4">
            <p className="mb-2">{error}</p>
            <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
              <li>Use HTTPS (https://localhost:3000)</li>
              <li>Allow camera permissions</li>
              <li>Close other apps using the camera</li>
            </ul>
          </StatusBanner>
        )}

        {recognition.scrobbleSuccess && (
          <ScrobbleSuccessToast
            artist={recognition.scrobbleSuccess.artist}
            album={recognition.scrobbleSuccess.album}
            trackCount={recognition.scrobbleSuccess.trackCount}
            onClose={() => recognition.setScrobbleSuccess(null)}
          />
        )}

        {recognition.matchCandidates && (
          <MatchSelectionModal
            capturedImage={recognition.matchCandidates.image}
            candidates={recognition.matchCandidates.candidates}
            subtitle={
              recognition.matchCandidates.allowGemini
                ? "Visual matching found these candidates. Confirm one or ask Gemini."
                : "Select the correct album from these candidates."
            }
            onSelect={(candidate) =>
              recognition.processSelectedMatch(
                candidate,
                recognition.matchCandidates!.image
              )
            }
            onUseGemini={
              recognition.matchCandidates.allowGemini
                ? async () => {
                    const image = recognition.matchCandidates!.image;
                    const shortlistIds =
                      recognition.matchCandidates!.candidates.map(
                        (c) => c.album.discogsId
                      );
                    recognition.clearMatchCandidates();
                    recognition.setIsProcessing(true);
                    try {
                      await recognition.runGeminiIdentify(image, shortlistIds);
                    } catch (err) {
                      console.error(err);
                      recognition.setIsProcessing(false);
                      recognition.setRecognitionError({
                        type: "gemini",
                        message:
                          "Gemini could not identify the album. Please try again with better lighting.",
                        capturedImage: image,
                      });
                    }
                  }
                : undefined
            }
            onCancel={() => {
              recognition.clearMatchCandidates();
              startCamera();
            }}
          />
        )}

        {recognition.recognitionError && (
          <RecognitionErrorModal
            error={recognition.recognitionError}
            onRetry={() => {
              recognition.clearRecognitionError();
              startCamera();
            }}
            onCancel={recognition.clearRecognitionError}
            onManualEntry={() => {
              recognition.clearRecognitionError();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {recognition.pendingScrobble && (
          <ScrobbleConfirmationModal
            pendingScrobble={recognition.pendingScrobble}
            lastFmVerification={recognition.lastFmVerification}
            tracklistSides={recognition.tracklistSides}
            selectedSides={recognition.selectedSides}
            onSelectionChange={recognition.setSelectedSides}
            scrobbleTimestamp={recognition.scrobbleTimestamp}
            onTimestampChange={recognition.setScrobbleTimestamp}
            isLoadingVerification={recognition.isLoadingVerification}
            isLoadingTracklist={recognition.isLoadingTracklist}
            onConfirm={handleConfirmScrobble}
            onCancel={() => {
              recognition.clearPendingScrobble();
              setError(null);
              setStableFrameCount(0);
            }}
            isScrobbling={recognition.isScrobbling}
          />
        )}
      </div>
    </div>
  );
}
