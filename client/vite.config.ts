import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Load env from the repo root (one level above `client/`) — one `.env`
// file configures both Vite and the Vercel functions.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', ['VITE_']);
  // `vercel dev` serves /api/** on :3000 by default; override via
  // VITE_API_BASE_URL if you want to point at a preview deployment.
  const apiBase = env.VITE_API_BASE_URL ?? 'http://localhost:3000';

  return {
    plugins: [react()],
    envDir: '../',
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
