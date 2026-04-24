import { getLibraryPlaylists } from '@/lib/appleMusicService';
import { pickHeader, pickInt, pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async (req) => {
  const limit = pickInt(pickQuery(req, 'limit'));
  const offset = pickInt(pickQuery(req, 'offset'));
  const musicUserToken = pickHeader(req, 'x-music-user-token');

  const data = await getLibraryPlaylists({ limit, offset, musicUserToken });
  return NextResponse.json(data);
});
