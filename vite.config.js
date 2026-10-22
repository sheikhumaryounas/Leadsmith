import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Where the Leadsmith API runs. Set API_URL in .env to point somewhere else.
  const env = loadEnv(mode, process.cwd(), '');
  const api = env.API_URL || 'http://localhost:4000';
  const proxy = { '/api': { target: api, changeOrigin: true } };
  return {
    plugins: [react()],
    // Same-origin /api requests keep the login cookie simple.
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  };
});
