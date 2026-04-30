import { HttpError } from './httpError';
import type {
  NeteasePlaylistDetailResponse,
  NeteaseRawSong,
  NeteaseSongDetailResponse,
} from './types/netease';
import type { SourcePlaylist, SourceTrack } from './types/source';

// We hit two unencrypted public endpoints on music.163.com:
//   - /api/v6/playlist/detail?id=<id>   → playlist meta + ordered trackIds[]
//   - /api/song/detail?ids=[...]        → full song data, batched per 100 IDs
//
// v6 only fully populates `tracks[]` for the first ~10 entries (the rest
// arrive only as IDs in `trackIds[]`). Rather than mix two field schemas, we
// throw v6's `tracks[]` away and re-fetch every track via /api/song/detail.
// One mapping path, no shape drift between the two response shapes.
//
// No cookie required for public playlists. Same risk profile as our Spotify
// embed scrape and Apple Music WebPlay token paths: NetEase can rename or
// gate these endpoints any time. We pin a desktop UA + Referer because the
// CDN serves stripped/blocked responses to non-browser-looking clients.

const NETEASE_BASE = 'https://music.163.com';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const NETEASE_REFERER = 'https://music.163.com/';

/** Max number of song IDs per `/api/song/detail` request. NetEase happily
 *  accepts more, but we keep the URL well under common 8KB request-line
 *  limits and play nicely with any intermediate proxies. */
const SONG_DETAIL_BATCH_SIZE = 100;

const NUMERIC_ID_PATTERN = /^\d+$/;

// ---------------------------------------------------------------------------
// Playlist URL parsing
// ---------------------------------------------------------------------------

/**
 * Accepts either a bare numeric NetEase playlist id or any of the URL forms
 * NetEase shares. Supported:
 *   - `https://music.163.com/playlist?id=12345`
 *   - `https://music.163.com/#/playlist?id=12345` (legacy hash routing)
 *   - `https://music.163.com/m/playlist?id=12345`
 *   - `https://y.music.163.com/m/playlist?id=12345`
 *   - `https://music.163.com/#/my/m/music/playlist?id=12345`
 *   - bare numeric: `'12345'`
 *
 * Throws `HttpError(400, ...)` for unparsable input — keeping all "user
 * supplied a bad string" failures in one place lets the route layer just
 * delegate without an extra null-check.
 */
export function extractPlaylistId(idOrUrl: string): string {
  const trimmed = idOrUrl.trim();
  if (!trimmed) {
    throw new HttpError(400, 'NetEase playlist id or URL is required.');
  }
  if (NUMERIC_ID_PATTERN.test(trimmed)) return trimmed;

  // The `#/playlist?id=...` form puts the query in the URL fragment, where
  // the standard URL parser ignores it. Strip the leading `#/` (or `#`)
  // before parsing so `URLSearchParams` finds the `id` param.
  let normalized = trimmed;
  const hashIndex = normalized.indexOf('#');
  if (hashIndex >= 0) {
    const afterHash = normalized.slice(hashIndex + 1).replace(/^\//, '');
    normalized = `${normalized.slice(0, hashIndex)}${afterHash.includes('?') ? `?${afterHash.split('?').slice(1).join('?')}` : ''}`;
    // If after stripping the fragment we lost the path entirely, fall back
    // to a synthetic URL so URL() can still parse the query.
    if (!/^https?:\/\//.test(normalized)) {
      normalized = `https://music.163.com/?${afterHash.split('?').slice(1).join('?')}`;
    }
  }

  try {
    const url = new URL(normalized);
    const id = url.searchParams.get('id');
    if (id && NUMERIC_ID_PATTERN.test(id)) return id;
  } catch {
    // Fall through to the generic error below.
  }

  throw new HttpError(400, `Could not parse NetEase playlist id from: ${idOrUrl}`);
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

/**
 * Wraps `fetch` with the desktop UA + Referer headers NetEase's edge expects
 * for public read endpoints. Returns parsed JSON. Surfaces:
 *   - `HttpError(429)` on rate-limit responses
 *   - `HttpError(502)` on any other network / non-2xx / parse failure
 *
 * AbortSignal is forwarded so callers (e.g. a route handler whose client
 * disconnected) can cancel in-flight calls instead of running them to
 * completion. Mirrors the `appleFetch` pattern used in `appleMusicService`.
 */
async function neteaseFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Referer: NETEASE_REFERER,
        Accept: 'application/json,text/plain,*/*',
      },
      signal,
    });
  } catch (err) {
    // Re-throw AbortError so route-layer 499 handling still kicks in.
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new HttpError(502, `NetEase request failed: ${(err as Error).message}`);
  }

  if (response.status === 429) {
    throw new HttpError(429, 'NetEase rate-limited the request');
  }
  if (!response.ok) {
    throw new HttpError(502, `NetEase request returned ${response.status}`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new HttpError(502, 'Failed to parse NetEase response as JSON');
  }
}

// ---------------------------------------------------------------------------
// Track normalization
// ---------------------------------------------------------------------------

function normalizeSong(raw: NeteaseRawSong): SourceTrack {
  const artists = Array.isArray(raw.artists)
    ? raw.artists
        .map((a) => a?.name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0)
    : [];

  return {
    sourceType: 'netease',
    // Stringify — NetEase IDs fit safely in a JS number today, but we
    // standardize on string across all sources to avoid precision risk and
    // keep `SourceTrack.id` a uniform shape downstream.
    id: String(raw.id),
    name: raw.name,
    artists,
    durationMs: typeof raw.duration === 'number' ? raw.duration : 0,
    albumName: raw.album?.name || undefined,
    coverUrl: raw.album?.picUrl || undefined,
    // NetEase doesn't expose a 30s preview URL on these endpoints, and
    // doesn't surface ISRCs publicly. Leave both undefined.
    previewUrl: undefined,
    isrc: undefined,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Fetches a public NetEase Cloud Music playlist + all its tracks via the
 * unencrypted v6 + song/detail endpoints. Returns a `SourcePlaylist` with
 * `sourceType: 'netease'`.
 *
 * Public-only: private playlists return `code !== 200` from v6 and surface
 * as `HttpError(404, ...)`. No cookie / login required.
 *
 * AbortSignal is threaded through to every fetch so cancellation propagates
 * end-to-end (v6 + each song-detail batch).
 */
export async function fetchPublicPlaylist(
  idOrUrl: string,
  signal?: AbortSignal,
): Promise<SourcePlaylist> {
  const id = extractPlaylistId(idOrUrl);

  // Stage 1: playlist meta + complete ordered ID list.
  const detail = await neteaseFetch<NeteasePlaylistDetailResponse>(
    `${NETEASE_BASE}/api/v6/playlist/detail?id=${id}`,
    signal,
  );
  if (detail.code !== 200 || !detail.playlist) {
    throw new HttpError(404, 'Playlist not found or private');
  }

  const playlist = detail.playlist;
  const trackIdEntries = Array.isArray(playlist.trackIds) ? playlist.trackIds : [];
  const orderedIds = trackIdEntries
    .map((entry) => entry?.id)
    .filter((n): n is number => typeof n === 'number');

  // Stage 2: batched song/detail. We chunk to keep URLs well under proxy
  // limits — NetEase itself accepts arbitrary batch sizes here.
  const songs: NeteaseRawSong[] = [];
  for (let i = 0; i < orderedIds.length; i += SONG_DETAIL_BATCH_SIZE) {
    const chunk = orderedIds.slice(i, i + SONG_DETAIL_BATCH_SIZE);
    // The `ids` param is a JSON-array-shaped string (`[12345,67890]`),
    // URI-encoded as a whole. Don't try to encode each ID separately.
    const idsParam = encodeURIComponent(`[${chunk.join(',')}]`);
    const batch = await neteaseFetch<NeteaseSongDetailResponse>(
      `${NETEASE_BASE}/api/song/detail?ids=${idsParam}`,
      signal,
    );
    if (batch.code !== 200) {
      throw new HttpError(502, `NetEase song/detail returned code ${batch.code}`);
    }
    if (Array.isArray(batch.songs)) {
      songs.push(...batch.songs);
    }
  }

  const tracks = songs.map(normalizeSong);

  return {
    sourceType: 'netease',
    id: String(playlist.id),
    name: playlist.name ?? '',
    owner: { displayName: playlist.creator?.nickname ?? '' },
    coverUrl: playlist.coverImgUrl || undefined,
    // Trust the server-reported total over our own array length so the
    // header counter stays correct even if /api/song/detail silently drops
    // a row (NetEase occasionally omits unavailable tracks).
    totalTracks: typeof playlist.trackCount === 'number' ? playlist.trackCount : tracks.length,
    tracks,
  };
}
