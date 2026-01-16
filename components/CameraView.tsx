"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { extractTextFromImage, parseAlbumInfo } from "@/lib/vision";
import CameraPreview from "./CameraPreview";
import ScrobbleSuccessToast from "./ScrobbleSuccessToast";
import ScrobbleConfirmationModal from "./ScrobbleConfirmationModal";

export default function CameraView() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingScrobble, setPendingScrobble] = useState<{
    artist: string;
    album: string;
    albumTitle: string;
    image?: string;
    matchMethod?: string;
    confidence?: string;
    discogsRelease?: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<string>("");
  const [scrobbleTimestamp, setScrobbleTimestamp] = useState<number>(
    Math.floor(Date.now() / 1000)
  );
  const [isScrobbling, setIsScrobbling] = useState(false);
  const [lastFmVerification, setLastFmVerification] = useState<{
    verified: boolean;
    message?: string;
    trackName?: string;
    artistName?: string;
    albumName?: string;
    hasTracklist?: boolean;
    trackCount?: number;
    isSingleTrack?: boolean;
  } | null>(null);
  const [tracklistSides, setTracklistSides] = useState<
    Array<{
      side: string;
      tracks: Array<{
        position: string;
        title: string;
        duration?: string;
      }>;
      label: string;
    }>
  >([]);
  const [selectedSides, setSelectedSides] = useState<Set<string>>(new Set());
  const [scrobbleSuccess, setScrobbleSuccess] = useState<{
    artist: string;
    album: string;
    trackCount?: number;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check camera availability on mount
  useEffect(() => {
    const checkCameraAvailability = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Camera API not available. Make sure you're using HTTPS (https://localhost:3000)"
        );
        return;
      }

      // Check if we're on HTTPS
      if (
        window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost"
      ) {
        setError(
          "Camera requires HTTPS. Please use https://localhost:3000 or see HTTPS_SETUP.md"
        );
      }
    };

    checkCameraAvailability();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCameraStatus("Checking camera availability...");

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Camera API not available. Make sure you're using HTTPS and a modern browser."
        );
      }

      setCameraStatus("Requesting camera access...");

      // Try with environment camera first (for mobile), fallback to user camera
      let stream: MediaStream | null = null;
      let constraints = {
        video: {
          facingMode: "environment" as ConstrainDOMString,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (envError) {
        // Fallback to any available camera
        console.log("Environment camera not available, trying default camera");
        constraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      if (!stream) {
        throw new Error("Failed to get camera stream");
      }

      console.log(
        "Stream obtained, active tracks:",
        stream.getVideoTracks().length
      );

      // Video element should always be available now (always rendered)
      if (!videoRef.current) {
        console.error("Video element not available!");
        throw new Error("Video element not available");
      }

      const video = videoRef.current;
      console.log("Video element found, setting stream...");

      // Set the stream - this should trigger autoplay
      video.srcObject = stream;
      streamRef.current = stream;
      console.log("Stream set on video element");

      // Mark as capturing - video element is already rendered, just hidden
      setIsCapturing(true);
      setCameraStatus("");
      console.log("State updated - camera should be visible now");

      // Try to play
      video.play().catch((playError) => {
        console.warn("Video play (non-blocking):", playError);
      });
    } catch (err: any) {
      console.error("Error accessing camera:", err);

      let errorMessage = "Failed to access camera.";

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errorMessage =
          "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errorMessage =
          "No camera found. Please connect a camera and try again.";
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        errorMessage = "Camera is already in use by another application.";
      } else if (
        err.name === "OverconstrainedError" ||
        err.name === "ConstraintNotSatisfiedError"
      ) {
        errorMessage =
          "Camera doesn't support the requested settings. Trying with default settings...";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setCameraStatus("");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Capture the image first before stopping camera
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not get canvas context");
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0);

      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      // Try image matching first (if database has hashes)
      let matchData = null;
      try {
        const imageMatchResponse = await fetch("/api/match-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: imageData }),
        });

        if (imageMatchResponse.ok) {
          const imageMatch = await imageMatchResponse.json();
          if (imageMatch.success && imageMatch.match.similarity > 0.6) {
            // Good match found via image matching
            matchData = {
              artist: imageMatch.match.album.artist,
              albumTitle: imageMatch.match.album.album,
              album: {
                id: imageMatch.match.album.discogsId,
                basic_information: {
                  id: imageMatch.match.album.discogsId,
                  master_id: imageMatch.match.album.masterId || 0,
                  title: imageMatch.match.album.album,
                  artists: [{ name: imageMatch.match.album.artist }],
                  cover_image: imageMatch.match.album.coverImageUrl,
                  thumb: imageMatch.match.album.thumbUrl,
                  year: imageMatch.match.album.year || 0,
                  labels: imageMatch.match.album.labels.map((name: string) => ({
                    name,
                    catno: "",
                  })),
                  formats: imageMatch.match.album.formats.map(
                    (name: string) => ({ name, qty: "1" })
                  ),
                },
              },
              matchMethod: "image",
              confidence: imageMatch.match.confidence,
            };
          }
        }
      } catch (err) {
        console.log(
          "Image matching failed or not available, falling back to OCR:",
          err
        );
      }

      // Fall back to OCR if image matching didn't work
      if (!matchData) {
        // Extract text using Vision API
        const textAnnotations = await extractTextFromImage(imageData);

        if (textAnnotations.length === 0) {
          throw new Error(
            "No text found in image and image matching failed. Please try again with better lighting or rebuild the database with image hashes."
          );
        }

        // Google Vision API returns full text as first element, then individual words
        // Use the first element (full text) if available, otherwise combine all
        const fullText =
          textAnnotations.length > 0
            ? textAnnotations[0].text
            : textAnnotations.map((annotation) => annotation.text).join("\n");

        // Parse album info
        const { artist, album } = parseAlbumInfo(fullText);

        if (!artist || !album) {
          throw new Error(
            "Could not identify artist and album. Please ensure the album cover is clearly visible."
          );
        }

        // Match with Discogs collection
        const matchResponse = await fetch("/api/match-album", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: fullText }),
        });

        if (!matchResponse.ok) {
          const errorData = await matchResponse.json();
          throw new Error(errorData.error || "Album not found in collection");
        }

        matchData = await matchResponse.json();
        matchData.matchMethod = "ocr";
      }

      // Stop camera before showing confirmation
      stopCamera();

      // Verify album exists on Last.fm before showing confirmation
      setLastFmVerification(null);
      try {
        const verifyResponse = await fetch("/api/verify-lastfm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artist: matchData.artist,
            album: matchData.albumTitle,
          }),
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          setLastFmVerification(verifyData);
        }
      } catch (err) {
        console.warn("Could not verify with Last.fm:", err);
        // Continue anyway - verification is optional
      }

      // Fetch tracklist if we have a Discogs release ID
      setTracklistSides([]);
      setSelectedSides(new Set());
      if (matchData.album?.basic_information?.id) {
        try {
          console.log(
            "Fetching tracklist for release:",
            matchData.album.basic_information.id
          );
          const tracklistResponse = await fetch(
            `/api/discogs/tracklist?releaseId=${matchData.album.basic_information.id}`
          );
          if (tracklistResponse.ok) {
            const tracklistData = await tracklistResponse.json();
            console.log("Tracklist API response:", tracklistData);
            console.log("Debug info:", tracklistData.debug);

            if (tracklistData.sides && tracklistData.sides.length > 0) {
              console.log(
                `Found ${tracklistData.sides.length} sides:`,
                tracklistData.sides.map(
                  (s: any) => `${s.label} (${s.tracks.length} tracks)`
                )
              );
              setTracklistSides(tracklistData.sides);
              // Select all sides by default
              setSelectedSides(
                new Set(tracklistData.sides.map((s: any) => s.side))
              );
            } else {
              console.warn(
                "No sides found in tracklist data. Full response:",
                JSON.stringify(tracklistData, null, 2)
              );
              console.warn("Tracklist array:", tracklistData.tracklist);
              console.warn(
                "Tracklist length:",
                tracklistData.tracklist?.length
              );
            }
          } else {
            const errorData = await tracklistResponse.json().catch(() => ({}));
            console.error(
              "Failed to fetch tracklist:",
              tracklistResponse.status,
              errorData
            );
          }
        } catch (err) {
          console.error("Error fetching tracklist:", err);
          // Continue anyway - tracklist is optional
        }
      } else {
        console.warn(
          "No release ID available for tracklist fetch:",
          matchData.album
        );
      }

      // Show confirmation dialog instead of scrobbling immediately
      setPendingScrobble({
        artist: matchData.artist,
        album: matchData.albumTitle,
        albumTitle: matchData.albumTitle,
        image: imageData,
        matchMethod: matchData.matchMethod,
        confidence: matchData.confidence,
        discogsRelease: matchData.album,
      });

      // Reset timestamp to current time for the pending scrobble
      setScrobbleTimestamp(Math.floor(Date.now() / 1000));

      // Keep processing state until modal is ready (setTimeout ensures modal renders first)
      setTimeout(() => {
        setIsProcessing(false);
      }, 100);
    } catch (err) {
      console.error("Error processing image:", err);
      setError(err instanceof Error ? err.message : "Failed to process image");
      setIsProcessing(false);
    }
  }, [stopCamera]);

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-2xl font-semibold mb-4">Camera View</h2>

        {/* Camera Preview Pane */}
        <CameraPreview
          videoRef={videoRef}
          canvasRef={canvasRef}
          isCapturing={isCapturing}
          isProcessing={isProcessing && pendingScrobble === null}
          cameraStatus={cameraStatus}
        />

        {/* Controls */}
        {!isCapturing ? (
          <button
            onClick={startCamera}
            className="w-full py-4 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-lg transition-colors"
          >
            Start Camera
          </button>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={captureAndProcess}
              disabled={isProcessing}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors"
            >
              {isProcessing ? "Processing..." : "Capture Album"}
            </button>
            <button
              onClick={stopCamera}
              disabled={isProcessing}
              className="px-6 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              Stop
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-600 rounded-lg">
            <p className="text-red-200 font-semibold mb-2">Camera Error</p>
            <p className="text-red-200 text-sm">{error}</p>
            <div className="mt-3 text-xs text-red-300">
              <p className="mb-1">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Make sure you're using HTTPS (https://localhost:3000)</li>
                <li>Check browser permissions for camera access</li>
                <li>Try refreshing the page and allowing camera access</li>
                <li>Make sure no other app is using the camera</li>
                <li>Check browser console for detailed errors</li>
              </ul>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {scrobbleSuccess && (
          <ScrobbleSuccessToast
            artist={scrobbleSuccess.artist}
            album={scrobbleSuccess.album}
            trackCount={scrobbleSuccess.trackCount}
            onClose={() => setScrobbleSuccess(null)}
          />
        )}

        {/* Scrobble Confirmation Modal */}
        {pendingScrobble && (
          <ScrobbleConfirmationModal
            pendingScrobble={pendingScrobble}
            lastFmVerification={lastFmVerification}
            tracklistSides={tracklistSides}
            selectedSides={selectedSides}
            onSelectionChange={setSelectedSides}
            scrobbleTimestamp={scrobbleTimestamp}
            onTimestampChange={setScrobbleTimestamp}
            onConfirm={async () => {
              if (!pendingScrobble) return;

              // Check if sides are selected (if tracklist is available)
              if (tracklistSides.length > 0 && selectedSides.size === 0) {
                setError("Please select at least one side to scrobble");
                return;
              }

              setIsScrobbling(true);
              try {
                const scrobbleResponse = await fetch("/api/scrobble", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    artist: pendingScrobble.artist,
                    album: pendingScrobble.albumTitle,
                    timestamp: scrobbleTimestamp,
                    discogsRelease: pendingScrobble.discogsRelease,
                    selectedSides:
                      tracklistSides.length > 0
                        ? Array.from(selectedSides)
                        : undefined,
                  }),
                });

                if (!scrobbleResponse.ok) {
                  const errorData = await scrobbleResponse.json();
                  throw new Error(
                    errorData.error || "Failed to scrobble to Last.fm"
                  );
                }

                // Calculate track count
                let trackCount: number | undefined;
                if (tracklistSides.length > 0 && selectedSides.size > 0) {
                  trackCount = Array.from(selectedSides).reduce(
                    (total, side) => {
                      const sideData = tracklistSides.find(
                        (s) => s.side === side
                      );
                      return total + (sideData?.tracks.length || 0);
                    },
                    0
                  );
                }

                // Show success message
                setScrobbleSuccess({
                  artist: pendingScrobble.artist,
                  album: pendingScrobble.albumTitle,
                  trackCount,
                });

                // Close modal
                setPendingScrobble(null);

                // Auto-hide success message after 5 seconds
                setTimeout(() => {
                  setScrobbleSuccess(null);
                }, 5000);
              } catch (err) {
                console.error("Error scrobbling:", err);
                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to scrobble to Last.fm"
                );
              } finally {
                setIsScrobbling(false);
              }
            }}
            onCancel={() => {
              setPendingScrobble(null);
              setError(null);
              // Camera is already stopped, user can restart if needed
            }}
            isScrobbling={isScrobbling}
          />
        )}
      </div>
    </div>
  );
}
