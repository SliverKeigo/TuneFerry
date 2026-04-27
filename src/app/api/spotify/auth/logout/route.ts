import { withErrorHandler } from '@/lib/nextHandler';
import { clearSpotifySession } from '@/lib/spotifySession';
import { NextResponse } from 'next/server';

export const POST = withErrorHandler(async () => {
  clearSpotifySession();
  return new NextResponse(null, { status: 204 });
});
