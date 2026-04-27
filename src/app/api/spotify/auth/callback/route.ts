import { HttpError } from '@/lib/httpError';
import { pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { exchangeCodeForTokens, verifyState } from '@/lib/spotifyService';
import {
  clearOAuthStateCookie,
  readOAuthStateCookie,
  writeSpotifySession,
} from '@/lib/spotifySession';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async (req) => {
  const error = pickQuery(req, 'error');
  if (error) {
    // User declined consent or upstream error — short-circuit with 400.
    throw new HttpError(400, `Spotify authorization failed: ${error}`);
  }

  const code = pickQuery(req, 'code');
  const stateQuery = pickQuery(req, 'state');
  if (!code || !stateQuery) {
    throw new HttpError(400, 'Missing `code` or `state` from Spotify callback.');
  }

  const cookieState = readOAuthStateCookie();
  if (!cookieState || cookieState !== stateQuery) {
    throw new HttpError(400, 'OAuth state mismatch — possible CSRF or stale flow.');
  }
  // Independent crypto check — guards against an attacker who somehow set
  // both the cookie and the query (e.g. via an open redirect to login).
  if (!verifyState(stateQuery)) {
    throw new HttpError(400, 'OAuth state failed signature verification.');
  }

  const tokens = await exchangeCodeForTokens(code);
  writeSpotifySession(tokens);
  clearOAuthStateCookie();

  // Send the user back to the import wizard with a flag the frontend reads.
  const dest = new URL('/import?spotify=connected', req.nextUrl.origin);
  return NextResponse.redirect(dest);
});
