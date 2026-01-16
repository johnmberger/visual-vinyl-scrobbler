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
   - Finds matches within threshold (default: 15 bits difference)
   - Returns best match if similarity > 60%

2. **OCR Fallback (Secondary)**:

   - If image matching fails or finds no good match
   - Uses Google Cloud Vision API to extract text
   - Parses artist and album name from text
   - Searches database/Discogs by text

3. **Scrobbling**:
   - Once album is identified, scrobbles to Last.fm

## Matching Quality

### Similarity Scores

- **High confidence** (>80% similarity): Very likely correct match
- **Medium confidence** (60-80%): Probably correct, but verify
- **Low confidence** (<60%): May not be accurate

### Hamming Distance Threshold

- **0-5 bits**: Nearly identical images
- **6-10 bits**: Very similar (same album, different photo/lighting)
- **11-15 bits**: Similar (default threshold)
- **16+ bits**: Different images

You can adjust the threshold in `app/api/match-image/route.ts` if needed.

## Advantages

✅ **Works without text**: Recognizes albums even if text is unclear  
✅ **Handles variations**: Works with different lighting, angles, or image quality  
✅ **Fast matching**: Hash comparison is very fast  
✅ **Offline capable**: Once database is built, works without internet (except for scrobbling)

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
