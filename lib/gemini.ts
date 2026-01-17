// Google Gemini Vision API for album recognition
// Uses Gemini to identify albums from images when other methods fail

import { config } from "./config";

export interface GeminiAlbumInfo {
  artist?: string;
  album?: string;
  confidence?: string;
}

/**
 * Use Gemini Vision API to identify an album from an image
 */
export async function identifyAlbumWithGemini(
  imageData: string | Buffer
): Promise<GeminiAlbumInfo | null> {
  if (!config.gemini.apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    // Convert image to base64 if it's a Buffer
    const base64Image =
      typeof imageData === "string"
        ? imageData.replace(/^data:image\/\w+;base64,/, "")
        : imageData.toString("base64");

    // Use Gemini API via fetch (no need for SDK, simpler)
    // Using gemini-2.5-flash (gemini-1.5-flash is retired)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.gemini.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Look at this album cover image and identify the artist name and album title. 

Important: Use the EXACT artist and album names as they appear on the cover. Do not abbreviate or modify names.

Please respond ONLY with a JSON object in this exact format:
{
  "artist": "Artist Name",
  "album": "Album Title"
}

If you cannot identify both the artist and album, respond with an empty object: {}

Do not include any other text, explanations, or markdown formatting. Just the JSON object.`,
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Gemini API error: ${response.status}`
      );
    }

    const data = await response.json();

    // Extract the text response
    const textResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!textResponse) {
      return null;
    }

    // Try to parse JSON from the response
    // Gemini might wrap it in markdown or add extra text
    let jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to extract artist and album from natural language response
      const artistMatch = textResponse.match(/artist["\s:]+"([^"]+)"/i);
      const albumMatch = textResponse.match(/album["\s:]+"([^"]+)"/i);
      
      if (artistMatch && albumMatch) {
        return {
          artist: artistMatch[1].trim(),
          album: albumMatch[1].trim(),
        };
      }
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (parsed.artist && parsed.album) {
      return {
        artist: parsed.artist.trim(),
        album: parsed.album.trim(),
      };
    }

    return null;
  } catch (error) {
    console.error("Error identifying album with Gemini:", error);
    throw error;
  }
}
