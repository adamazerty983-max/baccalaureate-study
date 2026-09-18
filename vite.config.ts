import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// In-memory cloud sync store keyed by room code
const cloudSyncStore = new Map<string, { data: unknown; updatedAt: string }>();

function cloudSyncPlugin(): Plugin {
  return {
    name: 'cloud-sync-plugin',
    configureServer(server) {
      server.middlewares.use('/api/sync', async (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const { code, data, timestamp } = JSON.parse(body || '{}');
              const syncKey = String(code || 'DEFAULT').toUpperCase();
              
              const existing = cloudSyncStore.get(syncKey);
              if (existing && new Date(existing.updatedAt).getTime() > new Date(timestamp || 0).getTime()) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, syncedData: existing.data }));
                return;
              }

              cloudSyncStore.set(syncKey, {
                data,
                updatedAt: timestamp || new Date().toISOString(),
              });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, syncedData: data }));
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid payload' }));
            }
          });
        } else if (req.method === 'GET') {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const code = url.searchParams.get('code')?.toUpperCase() || 'DEFAULT';
          const existing = cloudSyncStore.get(code);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, syncedData: existing ? existing.data : null }));
        } else {
          res.writeHead(405);
          res.end();
        }
      });
    },
  };
}

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
