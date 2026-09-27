import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  initPushService,
  saveSubscription,
  getSubscription,
  removeSubscription,
  sendPushNotification,
  scheduleNotification,
  cancelScheduledNotification,
  getUserScheduledNotifications,
  cleanupExpiredSubscriptions,
  getServiceStats,
} from './server/pushService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Initialize Web Push service
const pushEnabled = initPushService({
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT || 'mailto:mybac-tracker@example.com',
});

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

// ========================================
// Web Push API Endpoints
// ========================================

/**
 * POST /api/push/subscribe
 * Subscribe a user to push notifications
 * Body: { userId: string, subscription: PushSubscription }
 */
app.post('/api/push/subscribe', (req, res) => {
  if (!pushEnabled) {
    return res.status(503).json({ error: 'Push service not configured' });
  }

  const { userId, subscription } = req.body;

  if (!userId || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid request: userId and subscription required' });
  }

  try {
    saveSubscription(userId, subscription);
    res.json({ success: true, message: 'Subscription saved' });
  } catch (err) {
    console.error('Failed to save subscription:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

/**
 * POST /api/push/unsubscribe
 * Unsubscribe a user from push notifications
 * Body: { userId: string }
 */
app.post('/api/push/unsubscribe', (req, res) => {
  if (!pushEnabled) {
    return res.status(503).json({ error: 'Push service not configured' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Invalid request: userId required' });
  }

  const removed = removeSubscription(userId);
  res.json({ success: removed, message: removed ? 'Unsubscribed' : 'No subscription found' });
});

/**
 * POST /api/push/send
 * Send an immediate push notification
 * Body: { userId: string, title: string, body: string, data?: object }
 */
app.post('/api/push/send', async (req, res) => {
  if (!pushEnabled) {
    return res.status(503).json({ error: 'Push service not configured' });
  }

  const { userId, title, body, icon, data, requireInteraction } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'Invalid request: userId, title, and body required' });
  }

  const result = await sendPushNotification(userId, {
    title,
    body,
    icon,
    data,
    requireInteraction,
  });

  if (result.success) {
    res.json({ success: true, message: 'Push notification sent' });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

/**
 * POST /api/push/schedule
 * Schedule a push notification for a future time
 * Body: { notificationId: string, userId: string, payload: object, scheduledTime: number }
 */
app.post('/api/push/schedule', (req, res) => {
  if (!pushEnabled) {
    return res.status(503).json({ error: 'Push service not configured' });
  }

  const { notificationId, userId, payload, scheduledTime } = req.body;

  if (!notificationId || !userId || !payload || !scheduledTime) {
    return res.status(400).json({
      error: 'Invalid request: notificationId, userId, payload, and scheduledTime required',
    });
  }

  const scheduled = scheduleNotification(notificationId, userId, payload, scheduledTime);

  if (scheduled) {
    res.json({ success: true, message: 'Notification scheduled' });
  } else {
    res.status(400).json({ success: false, error: 'Failed to schedule (time in past?)' });
  }
});

/**
 * DELETE /api/push/schedule/:notificationId
 * Cancel a scheduled notification
 */
app.delete('/api/push/schedule/:notificationId', (req, res) => {
  if (!pushEnabled) {
    return res.status(503).json({ error: 'Push service not configured' });
  }

  const { notificationId } = req.params;
  const cancelled = cancelScheduledNotification(notificationId);

  res.json({
    success: cancelled,
    message: cancelled ? 'Notification cancelled' : 'Notification not found',
  });
});

/**
 * GET /api/push/schedule/:userId
 * Get all scheduled notifications for a user
 */
app.get('/api/push/schedule/:userId', (req, res) => {
  if (!pushEnabled) {
    return res.status(503).json({ error: 'Push service not configured' });
  }

  const { userId } = req.params;
  const notifications = getUserScheduledNotifications(userId);
  res.json({ success: true, notifications });
});

/**
 * GET /api/push/stats
 * Get push service statistics
 */
app.get('/api/push/stats', (req, res) => {
  if (!pushEnabled) {
    return res.status(503).json({ error: 'Push service not configured' });
  }

  const stats = getServiceStats();
  res.json({ success: true, stats });
});

// Cleanup expired subscriptions every 24 hours
if (pushEnabled) {
  setInterval(() => {
    cleanupExpiredSubscriptions();
  }, 24 * 60 * 60 * 1000);
}

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
