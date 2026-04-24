import express from 'express';
import cors from 'cors';
import { env } from '../../lib/env';
import { appleMusicRouter } from './routes/appleMusicRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

app.use(
  cors({
    origin: env.clientOrigins,
    credentials: false,
  }),
);
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, nodeEnv: env.nodeEnv, time: new Date().toISOString() });
});

app.use('/api/apple-music', appleMusicRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// Only listen when run directly (local dev). In a Vercel deploy we never
// import this file; each route is its own serverless function in /api.
app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[server] listening on http://localhost:${env.port} (origins: ${env.clientOrigins.join(', ')})`,
  );
  if (!env.prebakedDeveloperToken && (!env.teamId || !env.keyId)) {
    // eslint-disable-next-line no-console
    console.warn(
      '[server] Developer Token signing is NOT configured. Set APPLE_MUSIC_DEVELOPER_TOKEN (MVP) or APPLE_TEAM_ID + APPLE_KEY_ID + a private key in .env.',
    );
  }
});
