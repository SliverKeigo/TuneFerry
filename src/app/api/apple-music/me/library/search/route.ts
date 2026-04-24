import { searchLibrary } from '@/lib/appleMusicService';
import { HttpError } from '@/lib/httpError';
import { pickHeader, pickInt, pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async (req) => {
  const term = pickQuery(req, 'term');
  if (!term) {
    throw new HttpError(400, 'Missing required query parameter: term');
  }
  const types = pickQuery(req, 'types');
  const limit = pickInt(pickQuery(req, 'limit'));
  const musicUserToken = pickHeader(req, 'x-music-user-token');

  const data = await searchLibrary({ term, types, limit, musicUserToken });
  return NextResponse.json(data);
});
