# Apple Music Library Organizer

**English** · [简体中文](./README.zh-CN.md)

A web app that connects to your Apple Music account, searches the Apple Music catalog and your personal library, and adds tracks/albums/playlists to your library with one click. Built as a single **Next.js 14** app, deployable to Vercel.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript, single-process dev via `next dev`.
- **Styling:** inline styles driven by an OKLCH CSS-variable token system, plus a small `primitives.tsx` component library. No UI framework, no CSS Modules.
- **Design system:** dark/light themes, glass/flat surface, sidebar/topnav/mobile navigation modes, runtime-configurable accent hue — all via `useTweaks()`.
- **Backend:** Next.js Route Handlers under `src/app/api/**/route.ts`. Shared services live in `src/lib/` and are imported via the `@/` alias.
- **Token source:** WebPlay-scraped Developer Token (see [Configuration](#configuration)). Pair with the `amp-api.music.apple.com` endpoint.
- **Quality gate:** Biome (lint + format + import sort), TypeScript strict, Vitest on `src/lib/**` + `src/app/api/**`, husky pre-commit hook.

## Project Layout

```
AM-API/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout (fonts + MusicKit <Script> + Providers)
│   │   ├── page.tsx          # / (Home)
│   │   ├── globals.css       # OKLCH tokens + base classes
│   │   ├── dashboard/page.tsx
│   │   ├── search/page.tsx
│   │   ├── library/page.tsx
│   │   ├── organizer/page.tsx
│   │   ├── settings/page.tsx
│   │   └── api/
│   │       ├── health/route.ts
│   │       └── apple-music/
│   │           ├── developer-token/route.ts
│   │           ├── catalog/search/route.ts
│   │           └── me/library/
│   │               ├── route.ts           # POST add-to-library
│   │               ├── search/route.ts
│   │               └── playlists/route.ts
│   ├── components/           # primitives, icons, AppShell, Sidebar, TopNav, MobileNav, MusicKitProvider, TweaksPanel, Providers
│   ├── hooks/                # useLocalStorage, useMusicKit, useTweaks
│   ├── api/appleMusicApi.ts  # client-side fetch wrappers
│   ├── types/appleMusic.ts   # frontend types
│   └── lib/                  # shared: appleMusicService, developerTokenService, validators, nextHandler, httpError, env, types
├── next.config.js
├── tsconfig.json
├── biome.json
└── vitest.config.ts
```

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure environment — paste your scraped Developer Token
cp .env.example .env
#   Fill APPLE_MUSIC_DEVELOPER_TOKEN (see Configuration below)

# 3. Run dev (single process, port 3000)
npm run dev
# → http://localhost:3000
```

> **If you have a local HTTP proxy** (Clash, surge, Shadowsocks, etc.), `curl localhost:3000/...` may 503 because the proxy intercepts. Use `curl --noproxy '*' http://localhost:3000/...` or `unset http_proxy https_proxy` in your shell.

## Configuration

Copy [`.env.example`](./.env.example) to `.env` and fill in:

| Var | Purpose |
| --- | --- |
| `APPLE_MUSIC_DEVELOPER_TOKEN` | **Required.** A Developer Token string (see below). |
| `NEXT_PUBLIC_DEFAULT_STOREFRONT` | Optional. Initial storefront (`us`, `jp`, `hk`, …). Defaults to `us`. |
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_PRIVATE_KEY_PATH` | Optional. Only used if you want the server to mint its own JWT (requires an Apple Developer Program subscription). |

### Getting a Developer Token

**Two paths:**

**(A) Official** — requires [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr). Create a Media Services key with MusicKit enabled, download the `.p8`, then either:
- Paste a pre-signed token into `APPLE_MUSIC_DEVELOPER_TOKEN`, OR
- Set `APPLE_TEAM_ID` + `APPLE_KEY_ID` + `APPLE_PRIVATE_KEY` (inline PEM) and the server signs its own.

**(B) WebPlay scraping** — no subscription needed, but **unofficial and subject to change without notice**. Fetch `https://beta.music.apple.com`, grab the `index-legacy-*.js` filename from the HTML, fetch that JS, extract the `eyJh...` JWT via regex. The scraped token:
- Has a `root_https_origin: ["apple.com"]` claim, so all backend fetches include `Origin: https://music.apple.com` + a desktop User-Agent (enforced in `src/lib/appleMusicService.ts`; locked by tests).
- Uses `https://amp-api.music.apple.com/v1` as the API base (Apple's Web player endpoint, paired with WebPlay tokens).
- Lives ~72 days. Re-scrape when it expires and replace `APPLE_MUSIC_DEVELOPER_TOKEN` in `.env`.

## Deployment

This is a vanilla Next.js app. Deploy to Vercel:

```bash
npx vercel link     # once
npx vercel --prod
```

Vercel auto-detects Next.js; `npm run build` produces the production bundle. Set environment variables in the Vercel project dashboard (or `vercel env add`).

## Scripts

```bash
npm run dev            # next dev (port 3000)
npm run build          # next build
npm run start          # next start (production server after build)
npm run typecheck      # tsc --noEmit
npm run check          # Biome lint + format + import sort
npm run check:fix      # same, with autofixes applied
npm run test           # Vitest, single run
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Vitest + v8 coverage
npm run validate       # check + typecheck + test in parallel (CI)
npm run clean          # rm .next + coverage
```

## Code Quality

- **Biome** handles lint, formatter, and import sort in a single binary. Config: [`biome.json`](./biome.json).
- **TypeScript strict mode** across the entire `src/` tree. Path alias `@/*` → `./src/*`.
- **Vitest 2** covers `src/lib/**` and `src/app/api/**` (Node environment).
- **Pre-commit gate:** `.husky/pre-commit` runs `npm run check` + `npm run typecheck` before every commit. Tests run in `validate` (CI).
- Bypass: `git commit --no-verify` — use sparingly.

## Roadmap

- [x] Phase 1 — Project scaffold
- [x] Phase 2 — Backend service layer
- [x] Phase 3 — React router, layout, pages
- [x] Phase 4 — MusicKit authorisation flow
- [x] Phase 5 — Apple Music catalog search
- [x] Phase 6 — User library search
- [x] Phase 7 — Add-to-library
- [x] Phase 8 — Library playlists
- [x] Phase 9 — Error handling, empty/loading states
- [x] Phase 10 — Vercel deployment target (per-route serverless functions)
- [x] Phase 11 — Dropped Express; single backend runtime
- [x] Phase 12 — Biome + husky pre-commit gate; MusicKitProvider ref → state refactor
- [x] Phase 13 — Vitest 2 with seed suite for `parseAddToLibraryBody`
- [x] Phase 14 — UI rebuilt against the design prototype (OKLCH tokens, primitives, Dashboard page, responsive shell)
- [x] Phase 15 — Accept WebPlay-scraped Developer Tokens via `amp-api.music.apple.com` with Origin/UA headers; 3 lock-in tests
- [x] Phase 16 — Rebuilt on Next.js 14 App Router (single-process `next dev`, file-system routing, `src/` layout, `@/` alias)
- [ ] Next — Organizer actions (group by artist/album, missing tracks, bulk add to playlist)
- [ ] Next — Server-side session for Music User Token (replace `localStorage`)
- [ ] Next — Paginated catalog/library results
- [ ] Next — Client-side React component tests (jsdom + @testing-library/react under `src/`)

## Known Limitations (MVP)

- Music User Token lives in `localStorage`. Production should move it behind an HttpOnly session cookie or server-side store.
- No rate-limit handling — upstream Apple errors pass through verbatim in the `details` field.
- `createLibraryPlaylist` exists in `src/lib/appleMusicService.ts` but isn't exposed as a route yet.
- The scraped WebPlay token approach is unofficial. Apple can break it any time by changing the front-end bundle name, the JWT claim shape, or adding origin enforcement we don't meet. Rebuild expectations accordingly.
- Local HTTP proxies (Clash etc.) can intercept `curl localhost:3000` — use `--noproxy '*'` or unset `http_proxy`/`https_proxy`.
