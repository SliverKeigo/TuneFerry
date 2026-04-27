import { withErrorHandler } from '@/lib/nextHandler';
import { buildAuthorizeUrl, createSignedState } from '@/lib/spotifyService';
import { writeOAuthStateCookie } from '@/lib/spotifySession';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async () => {
  // Generate signed state, drop it in an HttpOnly cookie, and 302 to Spotify.
  // The state is also embedded in the redirect query so Spotify echoes it back
  // — the callback compares the two and refuses if they differ.
  const state = createSignedState();
  writeOAuthStateCookie(state);
  return NextResponse.redirect(buildAuthorizeUrl(state));
});
