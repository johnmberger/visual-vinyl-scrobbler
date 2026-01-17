# Visual Vinyl Scrobbler

A Next.js app that allows you to scrobble your vinyl records to Last.fm by taking a photo of the album cover with your device's camera (I'm using an iPad next to my turntable).

## Features

- 📸 **Camera-based album recognition**: Point your camera at an album cover to identify and scrobble it
- 🤖 **Auto-capture**: Automatically captures and recognizes albums when a good match is detected
- 🎵 **Discogs integration**: Automatically syncs with your Discogs collection
- 🎧 **Last.fm scrobbling**: Scrobbles identified albums to your Last.fm account
- 📚 **Library view**: Browse your entire Discogs collection and manually scrobble albums
- 💾 **Cover database**: Build a local database of all your album covers from Discogs for faster matching

## Setup

### Prerequisites

- Node.js 18+ and npm
- Last.fm API credentials
- Discogs API token
- (Optional) Google Gemini API key (for AI recognition fallback)

### Installation

1. Clone this repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

   Create a `.env.local` file in the root directory:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` and fill in your API credentials:

   ```env
   # Last.fm API Credentials
   LASTFM_API_KEY=your-lastfm-api-key
   LASTFM_API_SECRET=your-lastfm-api-secret
   LASTFM_USERNAME=your-username
   LASTFM_PASSWORD=your-password

   # Discogs API Credentials
   DISCOGS_USER_TOKEN=your-discogs-token
   DISCOGS_USERNAME=your-discogs-username

   # Google Gemini API (optional, for AI recognition fallback)
   GEMINI_API_KEY=your-gemini-api-key
   ```

   **Important**:

   - `.env.local` is gitignored and won't be committed
   - Never commit your actual API keys to version control

### Getting API Keys

#### Last.fm API

1. Go to https://www.last.fm/api/account/create
2. Create a new API account
3. Copy your API Key and Shared Secret
4. Use your Last.fm username and password

#### Discogs API

1. Go to https://www.discogs.com/settings/developers
2. Generate a new personal access token
3. Copy the token and your Discogs username

#### Google Gemini API (Optional - for AI recognition fallback)

Gemini is used as a fallback when perceptual hashing finds no match. It can identify albums even when text is unclear or the image is at an angle.

**Step-by-step setup:**

1. **Get your API key:**
   - Go to https://makersuite.google.com/app/apikey (or https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key" or "Get API Key"
   - Select "Create API key in new project" (or choose an existing project)
   - Copy the generated API key

2. **Add to your environment:**
   - Open your `.env.local` file
   - Add the following line:
     ```env
     GEMINI_API_KEY=your-copied-api-key-here
     ```
   - Replace `your-copied-api-key-here` with the actual key you copied

3. **Verify it's working:**
   - Restart your dev server (`npm run dev:https`)
   - Try capturing an album cover that fails with other methods
   - If Gemini is configured, it will automatically try to identify the album

**Note**: The Gemini API is free for reasonable usage, but has rate limits. For most personal use cases, the free tier should be sufficient.

### Running the App

**Important**: The camera API requires HTTPS. Use the HTTPS dev server:

```bash
npm run dev:https
```

Then open [https://localhost:3000](https://localhost:3000) in your browser (or iPad).

**Note**: On first run, you may be prompted for your password to install the certificate authority. This is normal and safe for local development.

For regular HTTP (without camera), you can still use:

```bash
npm run dev
```

See [HTTPS_SETUP.md](./HTTPS_SETUP.md) for detailed setup instructions and troubleshooting.

## How It Works

### Camera View

1. Tap "Start Camera" to activate your device's camera
2. Point the camera at an album cover
3. **Auto-capture** (enabled by default):
   - The app continuously samples frames and matches them against your database
   - When a very high-confidence match is detected (≥85% similarity), it automatically captures and processes the album
   - Visual feedback shows a green border and "Ready!" indicator when a match is found
   - You can disable auto-capture and manually tap "Capture Album" instead
4. The app uses a **two-tier recognition system**:
   - **Primary**: Perceptual hashing (visual matching) if database has hashes - uses strict thresholds (10 bits, 80% similarity minimum) to prevent false matches
   - **Fallback**: AI recognition using Google Gemini Vision API (if hash matching fails or finds no match)
5. Once identified, you'll see a confirmation modal where you can:
   - Select which sides of the album to scrobble
   - Adjust the scrobble timestamp
   - Review tracklist information
6. Confirm to scrobble all selected tracks to Last.fm

### Library View

- Browse all albums in your Discogs collection
- Search by artist or album name
- Tap any album to scrobble it manually
- Uses the same confirmation modal as camera-based scrobbling (select sides, adjust timestamp, review tracklist)

### Database View

- Build a local database of all album covers from your Discogs collection
- View statistics about your database
- Generate perceptual hashes for visual image matching

## Technical Details

- **Next.js 15**: App Router with TypeScript
- **Perceptual Hashing**: `imghash` library (Block Mean Value algorithm)
- **Image Processing**: `sharp` for image manipulation
- **Google Gemini API**: AI vision fallback for album recognition
- **Discogs API**: Collection fetching, release details, and tracklists
- **Last.fm API**: Track/album search, verification, and scrobbling

## Perceptual Hashing

The app uses **perceptual hashing** (pHash) for visual album cover recognition. This allows the app to match album covers even when text is unclear or missing.

### How It Works

1. **Hash Generation**: When building the database with hashes enabled, the app:

   - Downloads cover images from Discogs
   - Resizes them to 8×8 pixels and converts to grayscale
   - Generates a 64-bit hash (visual fingerprint) using the Block Mean Value algorithm
   - Stores the hash in the database

2. **Matching Process**:

   - When you capture an album cover, the app generates a hash from the photo
   - Compares it with all hashes in your database using Hamming distance
   - Finds matches within a moderate similarity threshold (15 bits difference, ~77% similarity)
   - Accepts matches with 70%+ similarity
   - Falls back to Gemini if no good match is found

3. **Advantages**:
   - Works without clear text on the cover
   - Handles variations in lighting, angle, and image quality
   - Fast matching (typically <100ms for 1000 albums)
   - Uses strict thresholds to prevent false matches
   - Falls back to Gemini if no good visual match is found

### Similarity Scores

- **High confidence** (≥85%): Very likely correct match (required for auto-capture)
- **Medium confidence** (75-85%): Probably correct, but verify
- **Low confidence** (70-75%): May be correct, verify if unsure
- **Rejected** (<70%): Too low confidence, will use Gemini fallback

**Note**: Hash matching uses moderate thresholds (15 bits difference, 70% similarity minimum) to allow more matches. Auto-capture requires 85%+ similarity. If no good match is found, the app automatically falls back to Gemini AI recognition.

For more technical details, see [IMAGE_MATCHING.md](./IMAGE_MATCHING.md).

## Building the Database

The database stores all your album covers from Discogs for faster matching:

- **Location**: `data/covers-database.json` (created automatically, gitignored)
- **Contents**: Album metadata, cover image URLs, artist names, titles, years, labels, formats, and perceptual image hashes
- **Benefits**:
  - Faster album lookups (searches local database first)
  - Visual image matching using perceptual hashes
  - Offline access to your collection metadata
  - Reduced API calls to Discogs

### To Build the Database

1. Go to the "Database" tab in the app
2. Check "Generate image hashes for visual matching" (recommended for best results)
3. Click "Build Database from Discogs"
4. Wait for it to fetch all albums from your collection
   - Without hashes: a few minutes for large collections
   - With hashes: longer as it downloads and processes cover images

**Note**: Rebuild the database periodically if you add new albums to your Discogs collection.

## To-Do

Future improvements I'd like to implement:

- **OAuth integration**: Switch from hard-coded API credentials to OAuth flows for Last.fm and Discogs, allowing users to authenticate securely without exposing API keys
- **Hash storage optimization**: Optimize how perceptual hashes are stored and indexed for faster matching, potentially using a database or more efficient data structures
- **Multi-user support**: Update the app architecture to support multiple users, with user-specific collections, databases, and authentication

## License

MIT
