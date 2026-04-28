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
- **Styling:** OKLCH CSS-variable token system + inline styles + a small `primitives.tsx` component library. No UI framework, no CSS Modules. Responsive layout via utility classes in `globals.css` with a single 820px breakpoint.
- **i18n:** [next-intl](https://next-intl-docs.vercel.app/) 4.x, client-only mode (no URL routing). EN / ZH messages in `src/i18n/messages/`. Locale switches live on the existing tweaks store (Settings → Appearance → Language).
- **Spotify:** Embed-page scraping (`https://open.spotify.com/embed/playlist/<id>`). Pulls the SSR'd `__NEXT_DATA__` JSON, walks to the track list. **No OAuth, no API keys, no env vars.**
- **Apple Music:** Catalog search via `amp-api.music.apple.com` with a WebPlay-scraped Developer Token. Fuzzy matching written from scratch (token Jaccard + duration penalty). No `fuse.js` / `string-similarity` — ~30 lines.
- **Quality:** Biome (lint + format + import sort), TypeScript strict, Vitest (67 tests across 8 files — covers `src/lib/**`, `src/app/api/**` route handlers, and pure helpers under `src/hooks/**`), husky pre-commit hook.

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
│       ├── spotifyService.ts        # extractPlaylistId + fetchPublicPlaylistViaEmbed
│       └── types/{appleMusic,spotify}.ts
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
- **Vitest 2** covers `src/lib/**`, `src/app/api/**` route handlers, and pure hook helpers under `src/hooks/**` — **67 tests across 8 files** as of Phase 21. Vitest mirrors tsconfig's `@/*` → `./src/*` alias in `vitest.config.ts` so route tests can `import` the same way Next.js does.
- **Pre-commit gate**: `.husky/pre-commit` runs `npm run check` + `npm run typecheck` on every commit. Tests run in `validate` (CI).
- **No backdoor**: don't `git commit --no-verify` unless really stuck.

## Roadmap

- [x] Phase 1–14 — Apple Music Library Organizer prototype (see git history)
- [x] Phase 15 — WebPlay-scraped Developer Token + amp-api endpoint
- [x] Phase 16 — Rebuilt on Next.js 14 App Router
- [x] Phase 17 — Pivot to TuneFerry: Spotify Web API + OAuth + ISRC matching wizard (subsequently rebuilt — see Phase 18)
- [x] Phase 18 — **Drop Spotify Web API entirely** (Premium-locked since 2024). Replaced with embed-page scraping for public playlists. Removed all OAuth, removed ISRC tier, simplified `/import` and `/settings`. Net −1500 / +400 lines, zero subscriptions
- [x] Phase 19 — Test coverage backfill: route handler integration tests for `/api/spotify/playlist` and `/api/match`, plus unit tests for `pickQuery`/`pickHeader`/`pickInt`, `findFirstByQuery`, and `getDeveloperToken`. Added Vitest `@/*` alias mirroring tsconfig. **34 → 59 tests**
- [x] Phase 20 — **i18n via next-intl** (EN / ZH, no URL routing). Locale persisted on the `useTweaks` store, `<html lang>` mirrored, full message bundles for nav + all five pages. Added `sanitizeTweaks` (allow-list per enum field, including the new `locale`) plus a `mounted` gate in `TweaksProvider` to eliminate SSR hydration warnings. Sidebar widened to 268px, TopNav grown to 64px and centered against a 1280px column. **+8 tests for the sanitizer / self-heal write path**
- [x] Phase 21 — **Responsive layout, 820px breakpoint** (matches AppShell's mobile media query). All page `<main>`, the Match row, the sticky bar, the Export 2-col grid, PageHeader, SectionHeader, and Settings/Tweaks rows route through utility classes in `globals.css` so `@media` rules can cascade. Mobile (≤820px) collapses 3-card / 5-col / 2-col grids to a single column, stacks PageHeader right elements, narrows the candidate popover, lifts the sticky bar above MobileNav, and replaces a hardcoded oklch with `var(--bg-2)` so light theme no longer flashes dark. Verified end-to-end with Playwright across 1440 / 768 / 375 viewports
- [ ] Next — Per-storefront retry for tracks that miss in `us` (auto-fallback to `hk`/`tw`/`jp`)
- [ ] Next — Concurrency in `matchMany` for large playlists (currently serial)
- [ ] Next — iOS Shortcut export (one-tap add via Shortcuts app)
- [ ] Next — Client-side React component tests (jsdom + @testing-library/react)
- [ ] Next — Persist migration history (so users can resume across sessions)
- [ ] Next — Cookie-driven SSR locale + theme to fully eliminate the post-hydration default→user-value flicker

