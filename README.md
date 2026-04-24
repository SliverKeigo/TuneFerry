# Apple Music Library Organizer

A local-first web app that connects to your Apple Music account, searches the Apple Music catalog and your personal library, and adds tracks/albums/playlists to your library with one click. Designed as a foundation for a deeper "library organizer" assistant.

> **Status:** MVP in progress — see [Roadmap](#roadmap).

## Tech Stack

- **Frontend:** React 18 + TypeScript, built with Vite. Styling is plain CSS Modules (no UI framework on purpose).
- **Backend:** Node.js 20+ with TypeScript, Express, and `jsonwebtoken` for signing Apple Music Developer Tokens.
- **Shared:** npm workspaces monorepo (`client/` + `server/`).

## Project Layout

```
AM-API/
├── client/           # Vite + React + TS frontend
├── server/           # Express + TS backend (proxies Apple Music API)
├── .env.example      # single source of truth for env configuration
├── package.json      # workspace root with dev/build scripts
└── README.md
```

## Quick Start

```bash
# 1. Install (from repo root — uses npm workspaces)
npm install

# 2. Configure environment
cp .env.example .env
#   Edit .env and either paste a pre-generated Developer Token
#   into APPLE_MUSIC_DEVELOPER_TOKEN, or fill APPLE_TEAM_ID / APPLE_KEY_ID
#   and APPLE_PRIVATE_KEY_PATH so the server can sign its own JWT.

# 3. Run dev (client on :5173, server on :8787)
npm run dev
```

Then open <http://localhost:5173>, click **Connect Apple Music**, and grant access when MusicKit prompts you.

## Environment Variables

See [`.env.example`](./.env.example) for the full list and inline comments. The most important ones:

| Var | Purpose |
| --- | --- |
| `APPLE_MUSIC_DEVELOPER_TOKEN` | Optional: paste a ready-made token. Skips JWT signing entirely. |
| `APPLE_TEAM_ID` | Apple Developer Team ID (10 chars). |
| `APPLE_KEY_ID` | Key ID of your Media Services (.p8) key. |
| `APPLE_PRIVATE_KEY_PATH` | Absolute path to the downloaded `.p8` file. |
| `APPLE_PRIVATE_KEY` | Inline PEM content (takes precedence over `_PATH`). |
| `PORT` | Server port (default 8787). |
| `CLIENT_ORIGIN` | Allowed CORS origin, default `http://localhost:5173`. |

> **Security:** never commit `.env` or `*.p8` files. `.gitignore` already excludes them.

## How to get an Apple Music Developer Token

1. Enrol in the [Apple Developer Program](https://developer.apple.com/programs/).
2. In the [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/) console, create a **Media Services** key (enable *MusicKit*). Download the `.p8` file — you can only download it once.
3. Note the **Key ID** (shown in the portal) and your **Team ID** (top right of the Apple Developer console).
4. Paste those values into `.env` and put the `.p8` somewhere outside the repo (or ignore it via `.gitignore`).
5. The server will mint a short-lived JWT Developer Token on demand.

## Connecting a user

The frontend uses [MusicKit on the Web](https://developer.apple.com/documentation/musickitjs) (`v3`) loaded from Apple's CDN. When you click **Connect Apple Music**, MusicKit:

1. Initialises with the Developer Token fetched from the backend.
2. Opens Apple's consent popup for the signed-in iCloud user.
3. Returns a **Music User Token**, which the SPA stores in `localStorage` and forwards to backend API calls via the `x-music-user-token` header.

The backend never stores the Music User Token — it only forwards it to `api.music.apple.com`.

## Scripts

From the repo root:

```bash
npm run dev          # client + server in parallel
npm run build        # builds both workspaces
npm run typecheck    # tsc --noEmit for both
npm start            # runs the compiled server (after build)
```

## Backend Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Smoke test. |
| GET | `/api/apple-music/developer-token` | Returns `{ developerToken }`. Either pre-baked or freshly signed. |
| GET | `/api/apple-music/catalog/search?term=&storefront=&types=&limit=` | Proxies catalog search. |
| GET | `/api/apple-music/me/library/search?term=&types=&limit=` | Requires `x-music-user-token` header. |
| POST | `/api/apple-music/me/library` | Body `{ "type": "songs"\|"albums"\|"playlists"\|"music-videos", "ids": string[] }`. Requires `x-music-user-token`. |
| GET | `/api/apple-music/me/library/playlists?limit=&offset=` | Requires `x-music-user-token`. |

All errors follow the shape:

```json
{ "error": { "message": "string", "status": 401, "details": "optional" } }
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
- [ ] Next — Organizer actions (group by artist/album, missing tracks, bulk add to playlist)
- [ ] Next — Server-side session for Music User Token instead of `localStorage`
- [ ] Next — Paginated catalog/library results

## Known Limitations (MVP)

- Music User Token is stored in `localStorage`. In production you should hold it in memory or an HttpOnly cookie behind your own session — see [MDN: Web Storage security](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API).
- Rate-limit handling is minimal — the backend passes through Apple's error responses.
- Only read + add-to-library endpoints are wired; playlist creation and destructive edits are deliberately out of scope.
