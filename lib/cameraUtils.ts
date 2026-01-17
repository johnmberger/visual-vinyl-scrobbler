/**
 * Utility functions for camera error handling
 */

/**
 * Formats a camera error into a user-friendly message
 */
export function formatCameraError(error: any): string {
  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Camera permission denied. Please allow camera access in your browser settings.";
  } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No camera found. Please connect a camera and try again.";
  } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "Camera is already in use by another application.";
  } else if (
    error.name === "OverconstrainedError" ||
    error.name === "ConstraintNotSatisfiedError"
  ) {
    return "Camera doesn't support the requested settings. Trying with default settings...";
  } else if (error.message) {
    return error.message;
  }
  return "Failed to access camera.";
}
