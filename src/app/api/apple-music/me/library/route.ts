import { addToLibrary } from '@/lib/appleMusicService';
import { HttpError } from '@/lib/httpError';
import { pickHeader, withErrorHandler } from '@/lib/nextHandler';
import { parseAddToLibraryBody } from '@/lib/validators';
import { NextResponse } from 'next/server';

export const POST = withErrorHandler(async (req) => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
  const { type, ids } = parseAddToLibraryBody(raw);
  const musicUserToken = pickHeader(req, 'x-music-user-token');

  await addToLibrary({ type, ids, musicUserToken });
  return NextResponse.json({ ok: true }, { status: 202 });
});
