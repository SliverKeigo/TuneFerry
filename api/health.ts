import type { VercelRequest, VercelResponse } from '@vercel/node';
import { env } from '../lib/env';
import { requireMethod, withErrorHandler } from '../lib/handler';

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ['GET']);
  res.json({ ok: true, nodeEnv: env.nodeEnv, time: new Date().toISOString() });
});
