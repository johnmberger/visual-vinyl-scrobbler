# UGREEN DXP4800 Pro notes

The generic LAN + iPad Docker flow is in [README.md](./README.md). This file is only the extras for **how I run it**: a UGREEN DXP4800 Pro (Intel) on UGOS.

You do not need a UGREEN NAS. Any always-on Docker host on the same Wi‑Fi works.

Home network only. Do not port-forward 3443. Do not add this to QuickConnect or UGREEN remote access.

You need: the NAS (mounted in Finder / UGREEN app), a Mac, the iPad, and the same Wi-Fi.

## 0. One-time NAS prep

1. In UGOS, install **Docker** if it is not already installed.
2. In File Manager, create a folder for the app, e.g. `docker/visual-vinyl-scrobbler`.
3. Mount that share on your Mac (UGREEN app or Finder). You should see it in the sidebar.
4. Note your NAS LAN IP (Control Panel → Network). Something like `192.168.1.50`.

SSH is optional. You can start the stack from **UGOS → Docker → Project** by pointing it at this folder. Use SSH only if you prefer the terminal.

`docker-compose.yml` pins `platform: linux/amd64` because this NAS is Intel. Leave 3443 for Caddy so UGOS can keep 443.

## 1. Copy the project onto the NAS

In Finder, open this repo on your Mac (`visual-vinyl-scrobbler`) and the NAS folder you created.

Copy the project **into** that NAS folder. Skip these if they exist (they are large or local-only):

- `node_modules`
- `.next`
- `data` (unless you want step 3)
- `.env` / `.env.local` (keys; you will make a fresh `.env` on the NAS)
- `.git`

You need at least: `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `package.json`, `package-lock.json`, `app/`, `components/`, `lib/`, `hooks/`, `.env.example`. Add `certificates/` after you generate it (step 4) and **before** the first start.

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

## 4. Generate the cert on your Mac

Caddy will not start without `certificates/server.crt`. You do **not** need Docker on the Mac.

From this repo on your Mac:

```bash
./scripts/generate-lan-certs.sh 192.168.1.50
```

Use your real NAS LAN IP. That writes `certificates/` (for Caddy) and `caddy-root.crt` (for the iPad). Confirm `caddy-root.crt` starts with `-----BEGIN CERTIFICATE-----`.

Copy the whole `certificates/` folder into the NAS project folder (same place as `Caddyfile`).

## 5. Build and start

**Option A — UGOS Docker UI:** Docker → **Project** → create/import from this folder → start. First build can take several minutes.

**Option B — SSH on the NAS** (not a Mac-local Docker), from the project folder:

```bash
docker compose up -d --build
docker compose ps
```

You should see `visual-vinyl-scrobbler` and `visual-vinyl-scrobbler-https` running.

If `docker` is not available in that shell, use Option A. Compose must run **on the NAS**, not as a local Mac container talking at the share.

If you later change `Caddyfile` or `certificates/`, copy them onto the NAS and restart the `visual-vinyl-scrobbler-https` container (UGOS Docker UI, or `docker compose restart caddy`). No image rebuild.

App code changes (`app/`, `components/`, `lib/`, `hooks/`) need a **rebuild** (`docker compose up -d --build`), not Restart. To wipe and recreate the project in UGOS: Stop → Delete (keep the folder on disk; delete the `visual-vinyl-scrobbler:local` image) → Create from the same folder → Deploy.

## 6. Trust the cert on the iPad

iOS will not turn the camera on for an untrusted certificate.

AirDrop `caddy-root.crt` to the iPad.

On the iPad:

1. Open the file → **Install** the profile (Settings will show a downloaded profile).
2. **Settings → General → About → Certificate Trust Settings**
3. Enable full trust for **Visual Vinyl Scrobbler LAN CA**.

Only do this on the iPad you use next to the turntable. If you retire this app, delete that profile.

If the NAS IP changes later, run the script again with the new IP (it reuses the same CA, so you do not reinstall the iPad profile), recopy `certificates/`, and restart Caddy.

## 7. Open the app

On the iPad, same Wi-Fi as the NAS:

```text
https://YOUR-NAS-IP:3443
```

Example: `https://192.168.1.50:3443`

A certificate warning you can inspect is expected until step 6 is done. **Secure Connection Failed** usually means `certificates/` is missing on the NAS or Caddy was not restarted after you copied it.

If Safari still warns after installing the profile, Full Trust is not on yet (step 6.3).

This stack has **no login**. Anyone on the same Wi‑Fi can use it as you. Do not join a guest network you do not trust, and do not port-forward 3443.

## 8. First-time use

1. Confirm there is no “configuration missing” banner.
2. Open **Database** → build from Discogs with embeddings checked (skip if you copied `covers-database.json`).
3. Try **Library** (no camera needed).
4. Try **Camera** → allow camera access.

## Useful commands

From SSH on the NAS (or another Docker CLI talking to this host):

```bash
docker compose logs -f
docker compose restart
docker compose up -d --build
docker compose down
```

After editing `.env`, `docker compose up -d` is enough. You do not need to rebuild the image.
