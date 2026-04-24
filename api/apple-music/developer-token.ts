import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDeveloperToken } from '../../lib/developerTokenService';
import { requireMethod, withErrorHandler } from '../../lib/handler';

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ['GET']);
  const developerToken = getDeveloperToken();
  res.json({ developerToken });
});
