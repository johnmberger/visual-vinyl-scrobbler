# DXP4800 Pro — LAN + iPad setup

Home network only. Do not port-forward 3443. Do not add this to QuickConnect or UGREEN remote access.

You need: the NAS (mounted in Finder / UGREEN app), your Mac, the iPad, and the same Wi-Fi.

## 0. One-time NAS prep

1. In UGOS, install **Docker** if it is not already installed.
2. In File Manager, create a folder for the app, e.g. `docker/visual-vinyl-scrobbler`.
3. Mount that share on your Mac (UGREEN app or Finder). You should see it in the sidebar.
4. Note your NAS LAN IP (Control Panel → Network). Something like `192.168.1.50`.

SSH is optional. You can start the stack from **UGOS → Docker → Project** by pointing it at this folder. Use SSH only if you prefer the terminal.

## 1. Copy the project onto the NAS

In Finder, open this repo on your Mac (`visual-vinyl-scrobbler`) and the NAS folder you created.

Copy the project **into** that NAS folder. Skip these if they exist (they are large or local-only):

- `node_modules`
- `.next`
- `data` (unless you want step 3)
- `.env` / `.env.local` (keys; you will make a fresh `.env` on the NAS)
- `.git`

You need at least: `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `package.json`, `package-lock.json`, `app/`, `components/`, `lib/`, `hooks/`, `.env.example`, `certificates/` (after step 5).

## 2. Put your API keys on the NAS

Compose reads `.env` (not `.env.local`). Dotfiles are hidden in Finder; press **Cmd+Shift+.** to show them.

1. In the NAS project folder, duplicate `.env.example` and rename the copy to `.env`.
2. Open `.env` in TextEdit (or any editor).
3. Paste the same values you use in `.env.local` on your Mac:

```env
LASTFM_API_KEY=...
LASTFM_API_SECRET=...
LASTFM_USERNAME=...
LASTFM_PASSWORD=...
DISCOGS_USER_TOKEN=...
DISCOGS_USERNAME=...
GEMINI_API_KEY=...
```

Save. These keys stay on the NAS. The iPad never sees them.

## 3. Optional: copy your existing cover database

If you already built embeddings on your Mac, copy `data/covers-database.json` from the Mac repo into `data/` inside the NAS project folder (create `data` if needed).

Skip this if you are fine rebuilding the database in the app later (takes a while; uses Gemini).

## 4. Build and start

**Option A — UGOS Docker UI:** Docker → **Project** → create/import from this folder → start. First build can take several minutes.

**Option B — Terminal on the Mac**, from the mounted NAS folder:

```bash
cd /Volumes/YOUR-SHARE/docker/visual-vinyl-scrobbler
docker compose up -d --build
docker compose ps
```

Use the real mount path Finder shows (select the folder, Cmd+Option+C to copy the path).

You should see `visual-vinyl-scrobbler` and `visual-vinyl-scrobbler-https` running.

If `docker` is not installed on the Mac, use Option A. Compose must run **on the NAS** (or against the NAS Docker engine), not as a local Mac container talking at the share.

If you later change `Caddyfile` or `certificates/`, copy them onto the NAS and restart the `visual-vinyl-scrobbler-https` container (UGOS Docker UI, or `docker compose restart caddy`). No image rebuild.

## 5. Generate the cert on your Mac, then trust it on the iPad

iOS will not turn the camera on for an untrusted certificate. You do **not** need Docker on the Mac.

From this repo on your Mac:

```bash
./scripts/generate-lan-certs.sh 192.168.1.50
```

Use your real NAS LAN IP. That writes `certificates/` (for Caddy) and `caddy-root.crt` (for the iPad). Confirm `caddy-root.crt` starts with `-----BEGIN CERTIFICATE-----`.

Copy the whole `certificates/` folder into the NAS project folder (same place as `Caddyfile`). Restart the Caddy container so it picks up the files.

AirDrop `caddy-root.crt` to the iPad.

On the iPad:

1. Open the file → **Install** the profile (Settings will show a downloaded profile).
2. **Settings → General → About → Certificate Trust Settings**
3. Enable full trust for **Visual Vinyl Scrobbler LAN CA**.

Only do this on the iPad you use next to the turntable. If you retire this app, delete that profile.

If the NAS IP changes later, run the script again with the new IP (it reuses the same CA, so you do not reinstall the iPad profile), recopy `certificates/`, and restart Caddy.

## 6. Open the app

On the iPad, same Wi-Fi as the NAS:

```text
https://YOUR-NAS-IP:3443
```

Example: `https://192.168.1.50:3443`

A certificate warning you can inspect is expected until step 5 is done. **Secure Connection Failed** usually means `certificates/` is missing on the NAS or Caddy was not restarted after you copied it.

If Safari still warns after installing the profile, Full Trust is not on yet (step 5.3).

## 7. First-time use

1. Confirm there is no “configuration missing” banner.
2. Open **Database** → build from Discogs with embeddings checked (skip if you copied `covers-database.json`).
3. Try **Library** (no camera needed).
4. Try **Camera** → allow camera access.

## Useful commands

From the mounted project folder (or SSH):

```bash
docker compose logs -f
docker compose restart
docker compose up -d --build
docker compose down
```

After editing `.env` in Finder, `docker compose up -d` is enough. You do not need to rebuild the image.
