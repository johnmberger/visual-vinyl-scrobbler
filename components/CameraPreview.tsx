"use client";

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCapturing: boolean;
  isProcessing: boolean;
  cameraStatus: string;
  matchConfidence?: number | null;
  consecutiveMatches?: number;
}

export default function CameraPreview({
  videoRef,
  canvasRef,
  isCapturing,
  isProcessing,
  cameraStatus,
  matchConfidence,
  consecutiveMatches = 0,
}: CameraPreviewProps) {
  const isReadyToCapture =
    matchConfidence !== null &&
    matchConfidence >= 0.85 && // Very high confidence required (85%+) to prevent false captures
    consecutiveMatches >= 1;
  
  // Show green outline for any hash match (even if not ready for auto-capture)
  const hasMatch = matchConfidence !== null && matchConfidence >= 0.7;
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
        style={{ transform: "scaleX(-1)" }} // Mirror the video for better UX
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
              Click "Start Camera" to begin
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
            {/* Corner guides */}
            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-white/50 rounded-tl-lg"></div>
            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-white/50 rounded-tr-lg"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-white/50 rounded-bl-lg"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-white/50 rounded-br-lg"></div>

            {/* Center square guide - position album here */}
            {/* Square guide for square album covers */}
            <div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[75%] aspect-square max-w-lg border-4 rounded-lg shadow-lg transition-all duration-300 ${
                isReadyToCapture
                  ? "border-green-500 shadow-green-500/50"
                  : hasMatch
                  ? "border-green-400/60 shadow-green-400/30"
                  : "border-white/70"
              }`}
            >
              {/* Inner guide for precise positioning */}
              <div
                className={`absolute inset-3 border-2 rounded transition-all duration-300 ${
                  isReadyToCapture
                    ? "border-green-400/70"
                    : hasMatch
                    ? "border-green-300/50"
                    : "border-white/50"
                }`}
              ></div>
              {/* Match indicator */}
              {isReadyToCapture && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
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
                  <span className="text-sm font-semibold">
                    Ready! ({Math.round((matchConfidence || 0) * 100)}% match)
                  </span>
                </div>
              )}
              {/* Show match confidence even if not ready for auto-capture */}
              {hasMatch && !isReadyToCapture && matchConfidence !== null && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-500/80 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {Math.round(matchConfidence * 100)}% match
                  </span>
                </div>
              )}
            </div>

            {/* Instruction text */}
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-black/80 px-4 py-2 rounded-lg backdrop-blur-sm z-10">
              <p className="text-white text-sm font-semibold text-center">
                Position album cover in the center area
              </p>
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
