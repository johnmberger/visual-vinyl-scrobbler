"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import CameraPreview from "./CameraPreview";
import ScrobbleSuccessToast from "./ScrobbleSuccessToast";
import ScrobbleConfirmationModal from "./ScrobbleConfirmationModal";
import RecognitionErrorModal from "./RecognitionErrorModal";

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
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [isLoadingTracklist, setIsLoadingTracklist] = useState(false);
  const [scrobbleSuccess, setScrobbleSuccess] = useState<{
    artist: string;
    album: string;
    trackCount?: number;
  } | null>(null);
  const [recognitionError, setRecognitionError] = useState<{
    type: "hash" | "not_found" | "general" | "gemini";
    message: string;
    capturedImage?: string;
    debugInfo?: {
      closestMatches?: Array<{
        artist: string;
        album: string;
        distance: number;
        similarity: number;
      }>;
      message?: string;
    };
  } | null>(null);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [matchConfidence, setMatchConfidence] = useState<number | null>(null);
  const [consecutiveMatches, setConsecutiveMatches] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const matchingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const matchingStartTimeRef = useRef<number | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      // Video element should always be available now (always rendered)
      if (!videoRef.current) {
        console.error("Video element not available!");
        throw new Error("Video element not available");
      }

      const video = videoRef.current;

      // Set the stream - this should trigger autoplay
      video.srcObject = stream;
      streamRef.current = stream;

      // Mark as capturing - video element is already rendered, just hidden
      setIsCapturing(true);
      setCameraStatus("");

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
    // Clear matching interval
    if (matchingIntervalRef.current) {
      clearInterval(matchingIntervalRef.current);
      matchingIntervalRef.current = null;
    }
    // Clear fallback timeout when camera stops
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    matchingStartTimeRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setIsMatching(false);
    setMatchConfidence(null);
    setConsecutiveMatches(0);
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

      // Crop to the square overlay area (75% width, centered, square aspect ratio)
      // The square is centered and takes up 75% of the width
      const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.75;
      const cropX = (video.videoWidth - cropSize) / 2;
      const cropY = (video.videoHeight - cropSize) / 2;

      // Create a new canvas for the cropped image
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = cropSize;
      croppedCanvas.height = cropSize;
      const croppedContext = croppedCanvas.getContext("2d");

      if (!croppedContext) {
        throw new Error("Could not get cropped canvas context");
      }

      // Draw the cropped region to the new canvas
      croppedContext.drawImage(
        canvas,
        cropX,
        cropY,
        cropSize,
        cropSize,
        0,
        0,
        cropSize,
        cropSize
      );

      // Convert cropped image to base64
      const imageData = croppedCanvas.toDataURL("image/jpeg", 0.8);

      // Try image matching first (if database has hashes)
      let matchData = null;
      let hashMatchFailed = false;
      try {
        const imageMatchResponse = await fetch("/api/match-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: imageData }),
        });

        // Always parse response (now returns 200 even when no match)
        const imageMatch = await imageMatchResponse.json();
        
        // Check if database has no hashes - this is expected, just fall through to Gemini
        if (imageMatch.noHashes || imageMatch.error?.includes("No albums with image hashes")) {
          // Database doesn't have hashes - this is expected, not an error
          // Just fall through to Gemini
          hashMatchFailed = false;
        } else if (imageMatchResponse.ok && imageMatch.success && imageMatch.match?.similarity >= 0.7) {
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
        } else if (imageMatch.error?.includes("No matching album found")) {
          // Hash matching tried but no match found - this is expected, fall through to Gemini
          hashMatchFailed = true;
        } else {
          // Other case - no match found, fall through to Gemini
          hashMatchFailed = true;
        }
      } catch (err) {
        hashMatchFailed = true;
      }

      // Fall back to Gemini if image matching didn't work
      if (!matchData) {
        // Try Gemini as fallback
        try {
          const geminiResponse = await fetch("/api/gemini/identify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ image: imageData }),
          });

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            if (geminiData.success && geminiData.artist && geminiData.album) {
              // Try to match the Gemini-identified album with Discogs
              // Pass artist and album separately for better matching
              const geminiMatchResponse = await fetch("/api/match-album", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  artist: geminiData.artist,
                  album: geminiData.album,
                }),
              });

              if (geminiMatchResponse.ok) {
                matchData = await geminiMatchResponse.json();
                matchData.matchMethod = "gemini";
                matchData.geminiIdentified = {
                  artist: geminiData.artist,
                  album: geminiData.album,
                };
              } else {
                // Gemini identified it but not in collection
                stopCamera();
                setIsProcessing(false);
                setRecognitionError({
                  type: "not_found",
                  message: `Gemini identified this as "${geminiData.artist} - ${geminiData.album}", but it's not in your Discogs collection. Please verify the album is in your collection.`,
                  capturedImage: imageData,
                });
                return;
              }
            } else {
              // Gemini couldn't identify it
              throw new Error("Gemini could not identify the album");
            }
          } else if (geminiResponse.status === 503) {
            // Gemini not configured
            const geminiErrorData = await geminiResponse.json().catch(() => ({}));
            console.warn("Gemini not available:", geminiErrorData.error);
            // Show error
            stopCamera();
            setIsProcessing(false);
            setRecognitionError({
              type: "gemini",
              message:
                "Gemini API is not configured. Please add GEMINI_API_KEY to your .env.local file. Hash matching failed and Gemini is required as a fallback.",
              capturedImage: imageData,
            });
            return;
          } else {
            throw new Error("Gemini API failed");
          }
        } catch (geminiError) {
          // Gemini fallback failed
          console.error("Gemini fallback failed:", geminiError);
          stopCamera();
          setIsProcessing(false);
          setRecognitionError({
            type: "gemini",
            message:
              hashMatchFailed
                ? "Hash matching failed and Gemini could not identify the album. Please try again with better lighting or ensure Gemini API is configured."
                : "Gemini could not identify the album. Please try again with better lighting or ensure the album cover is clearly visible.",
            capturedImage: imageData,
          });
          return;
        }
      }

      // Stop camera before showing confirmation
      stopCamera();

      // Show modal immediately, then load data with skeletons
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

      // Verify album exists on Last.fm before showing confirmation
      setLastFmVerification(null);
      setIsLoadingVerification(true);
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
      } finally {
        setIsLoadingVerification(false);
      }

      // Fetch tracklist if we have a Discogs release ID
      setTracklistSides([]);
      setSelectedSides(new Set());
      if (matchData.album?.basic_information?.id) {
        setIsLoadingTracklist(true);
        try {
          const tracklistResponse = await fetch(
            `/api/discogs/tracklist?releaseId=${matchData.album.basic_information.id}`
          );
          if (tracklistResponse.ok) {
            const tracklistData = await tracklistResponse.json();

            if (tracklistData.sides && tracklistData.sides.length > 0) {
              setTracklistSides(tracklistData.sides);
              // Select all sides by default
              setSelectedSides(
                new Set(tracklistData.sides.map((s: any) => s.side))
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
        } finally {
          setIsLoadingTracklist(false);
        }
      }

      // Keep processing state until modal is ready (setTimeout ensures modal renders first)
      setTimeout(() => {
        setIsProcessing(false);
      }, 100);
    } catch (err) {
      console.error("Error processing image:", err);
      stopCamera();
      setIsProcessing(false);
      
      // Try to capture image for error display
      let capturedImage: string | undefined;
      try {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const context = canvas.getContext("2d");
          if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            
            // Crop to the square overlay area for error display
            const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.75;
            const cropX = (video.videoWidth - cropSize) / 2;
            const cropY = (video.videoHeight - cropSize) / 2;

            const croppedCanvas = document.createElement("canvas");
            croppedCanvas.width = cropSize;
            croppedCanvas.height = cropSize;
            const croppedContext = croppedCanvas.getContext("2d");

            if (croppedContext) {
              croppedContext.drawImage(
                canvas,
                cropX,
                cropY,
                cropSize,
                cropSize,
                0,
                0,
                cropSize,
                cropSize
              );
              capturedImage = croppedCanvas.toDataURL("image/jpeg", 0.8);
            } else {
              capturedImage = canvas.toDataURL("image/jpeg", 0.8);
            }
          }
        }
      } catch {
        // Ignore errors capturing image for display
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
  }, [stopCamera]);

  // Continuous matching for auto-capture
  useEffect(() => {
    // Only run if auto-capture is enabled, camera is capturing
    // Don't check isProcessing here - we want the timeout to fire even if processing starts
    if (
      !autoCaptureEnabled ||
      !isCapturing ||
      pendingScrobble !== null ||
      !videoRef.current ||
      !canvasRef.current
    ) {
      // Clear interval and timeout if conditions not met
      if (matchingIntervalRef.current) {
        clearInterval(matchingIntervalRef.current);
        matchingIntervalRef.current = null;
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      matchingStartTimeRef.current = null;
      setMatchConfidence(null);
      setConsecutiveMatches(0);
      return;
    }
    
    // If already processing, don't start new matching but preserve the timeout
    // The timeout should still fire to trigger Gemini fallback
    if (isProcessing) {
      // Don't clear timeout - let it fire to trigger Gemini
      return;
    }

    // Start tracking matching time and set timeout if not already set
    if (matchingStartTimeRef.current === null) {
      matchingStartTimeRef.current = Date.now();
      console.log("⏱️ Started matching timer - will auto-capture after 5s if no hash match");
    }
    
    // Set timeout if not already set
    if (!fallbackTimeoutRef.current) {
      // Set timeout to automatically capture and send to Gemini after 5 seconds of no hash match
      const timeoutId = setTimeout(() => {
        // Check if timeout was cleared (if fallbackTimeoutRef.current !== timeoutId, it was cleared)
        if (fallbackTimeoutRef.current !== timeoutId) {
          console.log("⏱️ Timeout was cleared before firing");
          return;
        }
        
        // Check current state - use refs to avoid stale closure
        // If we've been trying for 5+ seconds without a hash match, automatically capture and send to Gemini
        if (videoRef.current && canvasRef.current) {
          // Clear the matching interval
          if (matchingIntervalRef.current) {
            clearInterval(matchingIntervalRef.current);
            matchingIntervalRef.current = null;
          }
          // Clear timeout ref
          fallbackTimeoutRef.current = null;
          // Reset matching state
          matchingStartTimeRef.current = null;
          setMatchConfidence(null);
          setConsecutiveMatches(0);
          // Automatically capture and process (will try hash first quickly, then fall back to Gemini)
          console.log("⏱️ Timeout reached (5s) - automatically capturing and sending to Gemini");
          captureAndProcess();
        } else {
          console.log("⏱️ Timeout reached but video/canvas not available");
          fallbackTimeoutRef.current = null;
        }
      }, 5000); // 5 seconds timeout
      
      fallbackTimeoutRef.current = timeoutId;
      console.log("⏱️ Timeout set for 5 seconds");
    }

    // Sample frames every 1.5 seconds for matching
    matchingIntervalRef.current = setInterval(async () => {
      // Skip if already matching or processing or if scrobble is pending
      if (isMatching || isProcessing || pendingScrobble !== null) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }

      setIsMatching(true);

      try {
        const context = canvas.getContext("2d");
        if (!context) {
          setIsMatching(false);
          return;
        }

        // Capture current frame
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        // Crop to the square overlay area (75% width, centered, square aspect ratio)
        const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.75;
        const cropX = (video.videoWidth - cropSize) / 2;
        const cropY = (video.videoHeight - cropSize) / 2;

        // Create a new canvas for the cropped image
        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = cropSize;
        croppedCanvas.height = cropSize;
        const croppedContext = croppedCanvas.getContext("2d");

        if (!croppedContext) {
          setIsMatching(false);
          return;
        }

        // Draw the cropped region to the new canvas
        croppedContext.drawImage(
          canvas,
          cropX,
          cropY,
          cropSize,
          cropSize,
          0,
          0,
          cropSize,
          cropSize
        );

        const imageData = croppedCanvas.toDataURL("image/jpeg", 0.8);

        // Try image matching
        try {
          const imageMatchResponse = await fetch("/api/match-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ image: imageData }),
          });

          // Always parse response (now returns 200 even when no match)
          const imageMatch = await imageMatchResponse.json();
          
          // Check if database has no hashes - this is expected, just continue trying
          if (imageMatch.noHashes) {
            console.log("📸 No hashes in database - will fall back to Gemini after timeout");
            setMatchConfidence(null);
            setConsecutiveMatches(0);
            return;
          }
          
          // Check if no match found - this is expected, timeout will trigger fallback
          if (!imageMatch.success) {
            console.log("📸 No hash match found - will fall back to Gemini after timeout");
            setMatchConfidence(null);
            setConsecutiveMatches(0);
            return;
          }
          
          // Check if we got a successful match
          if (imageMatchResponse.ok && imageMatch.success && imageMatch.match?.similarity >= 0.7) {
            const similarity = imageMatch.match.similarity;
            setMatchConfidence(similarity);

            // Auto-capture requires very high confidence (85%+) to prevent false captures
            if (similarity >= 0.85) {
              const newConsecutive = consecutiveMatches + 1;
              setConsecutiveMatches(newConsecutive);

              // Auto-capture after 2 consecutive high-confidence matches
              if (newConsecutive >= 2) {
                // Clear interval and timeout before capturing
                if (matchingIntervalRef.current) {
                  clearInterval(matchingIntervalRef.current);
                  matchingIntervalRef.current = null;
                }
                if (fallbackTimeoutRef.current) {
                  clearTimeout(fallbackTimeoutRef.current);
                  fallbackTimeoutRef.current = null;
                }
                matchingStartTimeRef.current = null;
                // Trigger capture
                captureAndProcess();
                return;
              }
            } else {
              // Reset consecutive matches if confidence drops
              setConsecutiveMatches(0);
            }
          } else {
            // No good match found - keep trying, timeout will trigger fallback
            setMatchConfidence(null);
            setConsecutiveMatches(0);
          }
        } catch (err) {
          // Image matching failed (maybe no hashes in database)
          setMatchConfidence(null);
          setConsecutiveMatches(0);
        }
      } catch (err) {
        console.error("Error in continuous matching:", err);
      } finally {
        setIsMatching(false);
      }
    }, 1500); // Sample every 1.5 seconds

    // Cleanup on unmount or when conditions change
    return () => {
      if (matchingIntervalRef.current) {
        clearInterval(matchingIntervalRef.current);
        matchingIntervalRef.current = null;
      }
      // Don't clear timeout here - let it fire to trigger Gemini fallback
      // The timeout will clear itself when it fires, or when camera stops
      // matchingStartTimeRef.current = null; // Don't reset - timeout needs to know when it started
    };
  }, [
    autoCaptureEnabled,
    isCapturing,
    pendingScrobble,
    isMatching,
    consecutiveMatches,
    captureAndProcess,
    // Note: isProcessing is intentionally NOT in dependencies
    // We check it inside the effect but don't want to re-run the effect when it changes
    // This allows the timeout to fire even when processing starts
  ]);

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
          matchConfidence={matchConfidence}
          consecutiveMatches={consecutiveMatches}
        />

        {/* Controls */}
        {!isCapturing ? (
          <button
            onClick={startCamera}
            className="w-full py-4 bg-green-600 hover:bg-green-700 active:scale-[0.98] rounded-lg font-semibold text-lg transition-all duration-150 shadow-lg hover:shadow-green-500/20"
          >
            Start Camera
          </button>
        ) : (
          <div className="space-y-3">
            {/* Auto-capture toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-all duration-150">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-300">
                  Auto-capture
                </span>
                {matchConfidence !== null && matchConfidence > 0.75 && (
                  <span className="text-xs text-green-400">
                    ({Math.round(matchConfidence * 100)}% match)
                  </span>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCaptureEnabled}
                  onChange={(e) => {
                    setAutoCaptureEnabled(e.target.checked);
                    setMatchConfidence(null);
                    setConsecutiveMatches(0);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={captureAndProcess}
                disabled={isProcessing || autoCaptureEnabled}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:bg-gray-600 disabled:cursor-not-allowed disabled:active:scale-100 rounded-lg font-semibold text-lg transition-all duration-150 shadow-lg hover:shadow-blue-500/20"
              >
                {isProcessing ? "Processing..." : "Capture Album"}
              </button>
              <button
                onClick={stopCamera}
                disabled={isProcessing}
                className="px-6 py-4 bg-red-600 hover:bg-red-700 active:scale-[0.98] disabled:bg-gray-600 disabled:cursor-not-allowed disabled:active:scale-100 rounded-lg font-semibold transition-all duration-150"
              >
                Stop
              </button>
            </div>
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

        {/* Recognition Error Modal */}
        {recognitionError && (
          <RecognitionErrorModal
            error={recognitionError}
            onRetry={() => {
              setRecognitionError(null);
              // Restart camera for retry
              startCamera();
            }}
            onCancel={() => {
              setRecognitionError(null);
            }}
            onManualEntry={() => {
              setRecognitionError(null);
              // Scroll to top and show a message that user should use Library view
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
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
            isLoadingVerification={isLoadingVerification}
            isLoadingTracklist={isLoadingTracklist}
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
              setMatchConfidence(null);
              setConsecutiveMatches(0);
              // Camera is already stopped, user can restart if needed
            }}
            isScrobbling={isScrobbling}
          />
        )}
      </div>
    </div>
  );
}
