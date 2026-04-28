import { getDeveloperToken } from '@/lib/developerTokenService';
import { withErrorHandler } from '@/lib/nextHandler';
import { NextResponse } from 'next/server';

// All API handlers in this file talk to live external services
// (env-bound tokens, query/body params) so they cannot be prerendered.
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
  const developerToken = getDeveloperToken();
  return NextResponse.json(
    { developerToken },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  );
});
