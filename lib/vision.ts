// Image recognition using Google Cloud Vision API
// Note: This requires setting up Google Cloud Vision API and credentials

export interface ExtractedText {
  text: string;
  confidence: number;
}

export async function extractTextFromImage(
  imageData: string | Buffer
): Promise<ExtractedText[]> {
  try {
    // For client-side usage, we'll send the image to our API route
    const response = await fetch("/api/vision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image:
          typeof imageData === "string"
            ? imageData
            : imageData.toString("base64"),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to extract text from image");
    }

    const data = await response.json();
    return data.textAnnotations || [];
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return [];
  }
}

export function parseAlbumInfo(text: string): {
  artist?: string;
  album?: string;
} {
  // Simple parsing logic - extract artist and album from OCR text
  // This is a basic implementation - you may want to improve it
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  // Common patterns: "Artist Name" on first line, "Album Title" on second
  // or "Artist - Album" format
  let artist: string | undefined;
  let album: string | undefined;

  if (lines.length >= 2) {
    artist = lines[0].trim();
    album = lines[1].trim();
  } else if (lines.length === 1) {
    // Try to split on common separators
    const parts = lines[0].split(/[-–—]/);
    if (parts.length >= 2) {
      artist = parts[0].trim();
      album = parts.slice(1).join(" ").trim();
    } else {
      album = lines[0].trim();
    }
  }

  return { artist, album };
}
