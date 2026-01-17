# Image Matching Guide

## Overview

The app uses **perceptual hashing** to match captured album cover photos with images stored in your database. This allows visual recognition of albums even when text on the cover is unclear or missing.

## How It Works

### 1. Perceptual Hashing

Perceptual hashing creates a "fingerprint" of an image that:

- Is consistent across similar images (same album cover)
- Tolerates minor variations (lighting, angle, compression)
- Produces similar hashes for visually similar images

The app uses the **Block Mean Value** algorithm (via `imghash` library):

- Resizes images to 8×8 pixels (64 bits)
- Converts to grayscale
- Generates a hexadecimal hash string

### 2. Database Building

When you build the database with "Generate image hashes" enabled:

1. Fetches all albums from your Discogs collection
2. Downloads cover images (or uses thumbnails)
3. Generates perceptual hashes for each image
4. Stores hashes in the database alongside album metadata

**Note**: This process can take a while for large collections as it downloads and processes each cover image.

### 3. Image Matching Process

When you capture an album cover:

1. **Image Matching (Primary)**:

   - Generates a hash from the captured photo
   - Compares it with all hashes in the database
   - Calculates Hamming distance (number of differing bits)
   - Finds matches within moderate threshold (15 bits difference, ~77% similarity)
   - Accepts matches with 70%+ similarity
   - Returns best match if similarity is high enough (70%+)

2. **Gemini AI Fallback**:

   - If image matching fails or finds no good match
   - Uses Google Gemini Vision API to identify the album directly from the image
   - Gemini can recognize albums even when text is unclear or the image is at an angle
   - Searches database/Discogs with Gemini's identification

3. **Scrobbling**:
   - Once album is identified, scrobbles to Last.fm

## Matching Quality

### Similarity Scores

- **High confidence** (≥85% similarity): Very likely correct match (required for auto-capture)
- **Medium confidence** (75-85%): Probably correct, but verify
- **Low confidence** (70-75%): May be correct, verify if unsure
- **Rejected** (<70%): Too low confidence, will use Gemini fallback

### Hamming Distance Threshold

The app uses **moderate thresholds** to allow more matches, since Gemini AI is available as a reliable fallback:

- **0-5 bits**: Nearly identical images (≥92% similarity)
- **6-10 bits**: Very similar (84-91% similarity)
- **11-15 bits**: Similar (primary threshold, 77-84% similarity, minimum 70% required)
- **16+ bits**: Different images (rejected, will use fallback methods)

**Note**: The moderate threshold (15 bits, 70% similarity minimum) allows more matches while still maintaining reasonable accuracy. Auto-capture requires 85%+ similarity. If no good hash match is found, the app automatically falls back to Gemini AI recognition, which can handle more difficult cases.

You can adjust the threshold in `app/api/match-image/route.ts` if needed.

## Advantages

✅ **Works without text**: Recognizes albums even if text is unclear  
✅ **Handles variations**: Works with different lighting, angles, or image quality  
✅ **Fast matching**: Hash comparison is very fast  
✅ **Offline capable**: Hash matching works offline once database is built (Gemini requires internet)

## Limitations

⚠️ **Requires hash generation**: Database must be built with hashes enabled  
⚠️ **Similar covers**: Albums with very similar covers might be confused  
⚠️ **Different pressings**: Different pressings of same album may have different covers  
⚠️ **Processing time**: Building database with hashes takes longer

## Best Practices

1. **Build database with hashes** for best results
2. **Good lighting** when capturing covers improves matching
3. **Center the cover** in the camera frame
4. **Wait for processing** - hash generation takes time
5. **Rebuild periodically** if you add new albums to Discogs

## Technical Details

### Libraries Used

- **imghash**: Perceptual hashing (Block Mean Value algorithm)
- **sharp**: Image processing and resizing
- **hamming-distance**: Fast hash comparison

### Hash Storage

Hashes are stored as hexadecimal strings in the database:

```json
{
  "imageHash": "a1b2c3d4e5f6...",
  "thumbHash": "f6e5d4c3b2a1..."
}
```

### Performance

- Hash generation: ~100-500ms per image
- Hash comparison: <1ms per comparison
- Database search: O(n) where n = number of albums

For 1000 albums, matching typically takes <100ms.
