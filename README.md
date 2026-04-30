# TuneFerry

**English** · [简体中文](./README.zh-CN.md)

Migrate **public** Spotify or NetEase Cloud Music playlists to Apple Music. Paste any `open.spotify.com/playlist/...` or `music.163.com/playlist?id=...` URL and TuneFerry fuzzy-matches every track against the Apple Music catalog, then hands you a tappable Apple Music deep-link list (plus an iOS Shortcut for one-tap bulk add) to bring it home.

> **Zero subscriptions, zero API keys.** TuneFerry reads Spotify by scraping the public embed page (the same data Spotify shows to anyone visiting your playlist URL — no Premium, no OAuth, no client secret). It reads Apple Music with a WebPlay-scraped Developer Token. Apple's "add to library/playlist" still happens on your own device — TuneFerry generates the deep links, you tap.

## How it works

```
Public playlist URL (Spotify / NetEase)
        │
        ▼
   [/import]   ←─ paste URL, auto-detect source, fetch via embed scrape or v6 API
        │
        ▼
   POST /api/match   ←─ fuzzy match (token Jaccard + duration penalty)
        │
        ▼
   [/match]    ←─ confidence pills, manual candidate picker
        │
        ▼
   [/export]   ←─ Apple Music deep-link list + iOS Shortcut for bulk add
```

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript. Single-process `next dev` on :3000.
- **Styling:** OKLCH CSS-variable token system + inline styles + a small `primitives.tsx` component library. No UI framework, no CSS Modules. Responsive layout via utility classes in `globals.css` with a single 820px breakpoint.
- **i18n:** [next-intl](https://next-intl-docs.vercel.app/) 4.x, client-only mode (no URL routing). EN / ZH messages in `src/i18n/messages/`. Locale switches live on the existing tweaks store (Settings → Appearance → Language).
- **Spotify:** Embed-page scraping (`https://open.spotify.com/embed/playlist/<id>`). Pulls the SSR'd `__NEXT_DATA__` JSON, walks to the track list. **No OAuth, no API keys, no env vars.**
- **NetEase Cloud Music:** Two-stage public-API fetch (`/api/v6/playlist/detail` for meta + trackIds, then batched `/api/song/detail`). Anonymous, no cookies, no encryption. URL parser handles 4 NetEase URL forms + bare numeric IDs.
- **Apple Music:** Catalog search via `amp-api.music.apple.com` with a WebPlay-scraped Developer Token. Fuzzy matching written from scratch (token Jaccard + duration penalty). No `fuse.js` / `string-similarity` — ~30 lines.
- **Quality:** Biome (lint + format + import sort), TypeScript strict, Vitest (**121 tests across 11 files** as of multi-source migration — covers `src/lib/**`, `src/app/api/**` route handlers, and pure helpers under `src/hooks/**`), husky pre-commit hook.

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
│   │   ├── export/page.tsx          # Step 3: Apple Music deep-link list + Shortcut bulk-add panel
│   │   ├── settings/page.tsx        # Storefront / appearance / Apple token
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── apple-music/
│   │       │   ├── developer-token/route.ts
│   │       │   └── catalog/search/route.ts
│   │       ├── netease/
│   │       │   └── playlist/route.ts         # GET — public playlist via /api/v6 + /api/song/detail
│   │       ├── spotify/
│   │       │   └── playlist/route.ts        # GET — public playlist via embed scrape
│   │       └── match/route.ts                # POST — Apple catalog fuzzy match
│   ├── components/                  # primitives, icons, AppShell, Sidebar, TopNav, MobileNav, TweaksPanel, Providers
│   ├── hooks/                       # useLocalStorage, useStorefront, useTweaks (+ sanitizeTweaks unit tests)
│   ├── i18n/
│   │   ├── I18nProvider.tsx         # Picks messages from useTweaks().tweaks.locale
│   │   └── messages/{en,zh}.json    # Per-page namespaces (nav/home/import/match/export/settings)
│   ├── api/appleMusicApi.ts         # client-side fetch wrapper for /api/apple-music/*
│   ├── types/appleMusic.ts          # frontend Apple types
│   └── lib/
│       ├── appleMusicService.ts     # searchCatalog + findFirstByQuery (Origin/UA-locked)
│       ├── developerTokenService.ts # returns prebaked token, or signs JWT (ES256) if APPLE_TEAM_ID + KEY are set
│       ├── env.ts                   # typed env (Apple only — no Spotify env vars)
│       ├── httpError.ts
│       ├── nextHandler.ts           # withErrorHandler / pickQuery / pickHeader / pickInt
│       ├── matchService.ts          # fuzzy match (token Jaccard + duration penalty)
│       ├── neteaseService.ts        # extractPlaylistId + fetchPublicPlaylist (v6 + song/detail)
│       ├── sourceDetector.ts        # detect SourceType from URL ('spotify' | 'netease')
│       ├── spotifyService.ts        # extractPlaylistId + fetchPublicPlaylistViaEmbed
│       └── types/{appleMusic,netease,source,spotify}.ts
├── next.config.js
├── tsconfig.json    # @/* → ./src/*
├── biome.json
└── vitest.config.ts
```

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

Set `APPLE_MUSIC_DEVELOPER_TOKEN` (and optionally `NEXT_PUBLIC_DEFAULT_STOREFRONT`) in Vercel's dashboard (or `vercel env add`). No Spotify env vars are needed.

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
- **Vitest 2** covers `src/lib/**`, `src/app/api/**` route handlers, and pure hook helpers under `src/hooks/**` — **121 tests across 11 files** as of multi-source migration. Vitest mirrors tsconfig's `@/*` → `./src/*` alias in `vitest.config.ts` so route tests can `import` the same way Next.js does.
- **Pre-commit gate**: `.husky/pre-commit` runs `npm run check` + `npm run typecheck` on every commit. Tests run in `validate` (CI).
- **No backdoor**: don't `git commit --no-verify` unless really stuck.
