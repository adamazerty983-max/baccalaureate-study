/**
 * Central Notification Service for MyBac Tracker Pro.
 * 
 * Manages:
 * 1. Notification permissions (track, request, fallback gracefully if denied).
 * 2. Background interval scanning for due tasks, quizzes, homework, spaced-repetition lessons, goals, and habits.
 * 3. Persisted "already notified" set in IndexedDB to prevent duplicate reminders across reloads/tabs.
 * 4. In-App Notification Center history list with unread badges and deep-link routing.
 * 5. Quiet hours compliance and sound synchronization with chimePlayer.
 * 
 * NOTE ON FULL-BACKGROUND PUSH (PHASE 2):
 * Standard browser Notification APIs and client-side interval timers operate while the app or installed PWA
 * is active or running in the background. True "device fully closed / app killed" push delivery requires
 * Firebase Cloud Messaging (FCM) Web Push paired with a scheduled Firebase Cloud Function (cron worker).
 * The project already configures Firebase in src/lib/firebase.ts; full server-side FCM push is designated
 * as an optional Phase 2 cloud enhancement.
 */

import {
  FullAppData,
  InAppNotification,
  MainTabType,
  NotificationPreferences,
} from '../types';
import {
  loadInAppNotifications,
  loadNotifiedIds,
  saveInAppNotifications,
  saveNotifiedIds,
} from '../utils/indexedDB';
import { chimePlayer } from '../utils/audio';

type NotificationListener = (notifications: InAppNotification[]) => void;

class NotificationService {
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private notifiedIds = new Set<string>();
  private inAppNotifications: InAppNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private initialized = false;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private currentAppData: FullAppData | null = null;

  /**
   * Initialize service: load persisted already-notified IDs and cached in-app notifications.
   */
  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const [persistedIds, persistedNotifications] = await Promise.all([
        loadNotifiedIds(),
        loadInAppNotifications(),
      ]);

      this.notifiedIds = new Set(persistedIds || []);
      this.inAppNotifications = persistedNotifications || [];
    } catch (err) {
      console.warn('Failed to load persisted notifications state:', err);
    }

    // Capture service worker registration if available
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          this.swRegistration = reg;
        })
        .catch(() => {});
    }

    this.initialized = true;
    this.notifyListeners();
  }

  /**
   * Check if the Notification API is supported by the current browser/OS.
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Current notification permission state ('granted' | 'denied' | 'default').
   */
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Request browser notification permission from the user.
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch (err) {
      console.warn('Notification permission request error:', err);
      return 'denied';
    }
  }

  /**
   * Subscribe to live in-app notification center changes.
   */
  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener(this.inAppNotifications);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const list = [...this.inAppNotifications];
    this.listeners.forEach((l) => l(list));
  }

  /**
   * Get total unread in-app notification count.
   */
  public getUnreadCount(): number {
    return this.inAppNotifications.filter((n) => !n.read).length;
  }

  /**
   * Mark an in-app notification as read.
   */
  public async markAsRead(id: string): Promise<void> {
    this.inAppNotifications = this.inAppNotifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notifyListeners();
    await saveInAppNotifications(this.inAppNotifications);
  }

  /**
   * Mark all in-app notifications as read.
   */
  public async markAllAsRead(): Promise<void> {
    this.inAppNotifications = this.inAppNotifications.map((n) => ({
      ...n,
      read: true,
    }));
    this.notifyListeners();
    await saveInAppNotifications(this.inAppNotifications);
  }

  /**
   * Clear all in-app notifications from the center.
   */
  public async clearAll(): Promise<void> {
    this.inAppNotifications = [];
    this.notifyListeners();
    await saveInAppNotifications(this.inAppNotifications);
  }

  /**
   * Start or update the background polling scan loop with latest app data.
   */
  public startScheduler(appData: FullAppData): void {
    this.currentAppData = appData;

    // Run initial scan immediately
    this.scanForReminders(appData);

    // Schedule recurring scan every 45 seconds
    if (!this.scanInterval) {
      this.scanInterval = setInterval(() => {
        if (this.currentAppData) {
          this.scanForReminders(this.currentAppData);
        }
      }, 45000);
    }
  }

  /**
   * Update current app data used by scheduler.
   */
  public updateAppData(appData: FullAppData): void {
    this.currentAppData = appData;
    this.scanForReminders(appData);
  }

  /**
   * Stop the scheduler loop.
   */
  public stopScheduler(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  /**
   * Check if current time falls within Quiet Hours (e.g. 23:00 - 07:00).
   */
  public isInQuietHours(quietHours?: NotificationPreferences['quietHours']): boolean {
    if (!quietHours || !quietHours.enabled) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (quietHours.start || '23:00').split(':').map(Number);
    const [endH, endM] = (quietHours.end || '07:00').split(':').map(Number);

    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range, e.g. 23:00 to 07:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  /**
   * Core scanner: analyzes tasks, quizzes, homework, lessons, goals, habits for reminders.
   */
  public async scanForReminders(appData: FullAppData): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    const prefs = appData.settings.notifications;
    if (!prefs || prefs.enabled === false) {
      return;
    }

    const now = new Date();
    const nowTime = now.getTime();
    const leadTimeMinutes = prefs.leadTimeMinutes ?? 30;
    const leadTimeMs = leadTimeMinutes * 60 * 1000;
    const quiet = this.isInQuietHours(prefs.quietHours);
    const lang = appData.settings.language || 'fr';

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let newRemindersTriggered = false;

    // 1. Tasks Reminders
    if (prefs.modules.tasks !== false && appData.tasks) {
      for (const task of appData.tasks) {
        if (task.status === 'completed') continue;

        const dateStr = task.reminderDate || task.dueDate;
        if (!dateStr) continue;

        const timeStr = task.dueTime || '18:00';
        const targetDateTime = new Date(`${task.dueDate || dateStr}T${timeStr}:00`).getTime();
        if (isNaN(targetDateTime)) continue;

        const diff = targetDateTime - nowTime;
        // Trigger if within lead time window (or overdue by less than 2 hours)
        if (diff <= leadTimeMs && diff >= -7200000) {
          const uniqueId = `task_${task.id}_${task.dueDate}_${timeStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title =
              lang === 'ar'
                ? `تذكير بمهمة: ${task.title}`
                : lang === 'en'
                  ? `Task Reminder: ${task.title}`
                  : `Rappel de tâche : ${task.title}`;

            const message =
              lang === 'ar'
                ? `المادة: ${task.subject} • موعد الإنجاز: ${task.dueDate} (${timeStr})`
                : lang === 'en'
                  ? `Subject: ${task.subject} • Due: ${task.dueDate} at ${timeStr}`
                  : `Matière : ${task.subject} • Échéance : ${task.dueDate} à ${timeStr}`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'tasks',
              title,
              message,
              tab: 'tasks',
              itemId: task.id,
              quiet,
              appData,
            });
          }
        }
      }
    }

    // 2. Quizzes / Exams Reminders
    if (prefs.modules.quizzes !== false && appData.quizzes) {
      for (const quiz of appData.quizzes) {
        if (quiz.status === 'completed') continue;

        const targetDateTime = new Date(`${quiz.date}T${quiz.time || '08:00'}:00`).getTime();
        if (isNaN(targetDateTime)) continue;

        const diff = targetDateTime - nowTime;
        if (diff <= leadTimeMs && diff >= -7200000) {
          const uniqueId = `quiz_${quiz.id}_${quiz.date}_${quiz.time || ''}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title =
              lang === 'ar'
                ? `موعد اختبار وشيك: ${quiz.title}`
                : lang === 'en'
                  ? `Upcoming Quiz / Exam: ${quiz.title}`
                  : `Épreuve imminente : ${quiz.title}`;

            const message =
              lang === 'ar'
                ? `مادة ${quiz.subject} • اليوم على الساعة ${quiz.time}${quiz.room ? ` (قاعة ${quiz.room})` : ''}`
                : lang === 'en'
                  ? `${quiz.subject} • At ${quiz.time}${quiz.room ? ` (Room ${quiz.room})` : ''}`
                  : `${quiz.subject} • À ${quiz.time}${quiz.room ? ` (Salle ${quiz.room})` : ''}`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'quizzes',
              title,
              message,
              tab: 'quizzes',
              itemId: quiz.id,
              quiet,
              appData,
            });
          }
        }
      }
    }

    // 3. Homework Reminders
    if (prefs.modules.homework !== false && appData.homework) {
      for (const hw of appData.homework) {
        if (hw.status === 'submitted') continue;

        const targetDateTime = new Date(`${hw.dueDate}T${hw.dueTime || '18:00'}:00`).getTime();
        if (isNaN(targetDateTime)) continue;

        const diff = targetDateTime - nowTime;
        if (diff <= leadTimeMs && diff >= -7200000) {
          const uniqueId = `hw_${hw.id}_${hw.dueDate}_${hw.dueTime || ''}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title =
              lang === 'ar'
                ? `تذكير بتسليم فرض: ${hw.title}`
                : lang === 'en'
                  ? `Homework Deadline: ${hw.title}`
                  : `Devoir à rendre : ${hw.title}`;

            const message =
              lang === 'ar'
                ? `مادة ${hw.subject} • الموعد النهائي: ${hw.dueDate} الساعة ${hw.dueTime}`
                : lang === 'en'
                  ? `${hw.subject} • Due: ${hw.dueDate} at ${hw.dueTime}`
                  : `${hw.subject} • Date limite : ${hw.dueDate} à ${hw.dueTime}`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'homework',
              title,
              message,
              tab: 'homework',
              itemId: hw.id,
              quiet,
              appData,
            });
          }
        }
      }
    }

    // 4. Spaced Repetition Lessons (J+1, J+3, J+7, J+14, J+30)
    if (prefs.modules.lessons !== false && appData.lessons) {
      for (const lesson of appData.lessons) {
        if (lesson.isMemorized) continue;

        if (lesson.nextReviewDate && lesson.nextReviewDate <= todayStr) {
          const uniqueId = `lesson_${lesson.id}_${lesson.nextReviewDate}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title =
              lang === 'ar'
                ? `حان موعد المراجعة التكرارية (J+${lesson.stage})`
                : lang === 'en'
                  ? `Spaced Repetition Review Due (J+${lesson.stage})`
                  : `Session de Révision J+${lesson.stage} requise`;

            const message =
              lang === 'ar'
                ? `درس: ${lesson.title} (${lesson.subject}) • نسبة التمكن: ${lesson.masteryLevel || 0}%`
                : lang === 'en'
                  ? `Lesson: ${lesson.title} (${lesson.subject}) • Mastery: ${lesson.masteryLevel || 0}%`
                  : `Leçon : ${lesson.title} (${lesson.subject}) • Maîtrise : ${lesson.masteryLevel || 0}%`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'lessons',
              title,
              message,
              tab: 'revision',
              itemId: lesson.id,
              quiet,
              appData,
            });
          }
        }
      }
    }

    // 5. Goals Target Reminders
    if (prefs.modules.goals !== false && appData.goals) {
      for (const goal of appData.goals) {
        if (goal.done) continue;

        if (goal.targetDate && goal.targetDate <= todayStr) {
          const uniqueId = `goal_${goal.id}_${goal.targetDate}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title =
              lang === 'ar'
                ? `تذكير بالهدف الدراسي`
                : lang === 'en'
                  ? `Study Goal Target Date`
                  : `Objectif d'étude à atteindre`;

            const message =
              lang === 'ar'
                ? `الهدف: ${goal.title} • التاريخ المستهدف: ${goal.targetDate}`
                : lang === 'en'
                  ? `Goal: ${goal.title} • Target date: ${goal.targetDate}`
                  : `Objectif : ${goal.title} • Date visée : ${goal.targetDate}`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'goals',
              title,
              message,
              tab: 'goals',
              itemId: goal.id,
              quiet,
              appData,
            });
          }
        }
      }
    }

    // 6. Daily Habit Streak Reminder
    if (prefs.modules.habits !== false && appData.habits && appData.habits.length > 0) {
      const habitReminderTime = prefs.habitReminderTime || '20:00';
      if (currentTimeStr >= habitReminderTime) {
        const incompleteHabits = appData.habits.filter(
          (h) => !h.history || !h.history.includes(todayStr)
        );

        if (incompleteHabits.length > 0) {
          const uniqueId = `habits_streak_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const count = incompleteHabits.length;
            const title =
              lang === 'ar'
                ? `حافظ على شعلة عاداتك اليومية 🔥`
                : lang === 'en'
                  ? `Protect Your Daily Habit Streak 🔥`
                  : `Protège ta flamme d'habitudes 🔥`;

            const message =
              lang === 'ar'
                ? `لديك ${count} عادة لم تُكملها اليوم بعد. اضغط هنا لتسجيل إنجازك!`
                : lang === 'en'
                  ? `You have ${count} habit(s) pending for today. Tap to check them in!`
                  : `Tu as ${count} habitude(s) non validée(s) aujourd'hui. Valide-les pour garder ton streak !`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'habits',
              title,
              message,
              tab: 'habits',
              quiet,
              appData,
            });
          }
        }
      }
    }

    if (newRemindersTriggered) {
      await saveNotifiedIds(Array.from(this.notifiedIds));
      await saveInAppNotifications(this.inAppNotifications);
    }
  }

  /**
   * Resolve active Service Worker registration (guarantees native Windows desktop toast support).
   */
  public async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.swRegistration) return this.swRegistration;
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (reg) {
          this.swRegistration = reg;
          return reg;
        }
        const existing = await navigator.serviceWorker.getRegistration();
        if (existing) {
          this.swRegistration = existing;
          return existing;
        }
      } catch (err) {
        console.warn('Could not acquire serviceWorker registration:', err);
      }
    }
    return null;
  }

  /**
   * Dispatches the reminder to:
   * 1. In-App Notification Center history list
   * 2. Audio Chime (if sound enabled and not in quiet hours)
   * 3. Windows Desktop / Browser Native Notification (via ServiceWorker or Notification constructor)
   */
  private async dispatchReminder(params: {
    id: string;
    type: InAppNotification['type'];
    title: string;
    message: string;
    tab: MainTabType;
    itemId?: string;
    quiet: boolean;
    appData: FullAppData;
  }): Promise<void> {
    const { id, type, title, message, tab, itemId, quiet, appData } = params;

    // 1. Add to In-App Notification Center (retaining latest 40 items)
    const newInAppItem: InAppNotification = {
      id,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      tab,
      itemId,
      read: false,
    };

    this.inAppNotifications = [newInAppItem, ...this.inAppNotifications.filter((n) => n.id !== id)].slice(
      0,
      40
    );
    this.notifyListeners();

    // 2. Play gentle audio chime (if allowed and not in quiet hours)
    if (!quiet && appData.settings.chimeSoundEnabled) {
      try {
        chimePlayer.playChime('notification');
      } catch (err) {
        console.warn('Notification chime failed:', err);
      }
    }

    // 3. Dispatch Windows Desktop / Browser System notification (if not in quiet hours and permission granted)
    if (!quiet && this.isSupported() && Notification.permission === 'granted') {
      const iconUrl = `${import.meta.env.BASE_URL}original_icon_512.png`;
      const notificationData = {
        tab,
        itemId,
        url: `/?tab=${tab}${itemId ? `&id=${encodeURIComponent(itemId)}` : ''}`,
      };

      const isHighPriority = type === 'quizzes' || type === 'homework';
      const options: NotificationOptions & { renotify?: boolean } = {
        body: message,
        icon: iconUrl,
        badge: iconUrl,
        data: notificationData,
        tag: id,
        renotify: true,
        requireInteraction: isHighPriority,
        silent: false,
      };

      try {
        const reg = await this.getRegistration();
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, options);
        } else {
          const notif = new Notification(title, options);
          notif.onclick = () => {
            window.focus();
            window.location.hash = `#${tab}`;
            notif.close();
          };
        }
      } catch (err) {
        console.warn('Failed to display native system notification:', err);
      }
    }
  }

  /**
   * Trigger a manual test notification to verify audio and system integration.
   */
  public async sendTestNotification(appData: FullAppData): Promise<boolean> {
    // If permission has not been granted yet, prompt user immediately
    if (this.isSupported() && Notification.permission === 'default') {
      const perm = await this.requestPermission();
      if (perm === 'granted') {
        chimePlayer.playChime('toast_success');
      }
    }

    const lang = appData.settings.language || 'fr';
    const title =
      lang === 'ar'
        ? 'إشعار سطح المكتب نشط 🔔'
        : lang === 'en'
          ? 'Desktop Notification Active 🔔'
          : 'Notification Bureau Active 🔔';

    const message =
      lang === 'ar'
        ? 'نظام إشعارات سطح المكتب في MyBac Tracker Pro يعمل بكفاءة تامة!'
        : lang === 'en'
          ? 'MyBac Tracker Pro desktop notification engine is operating smoothly!'
          : 'Le moteur de notifications bureau de MyBac Tracker fonctionne parfaitement !';

    const testId = `test_${Date.now()}`;
    await this.dispatchReminder({
      id: testId,
      type: 'system',
      title,
      message,
      tab: 'settings',
      quiet: false,
      appData,
    });

    return true;
  }
}

export const notificationService = new NotificationService();
