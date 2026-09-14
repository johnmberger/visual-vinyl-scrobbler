# Docs

Photograph a cover, match it against your Discogs collection, confirm sides and timestamp, scrobble to Last.fm.

I run the always-on box on a **UGREEN DXP4800 Pro**. You do not need that hardware — any LAN Docker host works. UGOS-only steps are in [nas.md](./nas.md).

## Local setup

Needs Node.js 18+, npm, and API keys:

- [Last.fm](https://www.last.fm/api/account/create) — API key, shared secret, username, and password (mobile session auth)
- [Discogs](https://www.discogs.com/settings/developers) — personal access token and username
- [Google Gemini](https://aistudio.google.com/app/apikey) — required for recognition and embeddings

```bash
npm install
cp .env.example .env.local
```

```env
LASTFM_API_KEY=...
LASTFM_API_SECRET=...
LASTFM_USERNAME=...
LASTFM_PASSWORD=...

DISCOGS_USER_TOKEN=...
DISCOGS_USERNAME=...

GEMINI_API_KEY=...
```

Optional: `GEMINI_VISION_MODEL` (default `gemini-3.5-flash-lite`). Embeddings use `gemini-embedding-2`.

Camera access requires HTTPS:

```bash
npm run dev:https
```

Open [https://localhost:3000](https://localhost:3000). Certificate troubleshooting: [https-setup.md](./https-setup.md).

## Docker (LAN + iPad)

Compose runs Next.js internally and publishes HTTPS on **3443** via Caddy, so the host can keep 443.

Home LAN only. Do not port-forward 3443. **No login** — anyone on the same Wi‑Fi can use it as you.

`docker-compose.yml` pins `platform: linux/amd64` (Intel NAS). Drop or change that if your host is not amd64.

### 1. Put the project on the host

Copy this repo onto the machine that will run Docker. Skip `node_modules`, `.next`, `.git`, and `.env.local`.

### 2. Create `.env`

Compose reads `.env` (not `.env.local`). Duplicate `.env.example` and paste the same keys you use locally.

Optional: copy an existing `data/covers-database.json` into `./data/` so you do not rebuild embeddings on the host.

### 3. Generate LAN certs, then build

Caddy will not start without `certificates/server.crt`. On a Mac (no Docker required):

```bash
./scripts/generate-lan-certs.sh 192.168.1.50
```

Use the LAN IP of the Docker host. Copy the whole `certificates/` folder next to `Caddyfile`. Then on the host:

```bash
docker compose up -d --build
```

App code changes (`app/`, `components/`, `lib/`, `hooks/`) need `--build`. Changing only `Caddyfile` or `certificates/` is `docker compose restart caddy`.

### 4. Trust HTTPS on the iPad

AirDrop `caddy-root.crt`, install the profile, then **Settings → General → About → Certificate Trust Settings** → full trust for **Visual Vinyl Scrobbler LAN CA**.

### 5. Open the app

Same Wi‑Fi as the host: `https://<host-lan-ip>:3443`.

Safari will warn until the CA is trusted. Then Start Camera, Library, and Database all work on that URL.

```bash
docker compose logs -f
docker compose up -d --build
```

UGREEN File Manager / Docker → Project / recreate: [nas.md](./nas.md).

## How it works

1. **Capture** — Auto-capture waits for a stable cover in the crop, or tap Capture
2. **Embeddings** — Gemini Embedding 2 cosine search against stored collection covers
3. **Auto-accept or pick** — Strong unique match → confirm scrobble; several close matches → selection UI
4. **Gemini vision** — If visual match is weak, identify the cover (constrained to your collection) as JSON
5. **Fuzzy name match** — Token/bigram similarity (remasters, “The”, etc.)
6. **Scrobble** — Pick sides, adjust timestamp, send to Last.fm

**Library** searches and scrobbles without the camera. **Database** fetches Discogs and (recommended) embeds each cover. Rebuild after you add albums to Discogs.

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind. Gemini 3.5 Flash-Lite (vision) + Embedding 2. Discogs collection/release/tracklist. Last.fm search, verify, scrobble. Local JSON: `data/covers-database.json` (gitignored).

Archived perceptual hashing: `_image-hashing/` ([notes](./image-hashing.md)). Shared UI: [ui.md](./ui.md).

## To-do

- **OAuth** — replace Last.fm password / Discogs token env auth
- **Multi-user** — per-user collections and credentials
