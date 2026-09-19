import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { cloudSyncPlugin } from './server/dev-sync-plugin';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cloudSyncPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/public/**', '**/dist/**'],
      },
    },
  };
});
