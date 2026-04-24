# Apple Music Library Organizer

A web app that connects to your Apple Music account, searches the Apple Music catalog and your personal library, and adds tracks/albums/playlists to your library with one click. Deployable to Vercel as a single project (static frontend + serverless API functions on the same origin).

## Tech Stack

- **Frontend:** React 18 + TypeScript, built with Vite. Plain CSS Modules — no UI framework on purpose.
- **Backend (production):** Per-route serverless functions under `/api/**`, running on Vercel's `@vercel/node` runtime.
- **Backend (local dev):** A thin Express server in `server/` that mounts the exact same service layer. Provided for familiar workflow; never deployed.
- **Shared:** `lib/` holds every service, type, and util consumed by both runtimes.

## Project Layout

```
AM-API/
├── api/                          # Vercel serverless functions (production backend)
│   ├── health.ts                 # GET  /api/health
│   └── apple-music/
│       ├── developer-token.ts    # GET  /api/apple-music/developer-token
│       ├── catalog/
│       │   └── search.ts         # GET  /api/apple-music/catalog/search
│       └── me/library/
│           ├── index.ts          # POST /api/apple-music/me/library
│           ├── search.ts         # GET  /api/apple-music/me/library/search
│           └── playlists.ts      # GET  /api/apple-music/me/library/playlists
├── lib/                          # Shared: services, types, env, error, handler wrapper
│   ├── appleMusicService.ts
│   ├── developerTokenService.ts
│   ├── env.ts
│   ├── handler.ts                # withErrorHandler, pickQuery, pickHeader, requireMethod
│   ├── httpError.ts
│   └── types/appleMusic.ts
├── client/                       # Vite + React + TS frontend
├── server/                       # Local Express dev server (imports /lib)
├── vercel.json                   # buildCommand, outputDirectory, SPA rewrites
├── .vercelignore                 # strips server/ and .p8 from Vercel bundles
└── tsconfig.json                 # root tsconfig — typechecks lib/ + api/
```

## Quick Start (local dev)

```bash
# 1. Install (uses npm workspaces)
npm install

# 2. Configure environment
cp .env.example .env
#   MVP: paste a pre-generated Developer Token into APPLE_MUSIC_DEVELOPER_TOKEN.
#   Proper: set APPLE_TEAM_ID + APPLE_KEY_ID + APPLE_PRIVATE_KEY_PATH.

# 3. Run both servers
npm run dev
#   Express on  http://localhost:8787   (Vite proxies /api -> here)
#   Vite   on   http://localhost:5173   (open this)
```

To instead run locally with Vercel's runtime (so `/api/**` is served by the same code path as production):

```bash
npx vercel dev
# Serves / (client) and /api/** (serverless functions) on one port.
# Note: you'll skip the Express server entirely — it's redundant with `vercel dev`.
```

## Environment Variables

See [`.env.example`](./.env.example). Key ones:

| Var | Purpose |
| --- | --- |
| `APPLE_MUSIC_DEVELOPER_TOKEN` | Optional pre-generated Developer Token. Skips JWT signing. |
| `APPLE_TEAM_ID` | Apple Developer Team ID (10 chars). |
| `APPLE_KEY_ID` | Key ID of your Media Services (.p8) key. |
| `APPLE_PRIVATE_KEY_PATH` | Absolute path to the `.p8` file. Works locally only. |
| `APPLE_PRIVATE_KEY` | Inline PEM. **Required** on Vercel (no filesystem for secrets). |
| `PORT` | Local Express port (default 8787). Ignored on Vercel. |
| `CLIENT_ORIGIN` | Local CORS origin(s) for Express. Ignored on Vercel (same origin). |

## Deploying to Vercel

One project, one domain, frontend + API served together.

1. **Link the repo to Vercel** — from a shell:
   ```bash
   npx vercel link        # picks this repo as a new Vercel project
   ```
   Or import it in the Vercel dashboard; framework preset should be left as "Other" (we ship our own `vercel.json`).
2. **Set environment variables** in *Project Settings → Environment Variables* (or via `vercel env add`):
   - `APPLE_MUSIC_DEVELOPER_TOKEN` (MVP), OR
   - `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` (paste the full PEM).
   - **Do not** use `APPLE_PRIVATE_KEY_PATH` on Vercel — there is no file to read.
3. **Deploy**:
   ```bash
   npx vercel deploy      # preview
   npx vercel --prod      # production
   ```
   Vercel runs `npm install` and `npm run build` (builds the client), while `/api/**` gets compiled per-file to individual serverless functions automatically.
4. **SPA routes:** `vercel.json` rewrites any non-`/api/` path to `/index.html` so React Router works on hard refreshes.

### Why serverless functions, not one Express handler

Each route under `/api/**` is its own `@vercel/node` function. The shared code sits in `/lib/*` and is imported by both the functions and the local Express server. Swapping to one-big-Express would work with `@vercel/node` too, but we chose per-route to keep cold starts small and make individual route timeouts/logs easy to reason about.

### Developer Token on Vercel

- MVP flow: paste a pre-minted Developer Token into `APPLE_MUSIC_DEVELOPER_TOKEN` and the function returns it verbatim.
- Signing flow: paste your private key's PEM content into `APPLE_PRIVATE_KEY`. `lib/developerTokenService.ts` reads it, calls `jsonwebtoken.sign` with ES256, and caches the signed JWT in warm function memory.

## Backend Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Smoke test. |
| GET | `/api/apple-music/developer-token` | Returns `{ developerToken }`. |
| GET | `/api/apple-music/catalog/search?term=&storefront=&types=&limit=` | Catalog proxy. |
| GET | `/api/apple-music/me/library/search?term=&types=&limit=` | Needs `x-music-user-token`. |
| POST | `/api/apple-music/me/library` | Body `{ "type": "songs"\|"albums"\|"playlists"\|"music-videos", "ids": string[] }`. Needs `x-music-user-token`. |
| GET | `/api/apple-music/me/library/playlists?limit=&offset=` | Needs `x-music-user-token`. |

All errors follow the shape:

```json
{ "error": { "message": "string", "status": 401, "details": "optional" } }
```

## How to get an Apple Music Developer Token

1. Enrol in the [Apple Developer Program](https://developer.apple.com/programs/).
2. In the [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/) console, create a **Media Services** key (enable *MusicKit*). Download the `.p8` file — you can only download it once.
3. Note the **Key ID** (shown in the portal) and your **Team ID** (top right).
4. Put those values in `.env` locally, and in Vercel's env vars for production. Keep the `.p8` out of the repo (already gitignored).

## Connecting a user

The frontend uses [MusicKit on the Web](https://developer.apple.com/documentation/musickitjs) (v3) loaded from Apple's CDN. `Connect Apple Music`:

1. Fetches a Developer Token from `/api/apple-music/developer-token`.
2. Calls `MusicKit.configure({ developerToken, app })`.
3. Opens Apple's consent popup.
4. Returns a **Music User Token**, which the SPA stores in `localStorage` and forwards via the `x-music-user-token` header.

Your backend never persists the Music User Token — it only forwards it to `api.music.apple.com`.

## Scripts

From the repo root:

```bash
npm run dev            # Express + Vite in parallel (local dev)
npm run build          # Build the client for Vercel
npm run typecheck      # api/ + server/ + client/ in parallel
```

## Roadmap

- [x] Phase 1 — Project scaffold
- [x] Phase 2 — Express backend + service layer
- [x] Phase 3 — React router, layout, pages
- [x] Phase 4 — MusicKit authorisation flow
- [x] Phase 5 — Apple Music catalog search
- [x] Phase 6 — User library search
- [x] Phase 7 — Add-to-library
- [x] Phase 8 — Library playlists
- [x] Phase 9 — Error handling, empty/loading states, README polish
- [x] Phase 10 — Vercel deployment target (per-route serverless functions, shared `/lib`)
- [ ] Next — Organizer actions (group by artist/album, missing tracks, bulk add to playlist)
- [ ] Next — Server-side session for Music User Token (replace `localStorage`)
- [ ] Next — Paginated catalog/library results

## Known Limitations (MVP)

- Music User Token lives in `localStorage`. Production should move it behind an HttpOnly session cookie or server-side store.
- No rate-limit handling — upstream Apple errors pass through verbatim in the `details` field.
- `createLibraryPlaylist` exists in `lib/appleMusicService.ts` but isn't exposed as a route yet.
- On Vercel, warm functions cache a signed Developer Token in-process. Cold starts re-sign, which is cheap but not free — a future optimisation could share the cache via Vercel KV.
