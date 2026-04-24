import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { HttpError } from './httpError';

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cache: CachedToken | null = null;
const REFRESH_MARGIN_SECONDS = 60;

function loadPrivateKey(): string {
  if (env.privateKeyInline) {
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
    'No Apple private key configured. Set APPLE_PRIVATE_KEY_PATH or APPLE_PRIVATE_KEY in the environment, or provide APPLE_MUSIC_DEVELOPER_TOKEN for MVP mode.',
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
 * Note: serverless functions on Vercel are short-lived; the in-memory cache
 * below only pays off within a single warm invocation. That's fine because
 * `jwt.sign` is cheap relative to the round-trip to Apple.
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
