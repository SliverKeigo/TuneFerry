import { HttpError } from '@/lib/httpError';
import { pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { fetchPublicPlaylistViaEmbed } from '@/lib/spotifyService';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async (req) => {
  const target = pickQuery(req, 'url') ?? pickQuery(req, 'id');
  if (!target) {
    throw new HttpError(400, 'Provide either `url` or `id` as a query parameter.');
  }
  const playlist = await fetchPublicPlaylistViaEmbed(target);
  return NextResponse.json(playlist);
});
