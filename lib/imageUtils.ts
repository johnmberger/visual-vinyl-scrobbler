/**
 * Client-side image utilities for capture and auto-capture gating.
 */

export interface FrameFingerprint {
  /** Downsampled grayscale pixels (0–255) */
  pixels: Uint8Array;
  /** Mean absolute pixel value — proxy for visual content */
  meanLuma: number;
  /** Average absolute difference from neighbor pixels — edge/texture energy */
  edgeEnergy: number;
}

const FINGERPRINT_SIZE = 32;

/** Max edge / JPEG quality for Gemini embed + vision (keeps image tokens low). */
export const AI_IMAGE_MAX_EDGE = 768;
export const AI_IMAGE_JPEG_QUALITY = 0.72;

function getCropRegion(video: HTMLVideoElement) {
  const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.75;
  const cropX = (video.videoWidth - cropSize) / 2;
  const cropY = (video.videoHeight - cropSize) / 2;
  return { cropSize, cropX, cropY };
}

/**
 * Encode a canvas to a small JPEG suitable for AI APIs.
 */
export function encodeCanvasForAi(
  source: HTMLCanvasElement,
  maxEdge = AI_IMAGE_MAX_EDGE,
  quality = AI_IMAGE_JPEG_QUALITY
): string {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));

  if (scale >= 1) {
    return source.toDataURL("image/jpeg", quality);
  }

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) {
    return source.toDataURL("image/jpeg", quality);
  }
  ctx.drawImage(source, 0, 0, w, h);
  return out.toDataURL("image/jpeg", quality);
}

/**
 * Crops an image from a video element to a square area (75% of min dimension, centered).
 * Output is downscaled for AI APIs (embed + vision).
 */
export function cropImageFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get canvas context");
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0);

  const { cropSize, cropX, cropY } = getCropRegion(video);

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cropSize;
  croppedCanvas.height = cropSize;
  const croppedContext = croppedCanvas.getContext("2d");

  if (!croppedContext) {
    throw new Error("Could not get cropped canvas context");
  }

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

  return encodeCanvasForAi(croppedCanvas);
}

/**
 * Build a tiny grayscale fingerprint of the crop region for stability checks.
 */
export function getFrameFingerprint(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): FrameFingerprint | null {
  if (video.readyState < video.HAVE_CURRENT_DATA) return null;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0);

  const { cropSize, cropX, cropY } = getCropRegion(video);

  const sample = document.createElement("canvas");
  sample.width = FINGERPRINT_SIZE;
  sample.height = FINGERPRINT_SIZE;
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) return null;

  sampleCtx.drawImage(
    canvas,
    cropX,
    cropY,
    cropSize,
    cropSize,
    0,
    0,
    FINGERPRINT_SIZE,
    FINGERPRINT_SIZE
  );

  const { data } = sampleCtx.getImageData(
    0,
    0,
    FINGERPRINT_SIZE,
    FINGERPRINT_SIZE
  );
  const pixels = new Uint8Array(FINGERPRINT_SIZE * FINGERPRINT_SIZE);
  let lumaSum = 0;
  let edgeSum = 0;
  let edgeCount = 0;

  for (let y = 0; y < FINGERPRINT_SIZE; y++) {
    for (let x = 0; x < FINGERPRINT_SIZE; x++) {
      const i = (y * FINGERPRINT_SIZE + x) * 4;
      const luma = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      );
      pixels[y * FINGERPRINT_SIZE + x] = luma;
      lumaSum += luma;

      if (x > 0) {
        edgeSum += Math.abs(luma - pixels[y * FINGERPRINT_SIZE + x - 1]);
        edgeCount++;
      }
      if (y > 0) {
        edgeSum += Math.abs(luma - pixels[(y - 1) * FINGERPRINT_SIZE + x]);
        edgeCount++;
      }
    }
  }

  return {
    pixels,
    meanLuma: lumaSum / pixels.length,
    edgeEnergy: edgeCount > 0 ? edgeSum / edgeCount : 0,
  };
}

/** Mean absolute difference between two fingerprints (0–255 scale). */
export function fingerprintDifference(
  a: FrameFingerprint,
  b: FrameFingerprint
): number {
  if (a.pixels.length !== b.pixels.length) return 255;
  let sum = 0;
  for (let i = 0; i < a.pixels.length; i++) {
    sum += Math.abs(a.pixels[i] - b.pixels[i]);
  }
  return sum / a.pixels.length;
}

/**
 * True when the crop looks like a real cover (not empty / solid color)
 * and consecutive frames are stable.
 */
export function isStableCoverFrame(
  current: FrameFingerprint,
  previous: FrameFingerprint | null,
  options?: {
    maxMotion?: number;
    minEdgeEnergy?: number;
    minLuma?: number;
    maxLuma?: number;
  }
): boolean {
  const maxMotion = options?.maxMotion ?? 8;
  const minEdgeEnergy = options?.minEdgeEnergy ?? 6;
  const minLuma = options?.minLuma ?? 15;
  const maxLuma = options?.maxLuma ?? 245;

  const hasContent =
    current.edgeEnergy >= minEdgeEnergy &&
    current.meanLuma >= minLuma &&
    current.meanLuma <= maxLuma;

  if (!hasContent) return false;
  if (!previous) return false;

  return fingerprintDifference(current, previous) <= maxMotion;
}
