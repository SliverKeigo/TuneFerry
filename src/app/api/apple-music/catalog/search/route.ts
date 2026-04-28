import { searchCatalog } from '@/lib/appleMusicService';
import { HttpError } from '@/lib/httpError';
import { pickInt, pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { NextResponse } from 'next/server';

// All API handlers in this file talk to live external services
// (env-bound tokens, query/body params) so they cannot be prerendered.
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (req) => {
  const term = pickQuery(req, 'term');
  if (!term) {
    throw new HttpError(400, 'Missing required query parameter: term');
  }
  const storefront = pickQuery(req, 'storefront');
  const types = pickQuery(req, 'types');
  const limit = pickInt(pickQuery(req, 'limit'));

  const data = await searchCatalog({ term, storefront, types, limit });
  return NextResponse.json(data);
});
