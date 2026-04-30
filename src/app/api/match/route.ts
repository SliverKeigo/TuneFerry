import { HttpError } from '@/lib/httpError';
import { matchMany } from '@/lib/matchService';
import { withErrorHandler } from '@/lib/nextHandler';
import type { SourceTrack } from '@/lib/types/source';
import { NextResponse } from 'next/server';

// All API handlers in this file talk to live external services
// (env-bound tokens, query/body params) so they cannot be prerendered.
export const dynamic = 'force-dynamic';

const MAX_TRACKS_PER_REQUEST = 500;

interface MatchRequestBody {
  tracks: SourceTrack[];
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
  // SourceTrack objects (this endpoint is internal-only, called from /import).
  // `sourceType` is required so the matcher / future per-source heuristics
  // know which platform a row originated from.
  for (const t of tracks) {
    if (
      !t ||
      typeof t !== 'object' ||
      typeof (t as SourceTrack).sourceType !== 'string' ||
      typeof (t as SourceTrack).id !== 'string' ||
      typeof (t as SourceTrack).name !== 'string' ||
      !Array.isArray((t as SourceTrack).artists)
    ) {
      throw new HttpError(400, 'Each track must include sourceType, id, name, and artists[].');
    }
  }
  return { tracks: tracks as SourceTrack[], storefront };
}

export const POST = withErrorHandler(async (req) => {
  const raw = (await req.json().catch(() => null)) as unknown;
  const { tracks, storefront } = parseBody(raw);
  // `req.signal` aborts when the client disconnects (e.g. user switched
  // storefront mid-flight). Forwarding it cancels in-flight Apple Music
  // calls so we don't burn token quota on a result no one is waiting for.
  const matches = await matchMany(tracks, storefront, req.signal);
  return NextResponse.json({ matches });
});
