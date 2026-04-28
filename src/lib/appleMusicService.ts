import { getDeveloperToken } from './developerTokenService';
import { HttpError } from './httpError';
import type {
  AppleMusicResource,
  AppleMusicSearchResponse,
  AppleMusicSongAttributes,
} from './types/appleMusic';

// Note: `findByIsrc` used to live here. It was only ever called by the
// deterministic ISRC branch of `matchService.matchOne`, which is gone now
// that we read Spotify playlists via the embed scrape (which strips ISRCs).
// The `filter[isrc]` endpoint still exists on Apple's side; bring the helper
// back if a future data source surfaces ISRCs again.

// `amp-api.music.apple.com` is the endpoint Apple's own Web player hits; it's
// the one paired with WebPlay Developer Tokens. The official public
// `api.music.apple.com` currently accepts these tokens too but is not
// documented to, so pin to amp-api to stay aligned with Apple's actual flow.
const APPLE_MUSIC_API_BASE = 'https://amp-api.music.apple.com/v1';

// WebPlay Developer Tokens carry a `root_https_origin: ["apple.com"]` claim
// that Apple enforces server-side: without a matching Origin header the API
// returns 401 even when Authorization is valid. User-Agent isn't strictly
// required today but defends against future tightening.
const BROWSER_ORIGIN = 'https://music.apple.com';
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  musicUserToken?: string;
  body?: unknown;
  /**
   * Forwarded to the underlying `fetch`. When the upstream caller (e.g. a
   * `/api/match` request whose client disconnected) cancels, in-flight Apple
   * Music calls abort instead of running to completion and burning the
   * developer-token quota.
   */
  signal?: AbortSignal;
}

async function throwOnHttpError(response: Response, contextMessage: string): Promise<void> {
  if (response.ok) return;
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = await response.text().catch(() => null);
  }
  throw new HttpError(response.status, `${contextMessage} (${response.status})`, payload);
}

async function appleFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const developerToken = getDeveloperToken();
  const url = new URL(`${APPLE_MUSIC_API_BASE}${path}`);

  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value === undefined || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${developerToken}`,
    Accept: 'application/json',
    Origin: BROWSER_ORIGIN,
    'User-Agent': BROWSER_USER_AGENT,
  };
  if (opts.musicUserToken) {
    headers['Music-User-Token'] = opts.musicUserToken;
  }
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  await throwOnHttpError(response, 'Apple Music API error');

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function searchCatalog(params: {
  term: string;
  storefront?: string;
  types?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<AppleMusicSearchResponse> {
  const storefront = params.storefront?.trim() || 'us';
  const types = params.types?.trim() || 'songs,albums,artists,playlists';
  return appleFetch<AppleMusicSearchResponse>(`/catalog/${storefront}/search`, {
    query: {
      term: params.term,
      types,
      limit: params.limit ?? 25,
    },
    signal: params.signal,
  });
}

/**
 * Convenience wrapper around `searchCatalog` that returns only the song-type
 * hits. Used by the match service for the (now sole) fuzzy text path.
 */
export async function findFirstByQuery(params: {
  query: string;
  storefront?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<AppleMusicResource<AppleMusicSongAttributes>[]> {
  const result = await searchCatalog({
    term: params.query,
    storefront: params.storefront,
    types: 'songs',
    limit: params.limit ?? 10,
    signal: params.signal,
  });
  // searchCatalog returns generic AppleMusicResource (Record<string, unknown> attrs);
  // when we restrict types=songs the data is necessarily song resources.
  return (result.results.songs?.data ??
    []) as unknown as AppleMusicResource<AppleMusicSongAttributes>[];
}
