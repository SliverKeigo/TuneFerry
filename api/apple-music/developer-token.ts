import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDeveloperToken } from '../../lib/developerTokenService';
import { requireMethod, withErrorHandler } from '../../lib/handler';

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ['GET']);
  const developerToken = getDeveloperToken();
  // The Developer Token is effectively static for ~6 months. Letting the
  // browser cache it for 5 minutes saves a round-trip on every page navigation
  // without keeping a stale token around indefinitely.
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.json({ developerToken });
});
