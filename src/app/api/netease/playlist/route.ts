import { HttpError } from '@/lib/httpError';
import { fetchPublicPlaylist } from '@/lib/neteaseService';
import { pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { NextResponse } from 'next/server';

// Talks to live NetEase endpoints (env-free, but query-bound), so this
// route cannot be prerendered.
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (req) => {
  const target = pickQuery(req, 'url') ?? pickQuery(req, 'id');
  if (!target) {
    throw new HttpError(400, 'Provide either `url` or `id` as a query parameter.');
  }
  // Forward `req.signal` so a client disconnect (tab close, React effect
  // cleanup) cancels the v6 + song/detail batches still in flight.
  const playlist = await fetchPublicPlaylist(target, req.signal);
  return NextResponse.json(playlist);
});
