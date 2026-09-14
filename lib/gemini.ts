/**
 * Google Gemini Vision for album recognition.
 * Prefer a shortlist (embedding candidates) over the full collection to cut tokens.
 */

import { config } from "./config";

export interface GeminiAlbumCandidate {
  discogsId?: number;
  artist: string;
  album: string;
  confidence: "high" | "medium" | "low";
}

export interface GeminiAlbumInfo {
  artist?: string;
  album?: string;
  discogsId?: number;
  confidence?: "high" | "medium" | "low";
  candidates?: GeminiAlbumCandidate[];
}

export interface CollectionAlbumRef {
  discogsId: number;
  artist: string;
  album: string;
}

/** Compact schema — ask for candidates only when the shortlist is ambiguous. */
function buildResponseSchema(includeCandidates: boolean) {
  const properties: Record<string, unknown> = {
    discogsId: { type: "NUMBER", nullable: true },
    artist: { type: "STRING" },
    album: { type: "STRING" },
    confidence: {
      type: "STRING",
      enum: ["high", "medium", "low"],
    },
  };

  if (includeCandidates) {
    properties.candidates = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          discogsId: { type: "NUMBER", nullable: true },
          artist: { type: "STRING" },
          album: { type: "STRING" },
          confidence: {
            type: "STRING",
            enum: ["high", "medium", "low"],
          },
        },
        required: ["artist", "album", "confidence"],
      },
    };
  }

  return {
    type: "OBJECT",
    properties,
    required: ["artist", "album", "confidence"],
  };
}

function formatCollectionLines(albums: CollectionAlbumRef[]): string {
  // Compact: id|artist|album — fewer tokens than prose bullets
  return albums
    .map((a) => `${a.discogsId}|${a.artist}|${a.album}`)
    .join("\n");
}

function buildPrompt(
  collection?: CollectionAlbumRef[],
  options?: { shortlist?: boolean }
): string {
  if (collection && collection.length > 0) {
    const list = formatCollectionLines(collection);
    if (options?.shortlist) {
      return `Vinyl cover photo. Pick the matching row (id|artist|album). Return that discogsId.
${list}
confidence: high/medium/low. JSON only.`;
    }

    return `Vinyl cover photo from this collection. Pick matching id|artist|album row when possible.
${list}
Return discogsId from list if match; else null + best artist/album guess. confidence high/medium/low. JSON only.`;
  }

  return `Identify vinyl album cover. Return exact artist + album + confidence high/medium/low. JSON only.`;
}

function parseGeminiJson(text: string): GeminiAlbumInfo | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const artist = typeof parsed.artist === "string" ? parsed.artist.trim() : "";
    const album = typeof parsed.album === "string" ? parsed.album.trim() : "";
    if (!artist || !album) return null;

    const confidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "medium";

    const candidates: GeminiAlbumCandidate[] = Array.isArray(parsed.candidates)
      ? parsed.candidates
          .filter(
            (c: any) =>
              typeof c?.artist === "string" && typeof c?.album === "string"
          )
          .map((c: any) => ({
            artist: c.artist.trim(),
            album: c.album.trim(),
            discogsId:
              typeof c.discogsId === "number" ? c.discogsId : undefined,
            confidence:
              c.confidence === "high" ||
              c.confidence === "medium" ||
              c.confidence === "low"
                ? c.confidence
                : "low",
          }))
      : [];

    return {
      artist,
      album,
      discogsId:
        typeof parsed.discogsId === "number" ? parsed.discogsId : undefined,
      confidence,
      candidates,
    };
  } catch {
    return null;
  }
}

export type IdentifyOptions = {
  /** Prefer over full collection — embedding top-N or UI candidates */
  shortlist?: CollectionAlbumRef[];
  /** Full collection fallback when no shortlist */
  collection?: CollectionAlbumRef[];
};

/**
 * Identify an album from an image.
 * Token strategy: shortlist ≪ full collection ≪ unconstrained.
 */
export async function identifyAlbumWithGemini(
  imageData: string | Buffer,
  options?: IdentifyOptions | CollectionAlbumRef[]
): Promise<GeminiAlbumInfo | null> {
  if (!config.gemini.apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Back-compat: second arg used to be collection array
  const opts: IdentifyOptions = Array.isArray(options)
    ? { collection: options }
    : options || {};

  const shortlist = opts.shortlist?.filter((a) => a.discogsId != null);
  const useShortlist = shortlist && shortlist.length > 0;
  const albums = useShortlist
    ? shortlist!
    : opts.collection && opts.collection.length > 0
      ? opts.collection
      : undefined;

  const includeCandidates = !useShortlist || (shortlist?.length ?? 0) > 3;

  const base64Image =
    typeof imageData === "string"
      ? imageData.replace(/^data:image\/\w+;base64,/, "")
      : imageData.toString("base64");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.visionModel}:generateContent?key=${config.gemini.apiKey}`,
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
                text: buildPrompt(albums, { shortlist: !!useShortlist }),
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
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: buildResponseSchema(includeCandidates),
          // Gemini 3.x Flash-Lite: minimal thinking = cheapest structured ID
          thinkingConfig: {
            thinkingLevel: "minimal",
          },
          maxOutputTokens: includeCandidates ? 320 : 128,
        },
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
  const textResponse =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!textResponse) {
    return null;
  }

  return parseGeminiJson(textResponse);
}
