import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Cloud sync store matching vite.config.ts
const cloudSyncStore = new Map();
app.use(express.json());

app.use('/api/sync', (req, res) => {
  if (req.method === 'POST') {
    try {
      const { code, data, timestamp } = req.body || {};
      const syncKey = String(code || 'DEFAULT').toUpperCase();
      const existing = cloudSyncStore.get(syncKey);
      if (existing && new Date(existing.updatedAt).getTime() > new Date(timestamp || 0).getTime()) {
        return res.json({ success: true, syncedData: existing.data });
      }
      cloudSyncStore.set(syncKey, {
        data,
        updatedAt: timestamp || new Date().toISOString(),
      });
      return res.json({ success: true, syncedData: data });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
  } else if (req.method === 'GET') {
    const code = String(req.query.code || 'DEFAULT').toUpperCase();
    const existing = cloudSyncStore.get(code);
    return res.json({ success: true, syncedData: existing ? existing.data : null });
  } else {
    return res.sendStatus(405);
  }
});

// Instant health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// Serve dist static assets.
// Hashed bundles under /assets are immutable and keep the long cache, but the
// app shell (index.html) and the service worker must always revalidate —
// otherwise a browser can keep booting an old build from its HTTP cache.
app.use(express.static(distPath, {
  maxAge: '1d',
  index: 'index.html',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running at http://localhost:${PORT}`);
});
