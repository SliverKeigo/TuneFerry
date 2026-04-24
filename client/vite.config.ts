import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Load env from the repo root (one level above `client/`) so that
// the single `.env` at the root configures both workspaces.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', ['VITE_']);
  const apiBase = env.VITE_API_BASE_URL ?? 'http://localhost:8787';

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
