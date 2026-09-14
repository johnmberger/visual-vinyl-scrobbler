/**
 * Visual embeddings via Gemini Embedding 2 (multimodal).
 * Used for cover-to-cover similarity search against the local collection DB.
 *
 * Cost note: one embedContent call per capture (image only). Prefer auto-accept
 * or the candidate picker so Gemini vision (much larger prompt) is skipped.
 */

import { config } from "./config";
import type { AlbumCover } from "./database";
import {
  EMBEDDING_AUTO_ACCEPT,
  EMBEDDING_AUTO_ACCEPT_GAP,
  EMBEDDING_CANDIDATE_MIN,
} from "./recognitionConstants";

export const EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 768;

export {
  EMBEDDING_AUTO_ACCEPT,
  EMBEDDING_AUTO_ACCEPT_GAP,
  EMBEDDING_CANDIDATE_MIN,
} from "./recognitionConstants";

export interface EmbeddingMatch {
  album: AlbumCover;
  similarity: number;
  confidence: "high" | "medium" | "low";
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function confidenceFromSimilarity(
  similarity: number,
  gapToSecond: number
): "high" | "medium" | "low" {
  if (similarity >= EMBEDDING_AUTO_ACCEPT && gapToSecond >= EMBEDDING_AUTO_ACCEPT_GAP) {
    return "high";
  }
  if (similarity >= 0.75) return "medium";
  return "low";
}

/**
 * Embed an image (base64 data URL, raw base64, or Buffer) with gemini-embedding-2.
 */
export async function embedImage(
  imageData: string | Buffer
): Promise<number[]> {
  if (!config.gemini.apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const base64Image =
    typeof imageData === "string"
      ? imageData.replace(/^data:image\/\w+;base64,/, "")
      : imageData.toString("base64");

  const mimeMatch =
    typeof imageData === "string"
      ? imageData.match(/^data:(image\/\w+);base64,/)
      : null;
  const mimeType = mimeMatch?.[1] || "image/jpeg";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.gemini.apiKey,
      },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        },
        output_dimensionality: EMBEDDING_DIMENSIONS,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Embedding API error: ${response.status}`
    );
  }

  const data = await response.json();
  const values: number[] | undefined =
    data.embedding?.values || data.embeddings?.[0]?.values;

  if (!values || !Array.isArray(values) || values.length === 0) {
    throw new Error("Embedding API returned no vector");
  }

  return values;
}

/**
 * Download an image URL and embed it.
 */
export async function embedImageFromUrl(url: string): Promise<number[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "VisualVinylScrobbler/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return embedImage(buffer);
}

/**
 * Rank collection albums by cosine similarity to a query embedding.
 */
export function findTopEmbeddingMatches(
  queryEmbedding: number[],
  albums: AlbumCover[],
  limit = 5
): EmbeddingMatch[] {
  const scored: EmbeddingMatch[] = [];

  for (const album of albums) {
    if (!album.embedding || album.embedding.length === 0) continue;
    const similarity = cosineSimilarity(queryEmbedding, album.embedding);
    scored.push({
      album,
      similarity,
      confidence: "low",
    });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  const top = scored.slice(0, limit);

  for (let i = 0; i < top.length; i++) {
    const gap = i === 0 && top.length > 1 ? top[0].similarity - top[1].similarity : 1;
    top[i].confidence = confidenceFromSimilarity(top[i].similarity, gap);
  }

  return top;
}

export function shouldAutoAcceptEmbedding(matches: EmbeddingMatch[]): boolean {
  if (matches.length === 0) return false;
  const top = matches[0];
  const gap =
    matches.length > 1 ? top.similarity - matches[1].similarity : 1;
  return (
    top.similarity >= EMBEDDING_AUTO_ACCEPT &&
    gap >= EMBEDDING_AUTO_ACCEPT_GAP
  );
}

export function shouldShowEmbeddingCandidates(
  matches: EmbeddingMatch[]
): boolean {
  return (
    matches.length > 0 && matches[0].similarity >= EMBEDDING_CANDIDATE_MIN
  );
}
