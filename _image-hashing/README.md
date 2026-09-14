# Image Hashing (Archived)

Perceptual hashing (pHash) previously used for visual matching. Replaced by **Gemini Embedding 2** cosine search in the main app (`lib/embeddings.ts`, `/api/match-image`).

## Why it was retired

Too many false positives and constant threshold tuning. Multimodal embeddings are more robust for phone/iPad photos of covers.

## Contents

- `imageMatching.ts` — pHash + Hamming distance
- `match-image/route.ts` — old hash API
- `MatchSelectionModal.tsx` — old candidate UI (superseded by `components/MatchSelectionModal.tsx`)
- `IMAGE_MATCHING.md` — original docs

Do not re-enable this path for production matching; use embeddings + collection-constrained Gemini instead.
