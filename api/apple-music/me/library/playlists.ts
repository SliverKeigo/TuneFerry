import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLibraryPlaylists } from '../../../../lib/appleMusicService';
import {
  pickHeader,
  pickInt,
  pickQuery,
  requireMethod,
  withErrorHandler,
} from '../../../../lib/handler';

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ['GET']);
  const data = await getLibraryPlaylists({
    musicUserToken: pickHeader(req, 'x-music-user-token'),
    limit: pickInt(pickQuery(req, 'limit')),
    offset: pickInt(pickQuery(req, 'offset')),
  });
  res.json(data);
});
