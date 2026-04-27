# TuneFerry

**English** · [简体中文](./README.zh-CN.md)

Migrate **public** Spotify playlists to Apple Music. Paste any `open.spotify.com/playlist/...` URL and TuneFerry fuzzy-matches every track against the Apple Music catalog, then hands you a tappable deep-link list plus an `.m3u8` file.

> **Zero subscriptions, zero API keys.** TuneFerry reads Spotify by scraping the public embed page (the same data Spotify shows to anyone visiting your playlist URL — no Premium, no OAuth, no client secret). It reads Apple Music with a WebPlay-scraped Developer Token. Apple's "add to library" still happens on your own device — TuneFerry generates the deep links, you tap.

## How it works

```
Public Spotify playlist URL
        │
        ▼
   [/import]   ←─ paste URL, fetch via open.spotify.com/embed/<id>
        │
        ▼
   POST /api/match   ←─ fuzzy match (token Jaccard + duration penalty)
        │
        ▼
   [/match]    ←─ confidence pills, manual candidate picker
        │
        ▼
   [/export]   ←─ deep link list (copy all) + .m3u8 download
```

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript. Single-process `next dev` on :3000.
- **Styling:** OKLCH CSS-variable token system + inline styles + a small `primitives.tsx` component library. No UI framework, no CSS Modules.
- **Spotify:** Embed-page scraping (`https://open.spotify.com/embed/playlist/<id>`). Pulls the SSR'd `__NEXT_DATA__` JSON, walks to the track list. **No OAuth, no API keys, no env vars.**
- **Apple Music:** Catalog search via `amp-api.music.apple.com` with a WebPlay-scraped Developer Token. Fuzzy matching written from scratch (token Jaccard + duration penalty). No `fuse.js` / `string-similarity` — ~30 lines.
- **Quality:** Biome (lint + format + import sort), TypeScript strict, Vitest (34 tests), husky pre-commit hook.

## Project Layout

```
AM-API/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout (fonts + Providers)
│   │   ├── globals.css              # OKLCH tokens
│   │   ├── page.tsx                 # / Home (hero + CTAs)
│   │   ├── import/page.tsx          # Step 1: paste URL or pick from Spotify account
│   │   ├── match/page.tsx           # Step 2: review matches, manual override
│   │   ├── export/page.tsx          # Step 3: deep links + .m3u8
│   │   ├── settings/page.tsx        # Storefront / Spotify session / Apple token
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── apple-music/
│   │       │   ├── developer-token/route.ts
│   │       │   └── catalog/search/route.ts
│   │       ├── spotify/
│   │       │   ├── auth/login/route.ts
│   │       │   ├── auth/callback/route.ts
│   │       │   ├── auth/logout/route.ts
│   │       │   ├── playlist/route.ts        # public
│   │       │   └── me/{playlists,playlist}/route.ts  # private
│   │       └── match/route.ts
│   ├── components/                  # primitives, icons, AppShell, Sidebar, TopNav, MobileNav, TweaksPanel, Providers
│   ├── hooks/                       # useLocalStorage, useStorefront, useTweaks
│   ├── api/appleMusicApi.ts         # client-side fetch wrapper for /api/apple-music/*
│   ├── types/appleMusic.ts          # frontend Apple types
│   └── lib/
│       ├── appleMusicService.ts     # searchCatalog + findByIsrc + findFirstByQuery
│       ├── developerTokenService.ts # token from env (or self-sign)
│       ├── env.ts                   # typed env (Apple + Spotify)
│       ├── httpError.ts
│       ├── nextHandler.ts           # withErrorHandler / pickQuery / pickHeader / pickInt
│       ├── matchService.ts          # ISRC + fuzzy matching
│       ├── spotifyService.ts        # Spotify Web API + OAuth + state signing
│       ├── spotifySession.ts        # cookie helpers
│       └── types/{appleMusic,spotify}.ts
├── next.config.js
├── tsconfig.json    # @/* → ./src/*
├── biome.json
└── vitest.config.ts
```

## Configuration

### Spotify

**Nothing.** No env vars, no app registration, no OAuth setup. TuneFerry reads public playlist data from `https://open.spotify.com/embed/playlist/<id>`. The embed page returns server-rendered JSON for any visitor — Spotify uses it for `oembed` previews, third-party readers can use it too.

**Limitations**:
- **Public playlists only.** Set the playlist to public on Spotify first if needed.
- **Up to 100 tracks per playlist.** Embed truncates beyond that. Spotify-curated algorithmic playlists (`37i9...` IDs like *Today's Top Hits*, *Top 50*) cap at 50.
- **No "your playlists" picker.** Each migration starts from a URL paste.

### Apple Music Developer Token (required)

**Two paths:**

**(A) WebPlay scrape — free, unofficial, ~72-day expiry**
- Fetch `https://beta.music.apple.com`, find `index-legacy-*.js` filename, fetch that JS, regex out the `eyJh...` JWT
- Paste into `APPLE_MUSIC_DEVELOPER_TOKEN`
- Token has `root_https_origin: ["apple.com"]`. The backend automatically sends `Origin: https://music.apple.com` + a desktop UA on every Apple call (locked by tests in `appleMusicService.test.ts`)
- API base: `amp-api.music.apple.com/v1` (Apple Web player's endpoint, paired with this token)

**(B) Apple Developer Program — $99/yr, official, 6-month token**
- Create a Media Services key with MusicKit, download `.p8`
- Either pre-sign a token and paste into `APPLE_MUSIC_DEVELOPER_TOKEN`
- Or set `APPLE_TEAM_ID` + `APPLE_KEY_ID` + `APPLE_PRIVATE_KEY` (inline PEM) and the server self-signs

See [`.env.example`](./.env.example) for the full list.

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Fill APPLE_MUSIC_DEVELOPER_TOKEN (only required field).
# Optionally set NEXT_PUBLIC_DEFAULT_STOREFRONT (default 'us').

# 3. Run
npm run dev
# → http://localhost:3000

# 4. Try it
# Open /import, paste any public Spotify playlist URL, e.g.
#   https://open.spotify.com/playlist/2mZkGiUygMLEzNnawpo0Ya
```

> **Local HTTP proxy gotcha:** if your shell has `http_proxy`/`https_proxy` set (Clash, Surge, etc.), `curl localhost:3000` may 503 because the proxy intercepts. Use `curl --noproxy '*' http://localhost:3000/...` or `unset http_proxy https_proxy`.

## Deployment

Vanilla Next.js, deploy to Vercel:

```bash
npx vercel link    # once
npx vercel --prod
```

Set the same env vars in Vercel's dashboard (or `vercel env add`). Make sure to update `SPOTIFY_REDIRECT_URI` to your production URL and re-register it in your Spotify app.

## Scripts

```bash
npm run dev            # next dev (port 3000)
npm run build          # next build
npm run start          # next start (after build)
npm run typecheck      # tsc --noEmit
npm run check          # Biome lint + format + import sort
npm run check:fix      # same, with autofixes
npm run test           # Vitest single run
npm run test:watch     # Vitest watch
npm run test:coverage  # Vitest + v8 coverage
npm run validate       # check + typecheck + test in parallel (CI)
npm run clean          # rm .next + coverage
```

## Code Quality

- **Biome** — lint + format + import sort. Config: [`biome.json`](./biome.json).
- **TypeScript strict** across all of `src/`. Path alias `@/*` → `./src/*`.
- **Vitest 2** covers `src/lib/**` (37 tests as of Phase 17).
- **Pre-commit gate**: `.husky/pre-commit` runs `npm run check` + `npm run typecheck` on every commit. Tests run in `validate` (CI).
- **No backdoor**: don't `git commit --no-verify` unless really stuck.

## Roadmap

- [x] Phase 1–14 — Apple Music Library Organizer prototype (see git history)
- [x] Phase 15 — WebPlay-scraped Developer Token + amp-api endpoint
- [x] Phase 16 — Rebuilt on Next.js 14 App Router
- [x] Phase 17 — Pivot to TuneFerry: Spotify Web API + OAuth + ISRC matching wizard (subsequently rebuilt — see Phase 18)
- [x] Phase 18 — **Drop Spotify Web API entirely** (Premium-locked since 2024). Replaced with embed-page scraping for public playlists. Removed all OAuth, removed ISRC tier, simplified `/import` and `/settings`. Net −1500 / +400 lines, zero subscriptions
- [ ] Next — Per-storefront retry for tracks that miss in `us` (auto-fallback to `hk`/`tw`/`jp`)
- [ ] Next — Concurrency in `matchMany` for large playlists (currently serial)
- [ ] Next — iOS Shortcut export (one-tap add via Shortcuts app)
- [ ] Next — Client-side React component tests (jsdom + @testing-library/react)
- [ ] Next — Persist migration history (so users can resume across sessions)

## Known Limitations (MVP)

- **Public playlists only, ≤100 tracks.** Spotify's embed page is the data source; private playlists require Web API access (Premium-locked) and embed truncates large playlists.
- **No ISRC = fuzzy-only matching.** Embed doesn't expose ISRC, so we can't do exact-by-identifier matches. Most popular tracks still resolve at `'high'` confidence; obscure / regional / heavily-renamed tracks may end up `'low'` or `'none'`. Users can manually pick from candidate lists in `/match`.
- **Storefront sensitivity.** Match rate depends heavily on whether the track exists in the chosen Apple Music storefront. Chinese songs frequently miss in `us` but hit in `hk` / `tw`. Consider switching storefront in Settings before retrying.
- **Apple Music has no public "add to library" API for non-subscribers**; the deep link path is the only universal flow. iOS users tap each link; macOS Music app can also import the `.m3u8`.
- **WebPlay-scraped tokens (both Apple & Spotify embed) are unofficial.** Either side can break the path by changing their front-end bundle. Production users should consider paid alternatives.
- **`matchMany` is serial** — fine for ≤100 tracks; ~3s typical. Add concurrency if it ever feels slow.
- **Local HTTP proxies** (Clash, Surge etc.) can intercept `curl localhost:3000` — use `--noproxy '*'` or `unset http_proxy https_proxy`.
