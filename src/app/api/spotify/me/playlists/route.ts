import { HttpError } from '@/lib/httpError';
import { pickInt, pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { fetchUserPlaylists } from '@/lib/spotifyService';
import { readSpotifySession, writeSpotifySession } from '@/lib/spotifySession';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async (req) => {
  const session = readSpotifySession();
  if (!session) {
    throw new HttpError(401, 'Not connected to Spotify. Visit /api/spotify/auth/login first.');
  }
  const limit = pickInt(pickQuery(req, 'limit')) ?? 50;
  const offset = pickInt(pickQuery(req, 'offset')) ?? 0;

  const data = await fetchUserPlaylists(session, limit, offset, (next) => {
    // Persist refreshed tokens so the next request doesn't re-refresh.
    writeSpotifySession(next);
  });

  return NextResponse.json(data);
});
