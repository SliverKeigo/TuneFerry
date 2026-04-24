import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load the repo-root `.env` for local development. On Vercel the values come
// straight from the runtime env, so `.env` won't exist inside the deployed
// bundle and we silently skip.
const rootEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: false });
}

function requireString(value: string | undefined, fallback?: string): string | undefined {
  if (value == null || value === '') return fallback;
  return value;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return ['http://localhost:5173'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export interface AppEnv {
  port: number;
  nodeEnv: string;
  clientOrigins: string[];

  prebakedDeveloperToken?: string;

  teamId?: string;
  keyId?: string;
  privateKeyPath?: string;
  privateKeyInline?: string;
  tokenTtlSeconds: number;

  /** True when running inside a Vercel serverless function. */
  isVercel: boolean;
}

export const env: AppEnv = {
  port: parseNumber(process.env.PORT, 8787),
  nodeEnv: requireString(process.env.NODE_ENV, 'development')!,
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGIN),

  prebakedDeveloperToken: requireString(process.env.APPLE_MUSIC_DEVELOPER_TOKEN),

  teamId: requireString(process.env.APPLE_TEAM_ID),
  keyId: requireString(process.env.APPLE_KEY_ID),
  privateKeyPath: requireString(process.env.APPLE_PRIVATE_KEY_PATH),
  privateKeyInline: requireString(process.env.APPLE_PRIVATE_KEY),

  tokenTtlSeconds: parseNumber(process.env.APPLE_TOKEN_TTL_SECONDS, 15_777_000),

  isVercel: Boolean(process.env.VERCEL || process.env.VERCEL_ENV),
};
