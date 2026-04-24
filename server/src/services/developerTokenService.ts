import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

// Cache the signed token in memory so repeated requests don't re-sign.
// Apple tokens can live up to ~6 months — we refresh 60 s before expiry.
interface CachedToken {
  token: string;
  expiresAt: number; // epoch seconds
}

let cache: CachedToken | null = null;
const REFRESH_MARGIN_SECONDS = 60;

function loadPrivateKey(): string {
  if (env.privateKeyInline) {
    // Support both \n-escaped single-line and regular multi-line PEM content.
    return env.privateKeyInline.replace(/\\n/g, '\n');
  }
  if (env.privateKeyPath) {
    try {
      return fs.readFileSync(env.privateKeyPath, 'utf8');
    } catch (err) {
      throw new HttpError(
        500,
        `Failed to read APPLE_PRIVATE_KEY_PATH at ${env.privateKeyPath}`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  throw new HttpError(
    500,
    'No Apple private key configured. Set APPLE_PRIVATE_KEY_PATH or APPLE_PRIVATE_KEY in .env, or provide APPLE_MUSIC_DEVELOPER_TOKEN for MVP mode.',
  );
}

function signDeveloperToken(): CachedToken {
  if (!env.teamId || !env.keyId) {
    throw new HttpError(
      500,
      'APPLE_TEAM_ID and APPLE_KEY_ID must be set to sign a Developer Token. Alternatively set APPLE_MUSIC_DEVELOPER_TOKEN.',
    );
  }

  const key = loadPrivateKey();
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + env.tokenTtlSeconds;

  const token = jwt.sign(
    {
      iss: env.teamId,
      iat: nowSec,
      exp: expSec,
    },
    key,
    {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: env.keyId },
    },
  );

  return { token, expiresAt: expSec };
}

/**
 * Returns a valid Apple Music Developer Token.
 *
 * Priority:
 *   1. If APPLE_MUSIC_DEVELOPER_TOKEN is set, return it directly (MVP escape hatch).
 *   2. Otherwise sign a JWT using TEAM_ID + KEY_ID + private key (ES256).
 */
export function getDeveloperToken(): string {
  if (env.prebakedDeveloperToken) {
    return env.prebakedDeveloperToken;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (cache && cache.expiresAt - REFRESH_MARGIN_SECONDS > nowSec) {
    return cache.token;
  }

  cache = signDeveloperToken();
  return cache.token;
}
