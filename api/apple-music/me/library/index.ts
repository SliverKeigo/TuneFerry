import type { VercelRequest, VercelResponse } from '@vercel/node';
import { addToLibrary } from '../../../../lib/appleMusicService';
import { pickHeader, requireMethod, withErrorHandler } from '../../../../lib/handler';
import { parseAddToLibraryBody } from '../../../../lib/validators';

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ['POST']);
  const { type, ids } = parseAddToLibraryBody(req.body);

  await addToLibrary({
    type,
    ids,
    musicUserToken: pickHeader(req, 'x-music-user-token'),
  });
  res.status(202).json({ ok: true });
});
