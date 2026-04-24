import 'dotenv/config';
import path from 'path';

// Load `.env` from the repo root (one level up from `server/`). We also call
// `dotenv/config` above which honours the CWD — when `npm run dev:server` runs
// from the workspace root this already covers us. The explicit call below
// makes things work if someone runs `npm run dev` directly inside `server/`.
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function requireString(value: string | undefined, fallback?: string): string | undefined {
  if (value == null || value === '') return fallback;
  return value;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export interface AppEnv {
  port: number;
  nodeEnv: string;
  clientOrigins: string[];

  // Prebaked Developer Token (MVP mode). When set, the server returns this
  // token verbatim and does not touch the signing path.
  prebakedDeveloperToken?: string;

  // Signing inputs for Developer Token generation.
  teamId?: string;
  keyId?: string;
  privateKeyPath?: string;
  privateKeyInline?: string;
  tokenTtlSeconds: number;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return ['http://localhost:5173'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
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
};
