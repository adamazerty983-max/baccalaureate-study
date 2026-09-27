/**
 * Web Push Service - Backend Component for True Background Notifications
 *
 * This service enables notifications to arrive even when the browser/app is fully closed.
 *
 * Key Components:
 * 1. Store push subscriptions from clients (PushSubscription objects)
 * 2. Schedule notifications at specific times (task start/end, Focus sessions, reminders)
 * 3. Send Web Push messages using VAPID authentication
 * 4. Handle subscription lifecycle (renewal, expiry, unsubscribe)
 *
 * HOSTING REQUIREMENT:
 * This backend must run on a persistent server (not static hosting like GitHub Pages).
 * Free hosting options:
 * - Render.com (free tier)
 * - Railway.app (free tier with credit)
 * - Fly.io (free tier)
 * - Vercel/Netlify serverless functions (for scheduled push triggers)
 */

import webpush from 'web-push';

// In-memory store for subscriptions (replace with database in production)
const subscriptions = new Map();

// In-memory store for scheduled notifications (replace with Redis/queue in production)
const scheduledNotifications = new Map();

/**
 * Initialize Web Push with VAPID keys
 */
export function initPushService(vapidConfig) {
  if (!vapidConfig.publicKey || !vapidConfig.privateKey || !vapidConfig.subject) {
    console.warn('⚠️  VAPID keys not configured. Web Push will not work.');
    return false;
  }

  webpush.setVapidDetails(
    vapidConfig.subject,
    vapidConfig.publicKey,
    vapidConfig.privateKey
  );

  console.log('✅ Web Push Service initialized with VAPID');
  return true;
}

/**
 * Store a push subscription for a user
 * @param {string} userId - Unique user identifier
 * @param {Object} subscription - PushSubscription object from client
 */
export function saveSubscription(userId, subscription) {
  subscriptions.set(userId, {
    subscription,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  });
  console.log(`📱 Saved push subscription for user: ${userId}`);
  return true;
}

/**
 * Get a user's push subscription
 */
export function getSubscription(userId) {
  const data = subscriptions.get(userId);
  return data ? data.subscription : null;
}

/**
 * Remove a user's push subscription
 */
export function removeSubscription(userId) {
  const existed = subscriptions.delete(userId);
  if (existed) {
    console.log(`🗑️  Removed push subscription for user: ${userId}`);
  }
  return existed;
}

/**
 * Send a push notification to a specific user
 * @param {string} userId - Target user ID
 * @param {Object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {string} payload.icon - Icon URL
 * @param {Object} payload.data - Custom data (tab, itemId, etc.)
 */
export async function sendPushNotification(userId, payload) {
  const subscription = getSubscription(userId);

  if (!subscription) {
    console.warn(`⚠️  No push subscription found for user: ${userId}`);
    return { success: false, error: 'No subscription' };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || 'MyBac Tracker',
    body: payload.body || 'Vous avez une notification',
    icon: payload.icon || '/original_icon_512.png',
    badge: payload.badge || '/original_icon_512.png',
    data: payload.data || {},
    requireInteraction: payload.requireInteraction || false,
    vibrate: payload.vibrate || [200, 100, 200],
  });

  try {
    const result = await webpush.sendNotification(subscription, notificationPayload);

    // Update last used timestamp
    const data = subscriptions.get(userId);
    if (data) {
      data.lastUsed = new Date().toISOString();
    }

    console.log(`✅ Push notification sent to user: ${userId}`);
    return { success: true, result };
  } catch (error) {
    console.error(`❌ Failed to send push notification to user ${userId}:`, error);

    // Handle subscription expiry (410 Gone)
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`🗑️  Subscription expired for user: ${userId}. Removing.`);
      removeSubscription(userId);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Schedule a push notification to fire at a specific time
 * @param {string} notificationId - Unique notification ID
 * @param {string} userId - Target user ID
 * @param {Object} payload - Notification payload
 * @param {Date|number} scheduledTime - When to send (Date object or timestamp)
 */
export function scheduleNotification(notificationId, userId, payload, scheduledTime) {
  const targetTime = scheduledTime instanceof Date ? scheduledTime.getTime() : scheduledTime;
  const now = Date.now();
  const delay = targetTime - now;

  if (delay <= 0) {
    console.warn(`⚠️  Scheduled time is in the past for notification: ${notificationId}`);
    return false;
  }

  // Clear existing timeout if any
  const existing = scheduledNotifications.get(notificationId);
  if (existing) {
    clearTimeout(existing.timeoutId);
  }

  // Schedule the notification
  const timeoutId = setTimeout(async () => {
    console.log(`⏰ Triggering scheduled notification: ${notificationId}`);
    await sendPushNotification(userId, payload);
    scheduledNotifications.delete(notificationId);
  }, delay);

  scheduledNotifications.set(notificationId, {
    timeoutId,
    userId,
    payload,
    scheduledTime: new Date(targetTime).toISOString(),
    createdAt: new Date().toISOString(),
  });

  console.log(`⏰ Scheduled notification ${notificationId} for user ${userId} at ${new Date(targetTime).toISOString()}`);
  return true;
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(notificationId) {
  const existing = scheduledNotifications.get(notificationId);
  if (existing) {
    clearTimeout(existing.timeoutId);
    scheduledNotifications.delete(notificationId);
    console.log(`🚫 Cancelled scheduled notification: ${notificationId}`);
    return true;
  }
  return false;
}

/**
 * Get all scheduled notifications for a user
 */
export function getUserScheduledNotifications(userId) {
  const userNotifications = [];
  for (const [id, data] of scheduledNotifications.entries()) {
    if (data.userId === userId) {
      userNotifications.push({
        id,
        scheduledTime: data.scheduledTime,
        payload: data.payload,
      });
    }
  }
  return userNotifications;
}

/**
 * Clean up expired subscriptions (run periodically)
 */
export function cleanupExpiredSubscriptions() {
  const now = Date.now();
  const expiryThreshold = 90 * 24 * 60 * 60 * 1000; // 90 days
  let cleaned = 0;

  for (const [userId, data] of subscriptions.entries()) {
    const lastUsed = new Date(data.lastUsed).getTime();
    if (now - lastUsed > expiryThreshold) {
      subscriptions.delete(userId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired subscription(s)`);
  }
}

/**
 * Get service statistics
 */
export function getServiceStats() {
  return {
    totalSubscriptions: subscriptions.size,
    scheduledNotifications: scheduledNotifications.size,
    uptime: process.uptime(),
  };
}
