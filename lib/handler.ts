import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HttpError } from './httpError';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

/**
 * Wraps a Vercel function handler with our uniform error envelope so every
 * route responds in the same shape:
 *   { error: { message, status, details? } }
 */
export function withErrorHandler(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({
          error: { message: err.message, status: err.status, details: err.details },
        });
        return;
      }
      // eslint-disable-next-line no-console
      console.error('[api] unhandled error', err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: { message, status: 500 } });
    }
  };
}

export function requireMethod(req: VercelRequest, methods: readonly string[]): void {
  if (!methods.includes(req.method ?? '')) {
    throw new HttpError(
      405,
      `Method ${req.method ?? 'unknown'} not allowed. Use: ${methods.join(', ')}`,
    );
  }
}

export function pickQuery(req: VercelRequest, name: string): string | undefined {
  const raw = req.query[name];
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].length > 0) return raw[0];
  return undefined;
}

export function pickHeader(req: VercelRequest, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].length > 0) return raw[0];
  return undefined;
}

export function pickInt(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
