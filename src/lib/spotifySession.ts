import { cookies } from 'next/headers';
import type { SpotifyTokens } from './types/spotify';

/** Cookie name housing the JSON-serialized SpotifyTokens. */
export const SPOTIFY_SESSION_COOKIE = 'tf.spotify_session';

/** Cookie name housing the signed OAuth state during the authorize round-trip. */
export const SPOTIFY_OAUTH_STATE_COOKIE = 'tf.spotify_oauth_state';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — refresh-token longevity
const STATE_MAX_AGE_SECONDS = 60 * 5; // 5 minutes for the OAuth round-trip

interface CookieAttrs {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge?: number;
}

function baseAttrs(maxAge: number | undefined): CookieAttrs {
  const attrs: CookieAttrs = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
  if (maxAge !== undefined) attrs.maxAge = maxAge;
  return attrs;
}

/**
 * Reads the Spotify session cookie and parses it into `SpotifyTokens`.
 * Returns `null` if missing or unparsable — callers convert that into a 401.
 */
export function readSpotifySession(): SpotifyTokens | null {
  const c = cookies();
  const raw = c.get(SPOTIFY_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SpotifyTokens;
    if (typeof parsed?.accessToken !== 'string' || typeof parsed?.expiresAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSpotifySession(tokens: SpotifyTokens): void {
  cookies().set(SPOTIFY_SESSION_COOKIE, JSON.stringify(tokens), baseAttrs(SESSION_MAX_AGE_SECONDS));
}

export function clearSpotifySession(): void {
  cookies().set(SPOTIFY_SESSION_COOKIE, '', baseAttrs(0));
}

export function writeOAuthStateCookie(state: string): void {
  cookies().set(SPOTIFY_OAUTH_STATE_COOKIE, state, baseAttrs(STATE_MAX_AGE_SECONDS));
}

export function readOAuthStateCookie(): string | null {
  return cookies().get(SPOTIFY_OAUTH_STATE_COOKIE)?.value ?? null;
}

export function clearOAuthStateCookie(): void {
  cookies().set(SPOTIFY_OAUTH_STATE_COOKIE, '', baseAttrs(0));
}
