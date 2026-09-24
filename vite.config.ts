import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { cloudSyncPlugin } from './server/dev-sync-plugin';

export default defineConfig(() => {
  return {
    base: '/baccalaureate-study/',
    plugins: [react(), tailwindcss(), cloudSyncPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      minify: 'esbuild',
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Firebase ecosystem
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }

            // Supabase
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }

            // React ecosystem
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }

            // Animation libraries
            if (id.includes('node_modules/motion') || id.includes('node_modules/canvas-confetti')) {
              return 'vendor-animations';
            }

            // Lucide icons
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }

            // Google AI
            if (id.includes('node_modules/@google/genai')) {
              return 'vendor-ai';
            }

            // Other node_modules
            if (id.includes('node_modules/')) {
              return 'vendor-misc';
            }
          },
        },
      },
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
