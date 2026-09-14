# Visual Vinyl Scrobbler

A Next.js app that scrobbles vinyl to Last.fm by photographing album covers (e.g. an iPad next to a turntable).

## Features

- **Camera-based recognition**: Point at a cover to identify and scrobble it
- **Hybrid visual matching**: Gemini Embedding 2 cosine search over your collection, with Gemini vision fallback
- **Collection-aware AI**: Gemini is constrained to your Discogs collection when possible
- **Discogs sync**: Local cover database built from your collection
- **Last.fm scrobbling**: Confirm sides/timestamp, then scrobble tracks
- **Library view**: Browse and manually scrobble any album in your collection

## Setup

### Prerequisites

- Node.js 18+ and npm
- Last.fm API credentials
- Discogs API token
- Google Gemini API key (required for recognition and embeddings)

### Installation

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```env
LASTFM_API_KEY=...
LASTFM_API_SECRET=...
LASTFM_USERNAME=...
LASTFM_PASSWORD=...

DISCOGS_USER_TOKEN=...
DISCOGS_USERNAME=...

GEMINI_API_KEY=...
```

### Getting API Keys

#### Last.fm

1. https://www.last.fm/api/account/create
2. Copy API Key and Shared Secret
3. Use your Last.fm username and password (mobile session auth)

#### Discogs

1. https://www.discogs.com/settings/developers
2. Create a personal access token

#### Google Gemini (required)

1. https://aistudio.google.com/app/apikey
2. Create an API key and set `GEMINI_API_KEY`

Used for:

- `gemini-3.5-flash-lite` — identify covers (default; override with `GEMINI_VISION_MODEL`)
- `gemini-embedding-2` — visual embeddings for cover matching

### Running the App

Camera access requires HTTPS:

```bash
npm run dev:https
```

Open [https://localhost:3000](https://localhost:3000).

See [HTTPS_SETUP.md](./HTTPS_SETUP.md) for certificate troubleshooting.

## Docker / UGREEN DXP4800 Pro (LAN + iPad)

DXP4800 Pro is Intel, so the image builds as `linux/amd64` on the NAS. Nothing here is meant to be on the internet: do not port-forward 3443, and do not attach this stack to QuickConnect or UGREEN remote access.

The iPad camera **requires HTTPS**. The NAS admin UI already owns 443, so Compose publishes HTTPS on **3443** via Caddy (LAN-only, local CA). The Next.js app is not exposed directly.

### 1. Copy the project onto the NAS

Mount the NAS in Finder (UGREEN app). Copy this repo into a folder such as `docker/visual-vinyl-scrobbler`. Skip `node_modules`, `.next`, `.git`, and `.env.local`.

See [NAS.md](./NAS.md) for the Finder-first walkthrough.

### 2. Create `.env`

In that NAS folder, duplicate `.env.example` and rename it to `.env` (press **Cmd+Shift+.** in Finder to show dotfiles). Paste the same Last.fm, Discogs, and Gemini values you use locally.

Optional: copy an existing `data/covers-database.json` into `./data/` so you do not have to rebuild embeddings on the NAS.

### 3. Build and start

From SSH in that folder, or UGREEN Docker → **Project**:

```bash
docker compose up -d --build
```

### 4. Trust HTTPS on the iPad (needed for camera)

iOS will not give camera access to an untrusted certificate. On your Mac (no Docker required):

```bash
./scripts/generate-lan-certs.sh 192.168.1.50
```

Use your NAS LAN IP. Copy the `certificates/` folder onto the NAS project, restart Caddy, then AirDrop `caddy-root.crt` to the iPad. Install the profile, then:

**Settings → General → About → Certificate Trust Settings** → enable full trust for **Visual Vinyl Scrobbler LAN CA**.

### 5. Open the app

On the iPad, same Wi-Fi as the NAS:

```text
https://<nas-lan-ip>:3443
```

Safari will warn until the CA is trusted. After that, Start Camera should work. Library and Database work on that same URL.

### Rebuild / logs

```bash
docker compose logs -f
docker compose up -d --build
```

## How It Works

### Recognition pipeline

1. **Capture** — Auto-capture waits until the crop region looks like a stable cover (not empty / moving); or tap Capture manually
2. **Visual embeddings** — Query image is embedded with Gemini Embedding 2 and compared (cosine similarity) to stored collection embeddings
3. **Auto-accept or pick** — Strong unique match → confirm scrobble; several close matches → selection UI
4. **Gemini vision** — If visual match is weak/absent, Gemini identifies the cover, constrained to your collection list, with structured JSON output
5. **Fuzzy name match** — Artist/album strings are matched with token/bigram similarity (handles remasters, “The”, etc.)
6. **Scrobble** — Pick sides, adjust timestamp, scrobble to Last.fm

### Library / Database

- **Library**: search and scrobble without the camera
- **Database**: fetch Discogs collection and (recommended) generate visual embeddings for each cover (prefers Last.fm art when available)

Rebuild the database after adding albums to Discogs.

## Technical Details

- Next.js 15 (App Router), React 19, TypeScript, Tailwind
- Gemini 3.5 Flash-Lite (vision) + Gemini Embedding 2
- Discogs collection / release / tracklist APIs
- Last.fm search, verify, and scrobble
- Local JSON DB: `data/covers-database.json` (gitignored)

Legacy perceptual hashing lives in `_image-hashing/` for reference and is no longer used.

## To-Do

- **OAuth**: Replace Last.fm password / Discogs token env auth with OAuth
- **Multi-user**: Per-user collections and credentials

## License

MIT
