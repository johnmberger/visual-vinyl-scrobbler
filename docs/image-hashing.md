# Image Hashing (Archived)

Perceptual hashing (pHash) previously used for visual matching. Replaced by **Gemini Embedding 2** cosine search in the main app (`lib/embeddings.ts`, `/api/match-image`).

## Why it was retired

Too many false positives and constant threshold tuning. Multimodal embeddings are more robust for phone/iPad photos of covers.

## Code (still in `_image-hashing/`)

- `imageMatching.ts` — pHash + Hamming distance
- `match-image/route.ts` — old hash API
- `MatchSelectionModal.tsx` — old candidate UI (superseded by `components/MatchSelectionModal.tsx`)

Original write-up: [image-hashing-legacy.md](./image-hashing-legacy.md).

Do not re-enable this path for production matching; use embeddings + collection-constrained Gemini instead.

