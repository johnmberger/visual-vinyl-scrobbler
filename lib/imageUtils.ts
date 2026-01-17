/**
 * Utility functions for image processing
 */

/**
 * Crops an image from a video element to a square area (75% of min dimension, centered)
 * @param video - The video element to capture from
 * @param canvas - The canvas element to draw to
 * @returns Base64 encoded JPEG image data URL
 */
export function cropImageFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string {
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
  return croppedCanvas.toDataURL("image/jpeg", 0.8);
}
