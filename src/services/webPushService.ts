/**
 * Web Push Service - Client Side
 *
 * Handles:
 * 1. Requesting notification permission
 * 2. Subscribing to push notifications via PushManager
 * 3. Sending subscription to backend
 * 4. Managing subscription lifecycle (renewal, unsubscribe)
 * 5. Integrating with existing notification triggers
 */

const API_BASE = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3000';

export interface WebPushSubscription {
  userId: string;
  subscription: PushSubscription;
}

class WebPushService {
  private userId: string | null = null;
  private subscription: PushSubscription | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  /**
   * Check if Web Push is supported
   */
  public isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Initialize the service with user ID
   */
  public async init(userId: string): Promise<void> {
    this.userId = userId;

    if (!this.isSupported()) {
      console.warn('⚠️  Web Push is not supported in this browser');
      return;
    }

    try {
      // Get service worker registration
      this.swRegistration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription = await this.swRegistration.pushManager.getSubscription();
      if (existingSubscription) {
        this.subscription = existingSubscription;
        console.log('✅ Already subscribed to Web Push');

        // Sync with backend (in case backend lost it)
        await this.syncSubscriptionWithBackend();
      }
    } catch (err) {
      console.error('Failed to initialize Web Push service:', err);
    }
  }

  /**
   * Request notification permission and subscribe to push
   */
  public async subscribe(): Promise<boolean> {
    if (!this.isSupported() || !this.swRegistration || !this.userId) {
      console.warn('⚠️  Cannot subscribe: prerequisites not met');
      return false;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.log('❌ Notification permission denied');
        return false;
      }

      // Get VAPID public key from environment
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('❌ VAPID public key not configured');
        return false;
      }

      // Subscribe to push notifications
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      this.subscription = subscription;
      console.log('✅ Subscribed to Web Push');

      // Send subscription to backend
      await this.syncSubscriptionWithBackend();

      return true;
    } catch (err) {
      console.error('Failed to subscribe to Web Push:', err);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribe(): Promise<boolean> {
    if (!this.subscription || !this.userId) {
      return false;
    }

    try {
      // Unsubscribe from PushManager
      await this.subscription.unsubscribe();

      // Notify backend
      await fetch(`${API_BASE}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId }),
      });

      this.subscription = null;
      console.log('✅ Unsubscribed from Web Push');

      return true;
    } catch (err) {
      console.error('Failed to unsubscribe from Web Push:', err);
      return false;
    }
  }

  /**
   * Check if currently subscribed
   */
  public isSubscribed(): boolean {
    return this.subscription !== null;
  }

  /**
   * Get current subscription status
   */
  public getSubscriptionStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
  } {
    return {
      supported: this.isSupported(),
      permission: this.isSupported() ? Notification.permission : 'denied',
      subscribed: this.isSubscribed(),
    };
  }

  /**
   * Schedule a notification on the backend
   */
  public async scheduleNotification(
    notificationId: string,
    scheduledTime: Date | number,
    payload: {
      title: string;
      body: string;
      icon?: string;
      data?: any;
      requireInteraction?: boolean;
    }
  ): Promise<boolean> {
    if (!this.userId || !this.isSubscribed()) {
      console.warn('⚠️  Cannot schedule: user not subscribed');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/api/push/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          userId: this.userId,
          payload,
          scheduledTime: scheduledTime instanceof Date ? scheduledTime.getTime() : scheduledTime,
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (err) {
      console.error('Failed to schedule notification:', err);
      return false;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelScheduledNotification(notificationId: string): Promise<boolean> {
    if (!this.userId) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/api/push/schedule/${notificationId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      return result.success;
    } catch (err) {
      console.error('Failed to cancel scheduled notification:', err);
      return false;
    }
  }

  /**
   * Get all scheduled notifications
   */
  public async getScheduledNotifications(): Promise<any[]> {
    if (!this.userId) {
      return [];
    }

    try {
      const response = await fetch(`${API_BASE}/api/push/schedule/${this.userId}`);
      const result = await response.json();
      return result.notifications || [];
    } catch (err) {
      console.error('Failed to get scheduled notifications:', err);
      return [];
    }
  }

  /**
   * Send subscription to backend
   */
  private async syncSubscriptionWithBackend(): Promise<void> {
    if (!this.subscription || !this.userId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          subscription: this.subscription.toJSON(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Subscription synced with backend');
      } else {
        console.error('❌ Failed to sync subscription with backend');
      }
    } catch (err) {
      console.error('Failed to sync subscription with backend:', err);
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const webPushService = new WebPushService();
