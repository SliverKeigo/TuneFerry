import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchCatalog } from '../../../lib/appleMusicService';
import { HttpError } from '../../../lib/httpError';
import {
  pickInt,
  pickQuery,
  requireMethod,
  withErrorHandler,
} from '../../../lib/handler';

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ['GET']);
  const term = pickQuery(req, 'term');
  if (!term) throw new HttpError(400, 'Missing required query param: term');

  const data = await searchCatalog({
    term,
    storefront: pickQuery(req, 'storefront'),
    types: pickQuery(req, 'types'),
    limit: pickInt(pickQuery(req, 'limit')),
  });
  res.json(data);
});
