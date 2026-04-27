import { getDeveloperToken } from './developerTokenService';
import { HttpError } from './httpError';
import type {
  AppleMusicResource,
  AppleMusicSearchResponse,
  AppleMusicSongAttributes,
} from './types/appleMusic';

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
}): Promise<AppleMusicSearchResponse> {
  const storefront = params.storefront?.trim() || 'us';
  const types = params.types?.trim() || 'songs,albums,artists,playlists';
  return appleFetch<AppleMusicSearchResponse>(`/catalog/${storefront}/search`, {
    query: {
      term: params.term,
      types,
      limit: params.limit ?? 25,
    },
  });
}

/**
 * Apple Music catalog "filter by ISRC" lookup. Endpoint:
 *   GET /v1/catalog/{storefront}/songs?filter[isrc]={isrc}
 *
 * ISRC is the international standard recording code burned into Spotify's
 * `external_ids.isrc`; when present it gives us a deterministic match between
 * a Spotify track and an Apple Music song with no fuzzy guesswork.
 *
 * Returns every matching song (multiple regional releases may share an ISRC).
 * Callers typically take the first result.
 */
export async function findByIsrc(params: {
  isrc: string;
  storefront?: string;
}): Promise<AppleMusicResource<AppleMusicSongAttributes>[]> {
  const storefront = params.storefront?.trim() || 'us';
  // `filter[isrc]` is the documented parameter name. URLSearchParams handles
  // the bracket encoding correctly here (unlike the `ids[type]` quirk that
  // forced addToLibrary to build the string by hand).
  const response = await appleFetch<{ data?: AppleMusicResource<AppleMusicSongAttributes>[] }>(
    `/catalog/${storefront}/songs`,
    {
      query: {
        'filter[isrc]': params.isrc,
      },
    },
  );
  return response.data ?? [];
}

/**
 * Convenience wrapper around `searchCatalog` that returns only the first song
 * hit. Used by the match service when ISRC lookup misses and we fall back to
 * a fuzzy text query.
 */
export async function findFirstByQuery(params: {
  query: string;
  storefront?: string;
  limit?: number;
}): Promise<AppleMusicResource<AppleMusicSongAttributes>[]> {
  const result = await searchCatalog({
    term: params.query,
    storefront: params.storefront,
    types: 'songs',
    limit: params.limit ?? 10,
  });
  // searchCatalog returns generic AppleMusicResource (Record<string, unknown> attrs);
  // when we restrict types=songs the data is necessarily song resources.
  return (result.results.songs?.data ??
    []) as unknown as AppleMusicResource<AppleMusicSongAttributes>[];
}
