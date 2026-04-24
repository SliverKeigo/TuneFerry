import { env } from '@/lib/env';
import { withErrorHandler } from '@/lib/nextHandler';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async () => {
  return NextResponse.json({
    ok: true,
    nodeEnv: env.nodeEnv,
    time: new Date().toISOString(),
  });
});
