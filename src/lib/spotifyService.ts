import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './env';
import { HttpError } from './httpError';
import type {
  SpotifyPagedPlaylists,
  SpotifyPlaylist,
  SpotifyTokens,
  SpotifyTrack,
} from './types/spotify';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com';

// Authorization Code scopes — exactly what we need to read playlists the
// authenticated user can see (own + shared collaborative). Don't widen this:
// every extra scope makes Spotify's consent screen scarier.
const DEFAULT_SCOPES = ['playlist-read-private', 'playlist-read-collaborative'] as const;

// Refresh slightly before Spotify says the token will expire. Saves us one
// retry round-trip in the common case.
const TOKEN_REFRESH_MARGIN_MS = 30_000;

// State cookie max age. Auth flows that don't complete in 5 min are abandoned;
// after that the cookie becomes useless either way.
const STATE_DEFAULT_MAX_AGE_MS = 5 * 60_000;

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

// Raw upstream shapes — only the fields we read are typed.
interface RawSpotifyArtist {
  id: string;
  name: string;
}

interface RawSpotifyAlbum {
  name: string;
  images?: { url: string; width?: number; height?: number }[];
}

interface RawSpotifyTrack {
  id: string | null;
  name: string;
  artists: RawSpotifyArtist[];
  album: RawSpotifyAlbum;
  duration_ms: number;
  preview_url: string | null;
  external_ids?: { isrc?: string };
  external_urls?: { spotify?: string };
  is_local?: boolean;
  type?: string;
}

interface RawSpotifyPlaylistTrackItem {
  track: RawSpotifyTrack | null;
}

interface RawSpotifyPagedTracks {
  items: RawSpotifyPlaylistTrackItem[];
  next: string | null;
  total: number;
}

interface RawSpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  owner: { id: string; display_name?: string | null };
  images?: { url: string; width?: number; height?: number }[];
  tracks: RawSpotifyPagedTracks & { href: string };
}

interface RawSpotifyPagedPlaylistsResponse {
  items: {
    id: string;
    name: string;
    tracks: { total: number };
    images?: { url: string; width?: number; height?: number }[];
  }[];
  total: number;
  next: string | null;
}

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function requireSpotifyOAuthEnv(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const { spotifyClientId, spotifyClientSecret, spotifyRedirectUri } = env;
  if (!spotifyClientId || !spotifyClientSecret || !spotifyRedirectUri) {
    throw new HttpError(
      500,
      'Spotify OAuth is not configured. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI.',
    );
  }
  return {
    clientId: spotifyClientId,
    clientSecret: spotifyClientSecret,
    redirectUri: spotifyRedirectUri,
  };
}

function requireStateSecret(): string {
  const { spotifyStateSecret } = env;
  if (!spotifyStateSecret) {
    throw new HttpError(500, 'SPOTIFY_STATE_SECRET is not configured.');
  }
  return spotifyStateSecret;
}

function basicAuthHeader(): string {
  const { clientId, clientSecret } = requireSpotifyOAuthEnv();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

async function readErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return await response.text().catch(() => null);
  }
}

interface ApiCallOptions extends Omit<RequestInit, 'headers'> {
  accessToken: string;
  headers?: Record<string, string>;
}

async function spotifyApi<T>(path: string, init: ApiCallOptions): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  const url = path.startsWith('http') ? path : `${SPOTIFY_API_BASE}${path}`;
  const response = await fetch(url, {
    ...rest,
    headers: {
      ...(headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new HttpError(response.status, `Spotify API error (${response.status})`, body);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function spotifyToken(form: Record<string, string>): Promise<SpotifyTokens> {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(form).toString(),
  });
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new HttpError(response.status, `Spotify token error (${response.status})`, body);
  }
  const json = (await response.json()) as SpotifyTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
    scope: json.scope ?? '',
  };
}

// ---------------------------------------------------------------------------
// App-level Client Credentials token (cached in module memory)
// ---------------------------------------------------------------------------

let appTokenCache: { token: string; expiresAt: number } | null = null;

/** Test-only: clears the in-memory app token cache. Exported so unit tests
 *  can run independently without process restart. Not part of the public API. */
export function __resetAppTokenCacheForTests(): void {
  appTokenCache = null;
}

/**
 * Returns an app-level access token (Client Credentials flow). Cached in
 * module memory until shortly before its declared expiry — this saves a
 * round-trip on every public-playlist read inside a warm serverless instance.
 */
export async function getAppToken(): Promise<string> {
  const now = Date.now();
  if (appTokenCache && appTokenCache.expiresAt - TOKEN_REFRESH_MARGIN_MS > now) {
    return appTokenCache.token;
  }
  const tokens = await spotifyToken({ grant_type: 'client_credentials' });
  appTokenCache = { token: tokens.accessToken, expiresAt: tokens.expiresAt };
  return appTokenCache.token;
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

export function buildAuthorizeUrl(
  state: string,
  scopes: readonly string[] = DEFAULT_SCOPES,
): string {
  const { clientId, redirectUri } = requireSpotifyOAuthEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
  });
  return `${SPOTIFY_ACCOUNTS_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const { redirectUri } = requireSpotifyOAuthEnv();
  return spotifyToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
}

export async function refreshUserToken(refreshToken: string): Promise<SpotifyTokens> {
  const refreshed = await spotifyToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  // Spotify usually doesn't return a new refresh_token on refresh; carry the
  // original forward so callers can keep storing one canonical session blob.
  if (!refreshed.refreshToken) {
    refreshed.refreshToken = refreshToken;
  }
  return refreshed;
}

// ---------------------------------------------------------------------------
// State signing
// ---------------------------------------------------------------------------

/** URL-safe base64 (no padding) so the result fits cleanly in a query string. */
function b64url(bytes: Buffer): string {
  return bytes.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  return Buffer.from(pad ? padded + '='.repeat(4 - pad) : padded, 'base64');
}

/**
 * Signs an opaque state payload with HMAC-SHA256 keyed on SPOTIFY_STATE_SECRET.
 * Output: `<urlsafe-base64(json)>.<urlsafe-base64(sig)>` — small enough to fit
 * in a cookie or query string and self-contained (no server session needed).
 */
export function signState(payload: { nonce: string; ts: number }): string {
  const secret = requireStateSecret();
  const json = JSON.stringify(payload);
  const body = b64url(Buffer.from(json, 'utf8'));
  const sig = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

/**
 * Verifies a token produced by `signState`. Returns the decoded payload, or
 * `null` if the signature is invalid, the structure is malformed, or
 * `maxAgeMs` (default 5 min) has elapsed since `ts`.
 *
 * Uses `timingSafeEqual` to defang signature-comparison timing attacks.
 */
export function verifyState(
  token: string,
  maxAgeMs: number = STATE_DEFAULT_MAX_AGE_MS,
): { nonce: string; ts: number } | null {
  const secret = requireStateSecret();
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedSig = b64url(createHmac('sha256', secret).update(body).digest());
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { nonce?: unknown }).nonce !== 'string' ||
    typeof (parsed as { ts?: unknown }).ts !== 'number'
  ) {
    return null;
  }
  const { nonce, ts } = parsed as { nonce: string; ts: number };
  if (Date.now() - ts > maxAgeMs) return null;
  return { nonce, ts };
}

/** Convenience: build a fresh signed state token with a 16-byte random nonce. */
export function createSignedState(): string {
  return signState({ nonce: b64url(randomBytes(16)), ts: Date.now() });
}

// ---------------------------------------------------------------------------
// Playlist URL parsing
// ---------------------------------------------------------------------------

const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

/**
 * Accepts either a bare Spotify playlist id or any of the URL formats Spotify
 * shares (open.spotify.com, spotify:playlist:..., links with ?si= tracking).
 * Returns `null` for unparsable input — callers convert to a 400.
 */
export function extractPlaylistId(idOrUrl: string): string | null {
  const trimmed = idOrUrl.trim();
  if (!trimmed) return null;
  if (SPOTIFY_ID_PATTERN.test(trimmed)) return trimmed;

  // spotify:playlist:<id>
  const uriMatch = trimmed.match(/^spotify:playlist:([A-Za-z0-9]{22})$/);
  if (uriMatch?.[1]) return uriMatch[1];

  // open.spotify.com/playlist/<id>?si=...   (locale prefixes too: /intl-ja/playlist/<id>)
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    const idx = segments.indexOf('playlist');
    if (idx >= 0 && segments[idx + 1] && SPOTIFY_ID_PATTERN.test(segments[idx + 1] ?? '')) {
      return segments[idx + 1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Track normalization
// ---------------------------------------------------------------------------

function normalizeTrack(raw: RawSpotifyTrack): SpotifyTrack | null {
  // Local tracks and podcast episodes have no id (or are tagged differently);
  // skip them rather than poisoning the matcher with garbage.
  if (!raw.id || raw.is_local || raw.type === 'episode') return null;
  return {
    id: raw.id,
    name: raw.name,
    artists: raw.artists.map((a) => a.name),
    album: raw.album.name,
    isrc: raw.external_ids?.isrc,
    durationMs: raw.duration_ms,
    previewUrl: raw.preview_url ?? undefined,
    spotifyUrl: raw.external_urls?.spotify ?? `https://open.spotify.com/track/${raw.id}`,
  };
}

function bestImageUrl(
  images?: { url: string; width?: number; height?: number }[],
): string | undefined {
  if (!images || images.length === 0) return undefined;
  // Spotify orders images largest-first; the first is fine for thumbnails too.
  return images[0]?.url;
}

// ---------------------------------------------------------------------------
// Playlist fetching
// ---------------------------------------------------------------------------

async function fetchPlaylistByToken(
  idOrUrl: string,
  accessToken: string,
): Promise<SpotifyPlaylist> {
  const id = extractPlaylistId(idOrUrl);
  if (!id) {
    throw new HttpError(400, `Could not parse Spotify playlist id from: ${idOrUrl}`);
  }

  const head = await spotifyApi<RawSpotifyPlaylist>(`/playlists/${id}`, { accessToken });

  const tracks: SpotifyTrack[] = [];
  for (const item of head.tracks.items) {
    if (!item.track) continue;
    const t = normalizeTrack(item.track);
    if (t) tracks.push(t);
  }

  // Page through additional tracks if the playlist exceeds 100 items. Spotify
  // returns a fully-qualified `next` URL we can pass back as-is.
  let nextUrl: string | null = head.tracks.next;
  while (nextUrl) {
    const page = await spotifyApi<RawSpotifyPagedTracks>(nextUrl, { accessToken });
    for (const item of page.items) {
      if (!item.track) continue;
      const t = normalizeTrack(item.track);
      if (t) tracks.push(t);
    }
    nextUrl = page.next;
  }

  return {
    id: head.id,
    name: head.name,
    description: head.description ?? '',
    owner: { id: head.owner.id, displayName: head.owner.display_name ?? head.owner.id },
    imageUrl: bestImageUrl(head.images),
    totalTracks: head.tracks.total,
    tracks,
  };
}

/** Fetch a public playlist using an app-level Client Credentials token. */
export async function fetchPublicPlaylist(idOrUrl: string): Promise<SpotifyPlaylist> {
  const token = await getAppToken();
  return fetchPlaylistByToken(idOrUrl, token);
}

/**
 * Fetch a playlist on behalf of an authenticated user. Used for private and
 * collaborative playlists the user can see.
 *
 * If `onRefresh` is supplied and the upstream token has expired (or is rejected
 * with 401), the service refreshes via `refreshUserToken` and invokes the
 * callback so the route can persist the rotated cookie. The retried request
 * uses the new access token.
 */
export async function fetchUserPlaylist(
  idOrUrl: string,
  userTokens: SpotifyTokens,
  onRefresh?: (next: SpotifyTokens) => void | Promise<void>,
): Promise<SpotifyPlaylist> {
  return withAutoRefresh(userTokens, onRefresh, (tokens) =>
    fetchPlaylistByToken(idOrUrl, tokens.accessToken),
  );
}

export async function fetchUserPlaylists(
  userTokens: SpotifyTokens,
  limit = 50,
  offset = 0,
  onRefresh?: (next: SpotifyTokens) => void | Promise<void>,
): Promise<SpotifyPagedPlaylists> {
  return withAutoRefresh(userTokens, onRefresh, async (tokens) => {
    const data = await spotifyApi<RawSpotifyPagedPlaylistsResponse>(
      `/me/playlists?limit=${Math.min(50, Math.max(1, limit))}&offset=${Math.max(0, offset)}`,
      { accessToken: tokens.accessToken },
    );
    return {
      items: data.items.map((p) => ({
        id: p.id,
        name: p.name,
        totalTracks: p.tracks.total,
        imageUrl: bestImageUrl(p.images),
      })),
      total: data.total,
      next: data.next,
    };
  });
}

/**
 * Wraps a per-request Spotify call with proactive + reactive token refresh.
 *  - Proactive: if `tokens.expiresAt` is in the past (with margin), refresh first.
 *  - Reactive: if the upstream call throws a 401, refresh and retry exactly once.
 * The route layer feeds the rotated tokens back into the cookie via `onRefresh`.
 */
async function withAutoRefresh<T>(
  tokens: SpotifyTokens,
  onRefresh: ((next: SpotifyTokens) => void | Promise<void>) | undefined,
  call: (tokens: SpotifyTokens) => Promise<T>,
): Promise<T> {
  let active = tokens;
  if (active.expiresAt - TOKEN_REFRESH_MARGIN_MS <= Date.now()) {
    if (!active.refreshToken) {
      throw new HttpError(401, 'Spotify access token expired and no refresh token is available.');
    }
    active = await refreshUserToken(active.refreshToken);
    await onRefresh?.(active);
  }
  try {
    return await call(active);
  } catch (err) {
    if (err instanceof HttpError && err.status === 401 && active.refreshToken) {
      const next = await refreshUserToken(active.refreshToken);
      await onRefresh?.(next);
      return call(next);
    }
    throw err;
  }
}

// Re-exported for tests / route helpers that want the constant.
export const SPOTIFY_DEFAULT_SCOPES = DEFAULT_SCOPES;
