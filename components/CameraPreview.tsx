"use client";

import { useState, useEffect } from "react";

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCapturing: boolean;
  isProcessing: boolean;
  cameraStatus: string;
  /** Cosine similarity from embedding match (0–1), if any */
  embeddingSimilarity?: number | null;
  /** Consecutive stable cover frames during auto-capture */
  stableFrameCount?: number;
  /** True while a capture is being taken / sent for recognition */
  isCapturingFrame?: boolean;
}

export default function CameraPreview({
  videoRef,
  canvasRef,
  isCapturing,
  isProcessing,
  cameraStatus,
  embeddingSimilarity,
  stableFrameCount = 0,
  isCapturingFrame = false,
}: CameraPreviewProps) {
  const [videoDisplaySize, setVideoDisplaySize] = useState<{ width: number; height: number } | null>(null);

  // Calculate the actual displayed video size to match crop area
  useEffect(() => {
    if (!isCapturing || !videoRef.current) {
      setVideoDisplaySize(null);
      return;
    }

    const updateVideoSize = () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return;

      // Get the container dimensions
      const container = video.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Calculate displayed video size with object-contain
      // object-contain maintains aspect ratio and fits within container
      const videoAspect = video.videoWidth / video.videoHeight;
      const containerAspect = containerWidth / containerHeight;

      let displayedWidth: number;
      let displayedHeight: number;

      if (videoAspect > containerAspect) {
        // Video is wider - fit to width
        displayedWidth = containerWidth;
        displayedHeight = containerWidth / videoAspect;
      } else {
        // Video is taller - fit to height
        displayedHeight = containerHeight;
        displayedWidth = containerHeight * videoAspect;
      }

      setVideoDisplaySize({ width: displayedWidth, height: displayedHeight });
    };

    // Update on load and resize
    updateVideoSize();
    
    const video = videoRef.current;
    video.addEventListener("loadedmetadata", updateVideoSize);
    window.addEventListener("resize", updateVideoSize);
    
    // Use ResizeObserver for more accurate container size tracking
    const container = video.parentElement;
    let resizeObserver: ResizeObserver | null = null;
    if (container && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(updateVideoSize);
      resizeObserver.observe(container);
    }

    return () => {
      video.removeEventListener("loadedmetadata", updateVideoSize);
      window.removeEventListener("resize", updateVideoSize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isCapturing, videoRef]);

  const isReadyToCapture =
    embeddingSimilarity != null &&
    embeddingSimilarity >= 0.65 &&
    stableFrameCount >= 1;

  const hasMatch = embeddingSimilarity != null && embeddingSimilarity > 0;
  const shouldShowGreen =
    hasMatch || isCapturingFrame || stableFrameCount > 0;

  // Calculate guide size to match crop area (75% of minimum dimension, centered)
  // Use actual video dimensions for calculation, but position relative to displayed size
  const getGuideStyle = () => {
    if (!videoRef.current || !videoDisplaySize) {
      // Fallback to container-relative sizing
      return {
        width: "75%",
        height: "75%",
        left: "12.5%",
        top: "12.5%",
      };
    }

    const video = videoRef.current;
    const minDimension = Math.min(video.videoWidth, video.videoHeight);
    const cropSize = minDimension * 0.75;
    
    // Calculate crop size in displayed pixels
    const scaleX = videoDisplaySize.width / video.videoWidth;
    const scaleY = videoDisplaySize.height / video.videoHeight;
    const displayedCropSize = cropSize * Math.min(scaleX, scaleY);

    // Center the guide
    const left = (videoDisplaySize.width - displayedCropSize) / 2;
    const top = (videoDisplaySize.height - displayedCropSize) / 2;

    // Calculate offsets from container center
    const container = video.parentElement;
    if (!container) {
      return {
        width: "75%",
        height: "75%",
        left: "12.5%",
        top: "12.5%",
      };
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const offsetX = (containerWidth - videoDisplaySize.width) / 2;
    const offsetY = (containerHeight - videoDisplaySize.height) / 2;

    return {
      width: `${displayedCropSize}px`,
      height: `${displayedCropSize}px`,
      left: `${offsetX + left}px`,
      top: `${offsetY + top}px`,
    };
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4 border-2 border-gray-700">
      {/* Always render video element (hidden when not capturing) so ref is available */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-contain ${
          isCapturing ? "" : "hidden"
        }`}
        onLoadedMetadata={() => {
          // Video is ready
          if (videoRef.current) {
            videoRef.current.play().catch((err) => {
              console.warn("Play error in onLoadedMetadata:", err);
            });
          }
        }}
        onError={(e) => {
          console.error("Video error:", e);
        }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Placeholder when not capturing */}
      {!isCapturing && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gray-900">
          <div className="text-center p-8">
            <svg
              className="w-24 h-24 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-gray-400 text-lg mb-2">Camera Preview</p>
            <p className="text-gray-500 text-sm">
              Click &quot;Start Camera&quot; to begin
            </p>
            {cameraStatus && (
              <p className="text-blue-400 text-sm mt-2">{cameraStatus}</p>
            )}
          </div>
        </div>
      )}

      {/* Overlay guides - only show when capturing */}
      {isCapturing && (
        <>
          {/* Overlay guides to help center album cover */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Center square guide - position album here for optimal crop */}
            {/* Size matches the actual crop area: 75% of minimum video dimension, centered */}
            <div
              className={`absolute border-4 rounded-lg shadow-lg transition-all duration-300 ${
                shouldShowGreen
                  ? "border-green-500 shadow-green-500/50"
                  : "border-white/70"
              }`}
              style={getGuideStyle()}
            >
              {/* Top horizontal guide line - extends full width */}
              <div
                className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-0.5 w-screen h-0.5 transition-all duration-300 ${
                  shouldShowGreen
                    ? "bg-green-500"
                    : "bg-white/70"
                }`}
              />
              {/* Bottom horizontal guide line - extends full width */}
              <div
                className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-0.5 w-screen h-0.5 transition-all duration-300 ${
                  shouldShowGreen
                    ? "bg-green-500"
                    : "bg-white/70"
                }`}
              />
              {/* Match indicator - show for any embedding match */}
              {embeddingSimilarity != null && embeddingSimilarity > 0 && (
                <div className={`absolute -top-12 left-1/2 transform -translate-x-1/2 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 ${
                  isReadyToCapture 
                    ? "bg-green-600 animate-pulse px-4 py-2" 
                    : embeddingSimilarity >= 0.7
                    ? "bg-green-500/80"
                    : "bg-green-500/60"
                }`}>
                  {isReadyToCapture && (
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  <span className={`font-medium ${isReadyToCapture ? "text-sm font-semibold" : "text-xs"}`}>
                    {isReadyToCapture 
                      ? `Ready! (${Math.round(embeddingSimilarity * 100)}% match)`
                      : `${Math.round(embeddingSimilarity * 100)}% match`
                    }
                  </span>
                </div>
              )}
              {isCapturingFrame && embeddingSimilarity == null && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-500/80 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
                  <span className="text-xs font-medium">
                    Recognizing…
                  </span>
                </div>
              )}
            </div>

            {/* Processing overlay - stays until modal appears */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
