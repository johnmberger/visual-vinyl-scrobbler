import { useState, useRef, useCallback, useEffect } from "react";
import { formatCameraError } from "@/lib/cameraUtils";

interface UseCameraReturn {
  isCapturing: boolean;
  error: string | null;
  cameraStatus: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(): UseCameraReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
      const errorMessage = formatCameraError(err);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    isCapturing,
    error,
    cameraStatus,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
  };
}
