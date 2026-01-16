# Discogs Scrobbler

A Next.js app that allows you to scrobble your vinyl records to Last.fm by taking a photo of the album cover with your iPad camera.

## Features

- 📸 **Camera-based album recognition**: Point your iPad camera at an album cover to identify and scrobble it
- 🎵 **Discogs integration**: Automatically syncs with your Discogs collection
- 🎧 **Last.fm scrobbling**: Scrobbles identified albums to your Last.fm account
- 📚 **Library view**: Browse your entire Discogs collection and manually scrobble albums
- 💾 **Cover database**: Build a local database of all your album covers from Discogs for faster matching
- 🎨 **iPad-optimized UI**: Designed to work seamlessly on iPad browsers

## Setup

### Prerequisites

- Node.js 18+ and npm
- Last.fm API credentials
- Discogs API token
- Google Cloud Vision API credentials (for image recognition)

### Installation

1. Clone this repository and install dependencies:

```bash
npm install
```

**Note**: If you plan to use Google Cloud Vision API, you'll also need to install the Google Cloud Vision package:

```bash
npm install @google-cloud/vision
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

   # Google Cloud Vision API (optional)
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   ```

   **Important**:

   - `.env.local` is gitignored and won't be committed
   - Never commit your actual API keys to version control
   - For Google Cloud Vision, also set `GOOGLE_APPLICATION_CREDENTIALS` as a system environment variable pointing to your service account JSON key file

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

#### Google Cloud Vision API

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Enable the Cloud Vision API
4. Create a service account:
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Grant it the "Cloud Vision API User" role
   - Create and download a JSON key
5. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

Or add it to your `.env.local` file (though the Google Cloud library reads from the environment variable).

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

1. **Camera View**:

   - Tap "Start Camera" to activate your device's camera
   - Point the camera at an album cover
   - Tap "Capture & Scrobble" to process the image
   - The app uses Google Cloud Vision API to extract text from the album cover
   - It then searches your Discogs collection for a matching album
   - If found, it scrobbles the album to Last.fm

2. **Library View**:

   - Browse all albums in your Discogs collection
   - Search by artist or album name
   - Tap any album to scrobble it manually

3. **Database View**:
   - Build a local database of all album covers from your Discogs collection
   - View statistics about your database
   - The database stores cover image URLs, artist names, album titles, and metadata
   - Useful for faster album matching and future image recognition improvements

## Technical Details

- **Next.js 15**: Latest version with App Router
- **TypeScript**: Full type safety
- **Tailwind CSS**: Modern, responsive styling
- **Google Cloud Vision API**: OCR and text extraction from album covers
- **Discogs API**: Collection fetching and album search
- **Last.fm API**: Scrobbling functionality

## Limitations

- The image recognition relies on text extraction (OCR), so album covers with clear text work best
- Album matching depends on the accuracy of OCR and your Discogs collection data
- Last.fm scrobbling currently scrobbles the album as a single track (for a complete implementation, you'd want to fetch the tracklist and scrobble each track)

## Database Feature

The app includes a database feature that stores all your album covers from Discogs:

- **Location**: Stored in `data/covers-database.json` (created automatically)
- **Contents**: Album metadata, cover image URLs, artist names, titles, years, labels, formats, and **perceptual image hashes**
- **Usage**: Access the "Database" tab to build and view your cover database
- **Benefits**:
  - Faster album lookups (searches local database first before hitting Discogs API)
  - **Visual image matching** - match album covers by visual similarity, not just text
  - Offline access to your collection metadata
  - Reduced API calls to Discogs

To build the database:

1. Go to the "Database" tab in the app
2. (Optional) Check "Generate image hashes for visual matching" to enable image-based recognition
3. Click "Build Database from Discogs"
4. Wait for it to fetch all albums from your collection
   - Without hashes: may take a few minutes for large collections
   - With hashes: will take longer as it downloads and processes cover images

**Note**: The `data/` directory is gitignored and won't be committed to version control.

### Image Matching

When you enable image hash generation, the app can match album covers visually:

- Uses **perceptual hashing** (pHash) to create visual fingerprints of album covers
- Compares captured photos with database hashes using Hamming distance
- Works even with different lighting, angles, or slight image variations
- Falls back to OCR text recognition if image matching doesn't find a good match

The matching process:

1. Camera captures album cover photo
2. App tries **image matching first** (if database has hashes)
3. If no good match found, falls back to **OCR text extraction**
4. Searches database/Discogs for matching album
5. Scrobbles to Last.fm

## Future Improvements

- Visual image matching using the cover database (compare captured image with stored covers)
- Automatic tracklist fetching and individual track scrobbling
- Better error handling and user feedback
- Support for multiple users
- Download and cache cover images locally for offline use

## License

MIT
