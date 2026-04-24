import { getDeveloperToken } from '@/lib/developerTokenService';
import { withErrorHandler } from '@/lib/nextHandler';
import { NextResponse } from 'next/server';

export const GET = withErrorHandler(async () => {
  const developerToken = getDeveloperToken();
  return NextResponse.json(
    { developerToken },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  );
});
