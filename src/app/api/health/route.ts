import { env } from '@/lib/env';
import { withErrorHandler } from '@/lib/nextHandler';
import { NextResponse } from 'next/server';

// All API handlers in this file talk to live external services
// (env-bound tokens, query/body params) so they cannot be prerendered.
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
  return NextResponse.json({
    ok: true,
    nodeEnv: env.nodeEnv,
    time: new Date().toISOString(),
  });
});
