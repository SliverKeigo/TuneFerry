import dotenv from 'dotenv';

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

// Local dev only. Vercel injects env vars directly, so skipping dotenv there
// avoids a pointless fs lookup from inside the ncc bundle (where `__dirname`
// points into a temp build dir and a relative `.env` would never resolve).
//
// Letting dotenv default to `<cwd>/.env` works for every local entrypoint we
// care about because they all run from the repo root:
//   - `vite`           → `npm run dev:client`
//   - `vercel dev`     → `npm run dev:api`
//   - `tsx` / scripts  → invoked from the repo root
if (!isVercel) {
  dotenv.config();
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

  isVercel,
};
