import { HttpError } from '@/lib/httpError';
import { matchMany } from '@/lib/matchService';
import { withErrorHandler } from '@/lib/nextHandler';
import type { SpotifyTrack } from '@/lib/types/spotify';
import { NextResponse } from 'next/server';

const MAX_TRACKS_PER_REQUEST = 500;

interface MatchRequestBody {
  tracks: SpotifyTrack[];
  storefront: string;
}

function parseBody(raw: unknown): MatchRequestBody {
  if (raw == null || typeof raw !== 'object') {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  const { tracks, storefront } = raw as { tracks?: unknown; storefront?: unknown };

  if (typeof storefront !== 'string' || storefront.length === 0) {
    throw new HttpError(400, '`storefront` is required (e.g. "us", "jp").');
  }
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new HttpError(400, '`tracks` must be a non-empty array.');
  }
  if (tracks.length > MAX_TRACKS_PER_REQUEST) {
    throw new HttpError(
      400,
      `Too many tracks: ${tracks.length}. Limit is ${MAX_TRACKS_PER_REQUEST} per request.`,
    );
  }
  // Lightweight shape check — the route trusts the client to send normalized
  // SpotifyTrack objects (this endpoint is internal-only, called from /import).
  for (const t of tracks) {
    if (
      !t ||
      typeof t !== 'object' ||
      typeof (t as SpotifyTrack).id !== 'string' ||
      typeof (t as SpotifyTrack).name !== 'string' ||
      !Array.isArray((t as SpotifyTrack).artists)
    ) {
      throw new HttpError(400, 'Each track must include id, name, and artists[].');
    }
  }
  return { tracks: tracks as SpotifyTrack[], storefront };
}

export const POST = withErrorHandler(async (req) => {
  const raw = (await req.json().catch(() => null)) as unknown;
  const { tracks, storefront } = parseBody(raw);
  const matches = await matchMany(tracks, storefront);
  return NextResponse.json({ matches });
});
