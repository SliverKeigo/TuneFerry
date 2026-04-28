import { HttpError } from '@/lib/httpError';
import { pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { fetchPublicPlaylistViaEmbed } from '@/lib/spotifyService';
import { NextResponse } from 'next/server';

// All API handlers in this file talk to live external services
// (env-bound tokens, query/body params) so they cannot be prerendered.
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (req) => {
  const target = pickQuery(req, 'url') ?? pickQuery(req, 'id');
  if (!target) {
    throw new HttpError(400, 'Provide either `url` or `id` as a query parameter.');
  }
  const playlist = await fetchPublicPlaylistViaEmbed(target);
  return NextResponse.json(playlist);
});
