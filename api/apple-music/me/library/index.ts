import type { VercelRequest, VercelResponse } from '@vercel/node';
import { addToLibrary } from '../../../../lib/appleMusicService';
import { HttpError } from '../../../../lib/httpError';
import {
  pickHeader,
  requireMethod,
  withErrorHandler,
} from '../../../../lib/handler';
import type { LibraryAddResourceType } from '../../../../lib/types/appleMusic';

const VALID: ReadonlySet<LibraryAddResourceType> = new Set([
  'songs',
  'albums',
  'playlists',
  'music-videos',
]);

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ['POST']);

  const { type, ids } = (req.body ?? {}) as { type?: unknown; ids?: unknown };
  if (typeof type !== 'string' || !VALID.has(type as LibraryAddResourceType)) {
    throw new HttpError(
      400,
      `Invalid body.type. Expected one of: ${Array.from(VALID).join(', ')}`,
    );
  }
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
    throw new HttpError(400, 'Invalid body.ids. Expected a non-empty array of strings.');
  }

  await addToLibrary({
    type: type as LibraryAddResourceType,
    ids: ids as string[],
    musicUserToken: pickHeader(req, 'x-music-user-token'),
  });
  res.status(202).json({ ok: true });
});
