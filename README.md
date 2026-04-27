# TuneFerry

**English** · [简体中文](./README.zh-CN.md)

Migrate Spotify playlists to Apple Music. Paste a public playlist URL — or sign in to Spotify to bring private ones — and TuneFerry matches every track against the Apple Music catalog (ISRC-first, with a fuzzy fallback) and hands you a tappable deep-link list plus an `.m3u8` file.

> **Why?** Apple Music's API doesn't let third-party apps add tracks to a user's library programmatically without an Apple Developer Program subscription. TuneFerry sidesteps that: it surfaces Apple Music song deep links you tap on iOS / macOS — Apple's own client adds them.

## How it works

```
Spotify playlist URL or your account
        │
        ▼
   [/import]  ←─ paste URL or pick from "your playlists" after Spotify OAuth
        │
        ▼
   POST /api/match  →  ISRC lookup → fuzzy artist+title fallback
        │
        ▼
   [/match]  ←─ confidence pills, manual override picker, include/exclude
        │
        ▼
   [/export]  ←─ deep link list (copy all) + .m3u8 download
```

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript. Single-process `next dev` on :3000.
- **Styling:** OKLCH CSS-variable token system + inline styles + a small `primitives.tsx` component library. No UI framework, no CSS Modules.
- **Spotify:** Both Client Credentials (public playlists) and Authorization Code (private playlists) flows. OAuth state via signed HMAC, session via HttpOnly cookies. No `next-auth`, no `iron-session`.
- **Apple Music:** Catalog search via `amp-api.music.apple.com` with a WebPlay-scraped Developer Token. ISRC + fuzzy matching written from scratch (token Jaccard + duration penalty). No `fuse.js`/`string-similarity` — ~30 lines of code.
- **Quality:** Biome (lint + format + import sort), TypeScript strict, Vitest (37 tests), husky pre-commit hook.

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

### 1. Spotify (required)

Register an app at <https://developer.spotify.com/dashboard>:

1. Create an app, name it whatever
2. Add Redirect URI exactly: `http://localhost:3000/api/spotify/auth/callback` (and your prod URL)
3. Copy Client ID + Client Secret

```bash
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/auth/callback
SPOTIFY_STATE_SECRET=$(openssl rand -base64 32)
```

### 2. Apple Music Developer Token (required)

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
# Fill SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_STATE_SECRET, APPLE_MUSIC_DEVELOPER_TOKEN

# 3. Run
npm run dev
# → http://localhost:3000
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
- [x] Phase 17 — **Pivot to TuneFerry**: drop user-library code, add Spotify Web API integration (CC + OAuth flows), build ISRC + fuzzy match service, ship the Import → Match → Export wizard
- [ ] Next — Persist migration history (Supabase / Vercel Postgres) so users can resume
- [ ] Next — Concurrency in `matchMany` for large playlists (currently serial)
- [ ] Next — Surface Spotify display name (needs new `/api/spotify/me` route)
- [ ] Next — iOS Shortcut export (one-tap add)
- [ ] Next — Client-side React component tests (jsdom + @testing-library/react)

## Known Limitations (MVP)

- Apple Music has no public "add to library" API for non-subscribers; the deep link path is the only universal flow. iOS users tap each link; macOS Music app can also import the `.m3u8`.
- WebPlay-scraped tokens are unofficial. Apple can break them by changing the front-end bundle name, the JWT claim shape, or tightening Origin enforcement. Production users should consider Apple Developer Program.
- Spotify private playlist access requires the user's OAuth login each session (token refresh is automatic for 30 days; after that, sign in again).
- `matchMany` is serial — fine for ≤100 tracks; ~3s typical. Add concurrency if you migrate large playlists often.
- Local HTTP proxies can intercept `curl localhost:3000` — see above.
