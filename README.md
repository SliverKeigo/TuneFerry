# Apple Music Library Organizer

A web app that connects to your Apple Music account, searches the Apple Music catalog and your personal library, and adds tracks/albums/playlists to your library with one click. Deployed as a single Vercel project — static frontend + per-route serverless functions on the same origin.

## Tech Stack

- **Frontend:** React 18 + TypeScript, built with Vite. Plain CSS Modules — no UI framework on purpose.
- **Backend:** Per-route serverless functions under `/api/**`, running on Vercel's `@vercel/node` runtime. Apple Music API proxy + Developer Token minting.
- **Local dev:** `vercel dev` runs the exact same functions on your machine, proxied by Vite for HMR.
- **Shared:** `lib/` holds every service, type, validator, and util consumed by the functions.
- **Quality gate:** Biome (lint + format + import sort) and TypeScript strict, both enforced on every commit by a husky pre-commit hook. See [Code Quality](#code-quality).

## Project Layout

```
AM-API/
├── api/                          # Vercel serverless functions (the backend)
│   ├── health.ts                 # GET  /api/health
│   └── apple-music/
│       ├── developer-token.ts    # GET  /api/apple-music/developer-token
│       ├── catalog/
│       │   └── search.ts         # GET  /api/apple-music/catalog/search
│       └── me/library/
│           ├── index.ts          # POST /api/apple-music/me/library
│           ├── search.ts         # GET  /api/apple-music/me/library/search
│           └── playlists.ts      # GET  /api/apple-music/me/library/playlists
├── lib/                          # Shared code imported by every function
│   ├── appleMusicService.ts      # All Apple Music REST calls
│   ├── developerTokenService.ts  # JWT (ES256) signing + in-memory cache
│   ├── env.ts                    # Typed env, dotenv for local dev
│   ├── handler.ts                # withErrorHandler, pickQuery, pickHeader, ...
│   ├── httpError.ts              # HttpError with status + details
│   ├── validators.ts             # Request body validation (shared)
│   └── types/appleMusic.ts       # Apple Music response shapes
├── client/                       # Vite + React + TS frontend
├── vercel.json                   # buildCommand, outputDirectory, SPA rewrites
├── .vercelignore                 # strips .vercel/ and .p8 from deploy bundles
└── tsconfig.json                 # typechecks lib/ + api/
```

## Quick Start

The local dev loop uses two processes in parallel: `vercel dev` (serves `/api/**`) and Vite (serves the client with HMR, proxying `/api` to `vercel dev`).

```bash
# 1. Install
npm install

# 2. Link the repo to a Vercel project — REQUIRED before `npm run dev`
#    Otherwise `vercel dev` races an interactive link prompt against Vite's boot.
npx vercel login          # OAuth via your Vercel account
npx vercel link           # creates .vercel/ — gitignored

# 3. Configure environment
cp .env.example .env
#   MVP path:       paste a Developer Token into APPLE_MUSIC_DEVELOPER_TOKEN
#   Signing path:   set APPLE_TEAM_ID + APPLE_KEY_ID + APPLE_PRIVATE_KEY (inline PEM)

# 4. Run both dev servers
npm run dev
#   vercel dev  →  http://localhost:3000   (serves /api/**)
#   vite        →  http://localhost:5173   (open this — proxies /api to :3000)
```

## Environment Variables

See [`.env.example`](./.env.example). Key fields:

| Var | Purpose |
| --- | --- |
| `APPLE_MUSIC_DEVELOPER_TOKEN` | Optional pre-generated token. Skips JWT signing entirely. |
| `APPLE_TEAM_ID` | Apple Developer Team ID (10 chars). |
| `APPLE_KEY_ID` | Key ID of your Media Services (.p8) key. |
| `APPLE_PRIVATE_KEY` | Inline PEM. **Takes precedence**. Required on Vercel. |
| `APPLE_PRIVATE_KEY_PATH` | Local-only fallback: absolute path to the `.p8` file. |
| `APPLE_TOKEN_TTL_SECONDS` | JWT lifetime; default ~6 months (Apple's max). |
| `VITE_API_BASE_URL` | Vite's `/api` proxy target during dev. Default `http://localhost:3000`. |
| `VITE_DEFAULT_STOREFRONT` | Initial storefront the client boots with (`us`, `hk`, `tw`, `jp`, ...). |

## Deploying to Vercel

1. **Link & push:**
   ```bash
   npx vercel link       # once
   git push              # your remote if you wired one up
   npx vercel --prod     # one-shot production deploy from CLI
   ```
   Or import the repo from the Vercel dashboard; framework preset is "Other" (the root `vercel.json` controls the build).
2. **Set env vars** in *Project Settings → Environment Variables* (or `vercel env add`):
   - `APPLE_MUSIC_DEVELOPER_TOKEN` (MVP), OR
   - `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` (the full PEM content, with line breaks escaped or preserved — both work).
   - **Never** use `APPLE_PRIVATE_KEY_PATH` on Vercel — there is no persistent file.
3. **Build model:**
   - Vercel runs `npm install` and `npm run build` → `client/dist` is served statically.
   - Every `.ts` under `/api/**` is compiled independently by `@vercel/node` into its own function. Shared imports from `lib/` are traced and bundled automatically.
4. **SPA routing:** `vercel.json` rewrites any non-`/api/` path to `/index.html` so React Router works on hard refreshes. Static files (assets, favicon) take precedence because Vercel's filesystem handler runs before rewrites.

### Developer Token on Vercel

- MVP flow: paste a pre-minted token into `APPLE_MUSIC_DEVELOPER_TOKEN`; the function returns it verbatim with `Cache-Control: private, max-age=300`.
- Signing flow: paste the PEM into `APPLE_PRIVATE_KEY`. `lib/developerTokenService.ts` signs a JWT with ES256 on first request and caches it in warm function memory.

## Backend Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Smoke test. |
| GET | `/api/apple-music/developer-token` | Returns `{ developerToken }`. Cached 5 min on the client. |
| GET | `/api/apple-music/catalog/search?term=&storefront=&types=&limit=` | Catalog proxy. |
| GET | `/api/apple-music/me/library/search?term=&types=&limit=` | Needs `x-music-user-token`. |
| POST | `/api/apple-music/me/library` | Body `{ "type": "songs"\|"albums"\|"playlists"\|"music-videos", "ids": string[] }`. Needs `x-music-user-token`. |
| GET | `/api/apple-music/me/library/playlists?limit=&offset=` | Needs `x-music-user-token`. |

All errors follow:

```json
{ "error": { "message": "string", "status": 401, "details": "optional" } }
```

## How to get an Apple Music Developer Token

1. Enrol in the [Apple Developer Program](https://developer.apple.com/programs/).
2. In the [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/) console, create a **Media Services** key (enable *MusicKit*). Download the `.p8` file — you can only download it once.
3. Note the **Key ID** (shown in the portal) and your **Team ID** (top right).
4. Paste into `.env` locally and into Vercel's env vars for production. Keep the `.p8` out of the repo.

## Connecting a user

The frontend loads [MusicKit on the Web](https://developer.apple.com/documentation/musickitjs) v3 from Apple's CDN. `Connect Apple Music`:

1. Fetches a Developer Token from `/api/apple-music/developer-token`.
2. Calls `MusicKit.configure({ developerToken, app })`.
3. Opens Apple's consent popup.
4. Returns a **Music User Token**, stored in `localStorage` and forwarded to backend calls via the `x-music-user-token` header.

The backend never persists the Music User Token — it only forwards it to `api.music.apple.com`.

## Scripts

```bash
npm run dev          # vercel dev + vite in parallel
npm run build        # build the client (api is built by Vercel on deploy)
npm run typecheck    # api + client in parallel
npm run check        # Biome lint + format + import sort (whole repo)
npm run check:fix    # same, with safe autofixes applied
npm run validate     # check + typecheck in parallel (what CI should run)
npm run clean        # rm client/dist
```

## Code Quality

- **Biome** handles lint, formatter, and import sort in a single binary. Config: [`biome.json`](./biome.json).
- **TypeScript strict mode** across `lib/`, `api/`, and `client/`.
- **Pre-commit gate:** `.husky/pre-commit` runs `npm run check` (Biome, whole repo) and `npm run typecheck` before every commit. The hook is installed automatically by `npm install` via husky's `prepare` script. If either check fails, the commit is rejected.
- If you need to bypass the hook for an emergency, `git commit --no-verify` still works — use sparingly.

## Roadmap

- [x] Phase 1 — Project scaffold
- [x] Phase 2 — Backend service layer
- [x] Phase 3 — React router, layout, pages
- [x] Phase 4 — MusicKit authorisation flow
- [x] Phase 5 — Apple Music catalog search
- [x] Phase 6 — User library search
- [x] Phase 7 — Add-to-library
- [x] Phase 8 — Library playlists
- [x] Phase 9 — Error handling, empty/loading states, README polish
- [x] Phase 10 — Vercel deployment target (per-route serverless functions, shared `/lib`)
- [x] Phase 11 — Dropped Express; single backend runtime (`vercel dev` locally, functions in prod)
- [x] Phase 12 — Biome + husky pre-commit gate; MusicKitProvider ref → state refactor (no more hook-deps suppressions); StrictMode-safe `MusicKit.configure()`
- [ ] Next — Organizer actions (group by artist/album, missing tracks, bulk add to playlist)
- [ ] Next — Server-side session for Music User Token (replace `localStorage`)
- [ ] Next — Paginated catalog/library results

## Known Limitations (MVP)

- Music User Token lives in `localStorage`. Production should move it behind an HttpOnly session cookie or server-side store.
- Vercel functions have no explicit CORS — they rely on browsers' same-origin policy since the client and `/api` share a domain. Cross-origin callers hitting `/api/apple-music/developer-token` will succeed, which is acceptable because the token is not itself a secret (it's built to be handed to the browser).
- No rate-limit handling — upstream Apple errors pass through verbatim in the `details` field.
- `createLibraryPlaylist` is present in `lib/appleMusicService.ts` but not yet exposed as a route.
- Cold-start functions re-sign the Developer Token. Cheap (~1ms with `jsonwebtoken` ES256) but not zero.
- `vercel dev` requires a Vercel account for first-time link. Purely-offline devs can work against a preview URL instead.
