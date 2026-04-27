import { HttpError } from '@/lib/httpError';
import { pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { fetchPublicPlaylist } from '@/lib/spotifyService';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async (req) => {
  const url = pickQuery(req, 'url');
  const id = pickQuery(req, 'id');
  const target = url ?? id;
  if (!target) {
    throw new HttpError(400, 'Provide either `url` or `id` as a query parameter.');
  }
  const data = await fetchPublicPlaylist(target);
  return NextResponse.json(data);
});
