import { HttpError } from '@/lib/httpError';
import { pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { fetchUserPlaylist } from '@/lib/spotifyService';
import { readSpotifySession, writeSpotifySession } from '@/lib/spotifySession';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async (req) => {
  const session = readSpotifySession();
  if (!session) {
    throw new HttpError(401, 'Not connected to Spotify. Visit /api/spotify/auth/login first.');
  }
  const id = pickQuery(req, 'id') ?? pickQuery(req, 'url');
  if (!id) {
    throw new HttpError(400, 'Provide either `id` or `url` as a query parameter.');
  }

  const data = await fetchUserPlaylist(id, session, (next) => {
    writeSpotifySession(next);
  });

  return NextResponse.json(data);
});
