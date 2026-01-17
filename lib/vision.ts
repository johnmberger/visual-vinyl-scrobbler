// Text parsing utilities for album identification
// Used to parse artist and album names from text (e.g., from Gemini API responses)

export function parseAlbumInfo(text: string): {
  artist?: string;
  album?: string;
} {
  // Simple parsing logic - extract artist and album from text
  // Handles formats like "Artist - Album" or "Artist\nAlbum"
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
