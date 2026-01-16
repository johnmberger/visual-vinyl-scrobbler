# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
npm install @google-cloud/vision  # For image recognition
```

## Step 2: Get API Keys

### Last.fm

1. Visit https://www.last.fm/api/account/create
2. Create an API account
3. Copy your **API Key** and **Shared Secret**
4. Note your **username** and **password**

### Discogs

1. Visit https://www.discogs.com/settings/developers
2. Click "Generate new token"
3. Copy the **Personal Access Token**
4. Note your **username**

### Google Cloud Vision API

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable "Cloud Vision API"
4. Go to "IAM & Admin" > "Service Accounts"
5. Create a new service account
6. Grant it "Cloud Vision API User" role
7. Create and download a JSON key file
8. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-key.json"
   ```

## Step 3: Configure the App

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your API credentials:

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

**Note**: For Google Cloud Vision API, you also need to set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account JSON key file. This should be set as a system environment variable (not in `.env.local`):

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

## Step 4: Run the App

**Important**: The camera requires HTTPS. Run:

```bash
npm run dev:https
```

Then open **https://localhost:3000** in your browser (or iPad).

**Note**:

- Make sure to use `https://` not `http://`
- On first run, you may be prompted for your password to install certificates
- See [HTTPS_SETUP.md](./HTTPS_SETUP.md) for troubleshooting

For iPad access on the same network, see the HTTPS_SETUP.md guide.

## Step 5: Test It Out

1. Click "Start Camera" and allow camera permissions
2. Point your camera at an album cover
3. Click "Capture & Scrobble"
4. The app will:
   - Extract text from the album cover
   - Search your Discogs collection
   - Scrobble to Last.fm if found

## Troubleshooting

### Camera not working

- Make sure you're using HTTPS (required for camera access)
- Check browser permissions for camera access
- On iPad, use Safari for best compatibility

### "Google Cloud Vision API not configured"

- Make sure you've installed `@google-cloud/vision`
- Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Verify your service account has the correct permissions

### "Failed to authenticate with Last.fm"

- Double-check your API key, secret, username, and password
- Make sure your Last.fm account is active

### "Album not found in collection"

- The OCR might not have extracted the text correctly
- Try again with better lighting
- Make sure the album is in your Discogs collection
- You can manually scrobble from the Library view
