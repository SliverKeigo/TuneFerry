import { searchCatalog } from '@/lib/appleMusicService';
import { HttpError } from '@/lib/httpError';
import { pickInt, pickQuery, withErrorHandler } from '@/lib/nextHandler';
import { NextResponse } from 'next/server';

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
