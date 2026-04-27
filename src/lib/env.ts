import dotenv from 'dotenv';

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

// Local dev only. Vercel injects env vars directly, so skipping dotenv there
// avoids a pointless fs lookup from inside the ncc bundle.
//
// Letting dotenv default to `<cwd>/.env` works for every local entrypoint we
// care about because they all run from the repo root:
//   - `vite`           → `npm run dev:client`
//   - `vercel dev`     → `npm run dev:api`
//   - `tsx` / scripts  → invoked from the repo root
if (!isVercel) {
  dotenv.config();
}

function readString(value: string | undefined, fallback?: string): string | undefined {
  if (value == null || value === '') return fallback;
  return value;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export interface AppEnv {
  nodeEnv: string;

  prebakedDeveloperToken?: string;

  teamId?: string;
  keyId?: string;
  privateKeyPath?: string;
  privateKeyInline?: string;
  tokenTtlSeconds: number;

  // Spotify Web API + OAuth (Authorization Code flow).
  // - clientId / clientSecret: app credentials from the Spotify dashboard.
  // - redirectUri: must match an entry in the Spotify app's allowlist.
  // - stateSecret: HMAC key for signing the OAuth `state` cookie. Any random
  //   high-entropy string; only the server ever sees it.
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  spotifyRedirectUri?: string;
  spotifyStateSecret?: string;

  /** True when running inside a Vercel serverless function. */
  isVercel: boolean;
}

export const env: AppEnv = {
  nodeEnv: readString(process.env.NODE_ENV, 'development')!,

  prebakedDeveloperToken: readString(process.env.APPLE_MUSIC_DEVELOPER_TOKEN),

  teamId: readString(process.env.APPLE_TEAM_ID),
  keyId: readString(process.env.APPLE_KEY_ID),
  privateKeyPath: readString(process.env.APPLE_PRIVATE_KEY_PATH),
  privateKeyInline: readString(process.env.APPLE_PRIVATE_KEY),

  tokenTtlSeconds: parseNumber(process.env.APPLE_TOKEN_TTL_SECONDS, 15_777_000),

  spotifyClientId: readString(process.env.SPOTIFY_CLIENT_ID),
  spotifyClientSecret: readString(process.env.SPOTIFY_CLIENT_SECRET),
  spotifyRedirectUri: readString(process.env.SPOTIFY_REDIRECT_URI),
  spotifyStateSecret: readString(process.env.SPOTIFY_STATE_SECRET),

  isVercel,
};
