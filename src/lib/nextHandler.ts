import { type NextRequest, NextResponse } from 'next/server';
import { HttpError } from './httpError';

export type Handler = (req: NextRequest) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js route handler with our uniform error envelope so every
 * route responds in the same shape:
 *   { error: { message, status, details? } }
 */
export function withErrorHandler(handler: Handler): Handler {
  return async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json(
          { error: { message: err.message, status: err.status, details: err.details } },
          { status: err.status },
        );
      }
      console.error('[api] unhandled', err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      return NextResponse.json({ error: { message, status: 500 } }, { status: 500 });
    }
  };
}

export function pickQuery(req: NextRequest, name: string): string | undefined {
  const v = req.nextUrl.searchParams.get(name);
  return v && v.length > 0 ? v : undefined;
}

export function pickHeader(req: NextRequest, name: string): string | undefined {
  const v = req.headers.get(name);
  return v && v.length > 0 ? v : undefined;
}

export function pickInt(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
