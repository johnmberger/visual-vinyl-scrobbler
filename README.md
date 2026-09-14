# Visual Vinyl Scrobbler

Want to scrobble your vinyl without the hassle of typing in each album manually? This little app let's you take a photo of an album cover, match it to your Discogs library, and scrobble ot to Last.fm. Built to sit on an iPad next to a turntable.

## Quick start

```bash
npm install
cp .env.example .env.local
```

Add Last.fm, Discogs, and Gemini keys (see `.env.example`). Camera needs HTTPS:

```bash
npm run dev:https
```

Open [https://localhost:3000](https://localhost:3000).

## Docs

Full setup, Docker/LAN + iPad, and how matching works: **[docs/README.md](./docs/README.md)**.

## License

MIT
