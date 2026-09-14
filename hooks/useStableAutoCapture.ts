"use client";

import { useEffect, useRef, RefObject } from "react";
import {
  getFrameFingerprint,
  isStableCoverFrame,
  type FrameFingerprint,
} from "@/lib/imageUtils";

type Options = {
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onStable: () => void;
  onStableCountChange?: (count: number) => void;
  /** Samples needed before firing (~250ms each). Default 3 ≈ 0.75s still. */
  requiredStableSamples?: number;
  /** Delay after enable before watching frames. Default 800ms. */
  settleMs?: number;
  sampleMs?: number;
};

/**
 * Watches the camera crop region and calls onStable once a cover-like
 * frame stays still for several consecutive samples.
 */
export function useStableAutoCapture({
  enabled,
  videoRef,
  canvasRef,
  onStable,
  onStableCountChange,
  requiredStableSamples = 3,
  settleMs = 800,
  sampleMs = 250,
}: Options) {
  const previousFingerprintRef = useRef<FrameFingerprint | null>(null);
  const stableCountRef = useRef(0);
  const hasTriggeredRef = useRef(false);
  const onStableRef = useRef(onStable);
  const onCountRef = useRef(onStableCountChange);

  useEffect(() => {
    onStableRef.current = onStable;
    onCountRef.current = onStableCountChange;
  }, [onStable, onStableCountChange]);

  useEffect(() => {
    if (!enabled || !videoRef.current || !canvasRef.current) {
      previousFingerprintRef.current = null;
      stableCountRef.current = 0;
      hasTriggeredRef.current = false;
      onCountRef.current?.(0);
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        if (hasTriggeredRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const fp = getFrameFingerprint(video, canvas);
        if (!fp) return;

        const stable = isStableCoverFrame(fp, previousFingerprintRef.current);
        previousFingerprintRef.current = fp;

        if (stable) {
          stableCountRef.current += 1;
          onCountRef.current?.(stableCountRef.current);
          if (stableCountRef.current >= requiredStableSamples) {
            hasTriggeredRef.current = true;
            onStableRef.current();
          }
        } else {
          stableCountRef.current = 0;
          onCountRef.current?.(0);
        }
      }, sampleMs);
    }, settleMs);

    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
      previousFingerprintRef.current = null;
      stableCountRef.current = 0;
      hasTriggeredRef.current = false;
    };
  }, [
    enabled,
    videoRef,
    canvasRef,
    requiredStableSamples,
    settleMs,
    sampleMs,
  ]);
}
