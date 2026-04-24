import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchLibrary } from '../../../../lib/appleMusicService';
import {
  pickHeader,
  pickInt,
  pickQuery,
  requireMethod,
  withErrorHandler,
} from '../../../../lib/handler';
import { HttpError } from '../../../../lib/httpError';

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ['GET']);
  const term = pickQuery(req, 'term');
  if (!term) throw new HttpError(400, 'Missing required query param: term');

  const data = await searchLibrary({
    term,
    types: pickQuery(req, 'types'),
    limit: pickInt(pickQuery(req, 'limit')),
    musicUserToken: pickHeader(req, 'x-music-user-token'),
  });
  res.json(data);
});
