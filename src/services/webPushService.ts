/**
 * Web Push & Background Notification Service - Client Side
 *
 * Handles:
 * 1. Requesting notification permission reliably across all modern browsers
 * 2. Managing subscription lifecycle and localStorage persistence
 * 3. Graceful fallback when running in PWA or standard static hosting
 * 4. Connecting to Service Worker and PushManager when available
 */

const STORAGE_SUB_KEY = 'bac_webpush_subscribed_v2';
const API_BASE = typeof window !== 'undefined' && import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3000';

export interface WebPushSubscription {
  userId: string;
  subscription: PushSubscription;
}

class WebPushService {
  private userId: string = 'guest';
  private subscription: PushSubscription | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  /**
   * Check if Notifications are supported in this browser
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Check if PushManager is supported
   */
  public isPushManagerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Initialize the service with user ID
   */
  public async init(userId: string): Promise<void> {
    this.userId = userId || 'guest';

    if (!this.isSupported()) {
      return;
    }

    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (reg) {
          this.swRegistration = reg;
          if (reg.pushManager) {
            const existing = await reg.pushManager.getSubscription();
            if (existing) {
              this.subscription = existing;
            }
          }
        }
      }
    } catch (err) {
      console.warn('WebPushService service worker init note:', err);
    }
  }

  /**
   * Request notification permission and activate push / background reminders
   */
  public async subscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // 1. Request notification permission from the browser
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.warn('Notification permission not granted:', permission);
        return false;
      }

      // 2. Mark locally subscribed in storage
      try {
        localStorage.setItem(STORAGE_SUB_KEY, 'true');
      } catch {}

      // 3. Try to acquire service worker registration if available
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          if (!this.swRegistration) {
            this.swRegistration = await Promise.race([
              navigator.serviceWorker.ready,
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
            ]);
          }

          // 4. If VAPID public key is configured and PushManager exists, register push subscription
          const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (vapidPublicKey && this.swRegistration?.pushManager) {
            const sub = await this.swRegistration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
            });
            this.subscription = sub;
            await this.syncSubscriptionWithBackend();
          }
        } catch (swErr) {
          console.warn('Optional pushManager subscription fallback note:', swErr);
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to activate notifications:', err);
      return false;
    }
  }

  /**
   * Deactivate push / background reminders
   */
  public async unsubscribe(): Promise<boolean> {
    try {
      localStorage.setItem(STORAGE_SUB_KEY, 'false');
    } catch {}

    if (this.subscription) {
      try {
        await this.subscription.unsubscribe();
      } catch {}
      this.subscription = null;
    }

    // Optional notification to backend
    if (this.userId && API_BASE) {
      try {
        fetch(`${API_BASE}/api/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: this.userId }),
        }).catch(() => {});
      } catch {}
    }

    return true;
  }

  /**
   * Check if currently subscribed
   */
  public isSubscribed(): boolean {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    try {
      const saved = localStorage.getItem(STORAGE_SUB_KEY);
      if (saved === 'true') return true;
    } catch {}

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
    const supported = this.isSupported();
    const permission = supported ? Notification.permission : 'denied';
    const subscribed = supported && permission === 'granted' && this.isSubscribed();

    return {
      supported,
      permission,
      subscribed,
    };
  }

  /**
   * Schedule a notification (dispatches to backend if available, or locally handled)
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
    if (!this.isSubscribed()) {
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
    } catch {
      // Backend is optional: client-side scheduler handles delivery locally
      return true;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelScheduledNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/push/schedule/${notificationId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result.success;
    } catch {
      return true;
    }
  }

  /**
   * Get all scheduled notifications
   */
  public async getScheduledNotifications(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE}/api/push/schedule/${this.userId}`);
      const result = await response.json();
      return result.notifications || [];
    } catch {
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
      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          subscription: this.subscription.toJSON(),
        }),
      });
    } catch (err) {
      console.warn('Backend push subscription sync skipped (offline or static host):', err);
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const webPushService = new WebPushService();
