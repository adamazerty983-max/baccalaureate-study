/**
 * Central Notification Service for MyBac Tracker Pro.
 * 
 * Manages:
 * 1. Notification permissions (track, request, fallback gracefully if denied).
 * 2. Background interval scanning for:
 *    - Daily Timetable / TimeBlocking sessions (10 min before, 5 min before, right now)
 *    - Homework deadlines (advance reminders at J-2, J-1, and day-of/imminent)
 *    - Exams & Quizzes (advance reminders at J-2, J-1, and day-of/imminent)
 *    - Daily tasks & deadlines
 *    - Spaced-repetition revision lessons (J+1, J+3, J+7, J+14, J+30)
 *    - Study goals and daily habit streaks.
 * 3. On-screen floating HUD banner dispatch (guarantees alerts appear on screen even if
 *    Windows Focus Assist or browser permission blocks OS toasts).
 * 4. Persisted "already notified" set in IndexedDB to prevent duplicate reminders.
 * 5. In-App Notification Center history list with unread badges and deep-link routing.
 * 6. Quiet hours compliance and sound synchronization with chimePlayer.
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
type HUDListener = (notification: InAppNotification) => void;

class NotificationService {
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private notifiedIds = new Set<string>();
  private inAppNotifications: InAppNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private hudListeners: Set<HUDListener> = new Set();
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

  /**
   * Subscribe to live on-screen floating HUD banner alerts.
   */
  public onHUD(listener: HUDListener): () => void {
    this.hudListeners.add(listener);
    return () => {
      this.hudListeners.delete(listener);
    };
  }

  /**
   * Trigger a HUD notification directly.
   */
  public triggerHUD(notification: InAppNotification): void {
    this.hudListeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (err) {
        console.warn('Error in HUD listener:', err);
      }
    });
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

    // Schedule recurring scan every 30 seconds
    if (!this.scanInterval) {
      this.scanInterval = setInterval(() => {
        if (this.currentAppData) {
          this.scanForReminders(this.currentAppData);
        }
      }, 30000);
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
   * Core scanner: analyzes tasks, quizzes, homework, timeblocks, lessons, goals, habits.
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
    const isAr = lang === 'ar';
    const isEn = lang === 'en';

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const todayMidnight = new Date(yyyy, now.getMonth(), now.getDate()).getTime();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDayOfWeek = now.getDay(); // 0: Sunday, 1: Monday, ... 6: Saturday

    let newRemindersTriggered = false;

    // Helper to calculate whole calendar day difference (targetDate - todayDate)
    const getCalendarDaysDiff = (dateString: string): number => {
      try {
        const [y, m, d] = dateString.split('-').map(Number);
        const targetMidnight = new Date(y, m - 1, d).getTime();
        return Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      } catch {
        return NaN;
      }
    };

    // =========================================================================
    // 1. TimeBlocking / Timetable Sessions (10m before, 5m before, and Start)
    // =========================================================================
    if (prefs.modules.timeblocking !== false && appData.timeBlocks) {
      for (const block of appData.timeBlocks) {
        if (block.isCompleted) continue;

        // Verify if this block is scheduled for today
        const matchesDate = block.dateKey
          ? block.dateKey === todayStr
          : block.dayOfWeek === currentDayOfWeek;

        if (!matchesDate) continue;

        // Parse start time "HH:mm"
        const [sH, sM] = (block.startTime || '08:00').split(':').map(Number);
        const blockStartMinutes = (sH || 0) * 60 + (sM || 0);
        const diffMinutes = blockStartMinutes - currentMinutes;

        const sessionName = block.title || block.subject || (isAr ? 'جلسة مذاكرة' : 'Session d’étude');

        // A. 10 minutes before session
        if (diffMinutes >= 8 && diffMinutes <= 11) {
          const uniqueId = `tb_10m_${block.id}_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `اقترب موعد الجلسة: ${sessionName} (بعد 10 دقائق)`
              : isEn
                ? `Upcoming Session: ${sessionName} (in 10 min)`
                : `Session d’étude imminente : ${sessionName} (dans 10 min)`;

            const message = isAr
              ? `تبدأ الجلسة على الساعة ${block.startTime} • استعد وجهّز ملخصاتك 📚`
              : isEn
                ? `Starts at ${block.startTime} • Get your study materials ready 📚`
                : `Début à ${block.startTime} • Préparez vos cours et installez-vous 📚`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'timeblocking',
              title,
              message,
              tab: 'timeblocking',
              itemId: block.id,
              badge: isAr ? 'بعد 10 د' : isEn ? 'In 10m' : 'Dans 10 min',
              urgency: 'soon',
              quiet,
              appData,
            });
          }
        }

        // B. 5 minutes before session
        if (diffMinutes >= 3 && diffMinutes <= 6) {
          const uniqueId = `tb_5m_${block.id}_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `استعد! تبدأ الجلسة بعد 5 دقائق: ${sessionName}`
              : isEn
                ? `Get ready! Session starts in 5 min: ${sessionName}`
                : `Préparez-vous ! La session commence dans 5 min : ${sessionName}`;

            const message = isAr
              ? `من الساعة ${block.startTime} إلى ${block.endTime} • ركّز وابدأ بقوة 🎯`
              : isEn
                ? `From ${block.startTime} to ${block.endTime} • Deep focus mode ready 🎯`
                : `De ${block.startTime} à ${block.endTime} • Restez concentré et démarrez 🎯`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'timeblocking',
              title,
              message,
              tab: 'timeblocking',
              itemId: block.id,
              badge: isAr ? 'بعد 5 د' : isEn ? 'In 5m' : 'Dans 5 min',
              urgency: 'imminent',
              quiet,
              appData,
            });
          }
        }

        // C. At start time / Just started
        if (diffMinutes >= -4 && diffMinutes <= 1) {
          const uniqueId = `tb_start_${block.id}_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `حان وقت الجلسة الدراسية: ${sessionName} 🚀`
              : isEn
                ? `Time to study: ${sessionName} 🚀`
                : `C'est l'heure ! Début de session : ${sessionName} 🚀`;

            const message = isAr
              ? `الجلسة نشطة الآن (${block.startTime} - ${block.endTime}). اضغط هنا لفتح وضع التركيز Focus Mode`
              : isEn
                ? `Session active now (${block.startTime} - ${block.endTime}). Tap to open Focus Mode.`
                : `Session en cours (${block.startTime} - ${block.endTime}). Cliquez pour ouvrir le mode Focus.`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'timeblocking',
              title,
              message,
              tab: 'timeblocking',
              itemId: block.id,
              badge: isAr ? 'الآن' : isEn ? 'Now' : 'Maintenant',
              urgency: 'imminent',
              quiet,
              appData,
            });
          }
        }
      }
    }

    // =========================================================================
    // 2. Homework Reminders (J-2 Advance, J-1 Tomorrow, Day-Of, and Imminent)
    // =========================================================================
    if (prefs.modules.homework !== false && appData.homework) {
      for (const hw of appData.homework) {
        if (hw.status === 'submitted') continue;

        const diffDays = getCalendarDaysDiff(hw.dueDate);
        const timeStr = hw.dueTime || '18:00';

        // A. Advance J-2 Reminder (2 days before)
        if (diffDays === 2 && (prefs.advanceDaysReminders ?? true)) {
          const uniqueId = `hw_j2_${hw.id}_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `تذكير استباقي: موعد تسليم الفرض بعد يومين ⚠️`
              : isEn
                ? `Advance Reminder: Homework due in 2 days ⚠️`
                : `Rappel J-2 : Devoir à rendre dans 2 jours ⚠️`;

            const message = isAr
              ? `مادة ${hw.subject}: "${hw.title}" مستحق في ${hw.dueDate} (${timeStr}). ابدأ بالتحضير مبكراً!`
              : isEn
                ? `${hw.subject}: "${hw.title}" due on ${hw.dueDate} at ${timeStr}. Start early!`
                : `Matière ${hw.subject} : "${hw.title}" pour le ${hw.dueDate} à ${timeStr}. Anticipez votre travail !`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'homework',
              title,
              message,
              tab: 'homework',
              itemId: hw.id,
              badge: 'J-2',
              urgency: 'soon',
              quiet,
              appData,
            });
          }
        }

        // B. Advance J-1 Reminder (Tomorrow / غداً)
        if (diffDays === 1 && (prefs.advanceDaysReminders ?? true)) {
          const uniqueId = `hw_j1_${hw.id}_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `تنبيه حاسم: موعد تسليم الفرض غداً! ⏳`
              : isEn
                ? `Urgent Reminder: Homework due tomorrow! ⏳`
                : `Attention J-1 : Devoir à rendre demain ! ⏳`;

            const message = isAr
              ? `مادة ${hw.subject}: "${hw.title}" مستحق غداً (${hw.dueDate} على الساعة ${timeStr}). تأكد من إتمامه وتسليمه!`
              : isEn
                ? `${hw.subject}: "${hw.title}" due tomorrow at ${timeStr}. Wrap it up!`
                : `Matière ${hw.subject} : "${hw.title}" à rendre demain à ${timeStr}. Pensez à finaliser votre travail !`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'homework',
              title,
              message,
              tab: 'homework',
              itemId: hw.id,
              badge: isAr ? 'غداً (J-1)' : isEn ? 'Tomorrow (J-1)' : 'Demain (J-1)',
              urgency: 'soon',
              quiet,
              appData,
            });
          }
        }

        // C. Day-of Morning Opening Reminder (J-0)
        if (diffDays === 0) {
          const uniqueId = `hw_j0_${hw.id}_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `اليوم الموعد النهائي لتسليم الفرض! 🚨`
              : isEn
                ? `Today: Homework Due Today! 🚨`
                : `Aujourd’hui : Échéance du devoir ! 🚨`;

            const message = isAr
              ? `مادة ${hw.subject}: "${hw.title}" مستحق اليوم على الساعة ${timeStr}.`
              : isEn
                ? `${hw.subject}: "${hw.title}" due today at ${timeStr}.`
                : `Matière ${hw.subject} : "${hw.title}" à rendre aujourd’hui à ${timeStr}.`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'homework',
              title,
              message,
              tab: 'homework',
              itemId: hw.id,
              badge: isAr ? 'اليوم' : isEn ? 'Today' : 'Aujourd’hui',
              urgency: 'imminent',
              quiet,
              appData,
            });
          }
        }

        // D. Imminent check within leadTime window (e.g. 30 min before dueTime)
        const targetDateTime = new Date(`${hw.dueDate}T${timeStr}:00`).getTime();
        if (!isNaN(targetDateTime)) {
          const diffMs = targetDateTime - nowTime;
          if (diffMs <= leadTimeMs && diffMs >= -7200000) {
            const uniqueId = `hw_imminent_${hw.id}_${hw.dueDate}_${timeStr}`;
            if (!this.notifiedIds.has(uniqueId)) {
              this.notifiedIds.add(uniqueId);
              newRemindersTriggered = true;

              const title = isAr
                ? `موعد تسليم الفرض اقترب جداً: ${hw.title}`
                : isEn
                  ? `Homework Deadline Approaching: ${hw.title}`
                  : `Échéance imminente : ${hw.title}`;

              const message = isAr
                ? `مادة ${hw.subject} • الموعد النهائي اليوم على الساعة ${timeStr}`
                : isEn
                  ? `${hw.subject} • Due today at ${timeStr}`
                  : `${hw.subject} • Date limite aujourd’hui à ${timeStr}`;

              await this.dispatchReminder({
                id: uniqueId,
                type: 'homework',
                title,
                message,
                tab: 'homework',
                itemId: hw.id,
                badge: isAr ? 'موعد وشيك' : isEn ? 'Due Soon' : 'Imminent',
                urgency: 'imminent',
                quiet,
                appData,
              });
            }
          }
        }
      }
    }

    // =========================================================================
    // 3. Quizzes & Exams (J-2 Advance, J-1 Tomorrow, Day-Of, and Imminent)
    // =========================================================================
    if (prefs.modules.quizzes !== false && appData.quizzes) {
      for (const quiz of appData.quizzes) {
        if (quiz.status === 'completed') continue;

        const diffDays = getCalendarDaysDiff(quiz.date);
        const timeStr = quiz.time || '08:00';
        const roomStr = quiz.room ? (isAr ? ` (قاعة ${quiz.room})` : ` (Salle ${quiz.room})`) : '';

        // A. Advance J-2 Reminder (2 days before exam)
        if (diffDays === 2 && (prefs.advanceDaysReminders ?? true)) {
          const uniqueId = `quiz_j2_${quiz.id}_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `تذكير استباقي: موعد اختبار بعد يومين 📝`
              : isEn
                ? `Exam Reminder: Quiz in 2 days 📝`
                : `Rappel J-2 : Examen / Contrôle dans 2 jours 📝`;

            const message = isAr
              ? `اختبار مادة ${quiz.subject}: "${quiz.title}" في تاريخ ${quiz.date} (${timeStr})${roomStr}. راجع ملخصاتك جيداً!`
              : isEn
                ? `${quiz.subject}: "${quiz.title}" on ${quiz.date} at ${timeStr}. Review your summaries!`
                : `Épreuve de ${quiz.subject} : "${quiz.title}" le ${quiz.date} à ${timeStr}${roomStr}. Révisez vos fiches !`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'quizzes',
              title,
              message,
              tab: 'quizzes',
              itemId: quiz.id,
              badge: 'J-2',
              urgency: 'soon',
              quiet,
              appData,
            });
          }
        }

        // B. Advance J-1 Reminder (Tomorrow / غداً)
        if (diffDays === 1 && (prefs.advanceDaysReminders ?? true)) {
          const uniqueId = `quiz_j1_${quiz.id}_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `تنبيه هام: موعد الاختبار غداً! 🎯`
              : isEn
                ? `Exam Tomorrow: Final preparations! 🎯`
                : `Examen Demain : Dernière ligne droite ! 🎯`;

            const message = isAr
              ? `اختبار مادة ${quiz.subject}: "${quiz.title}" غداً على الساعة ${timeStr}${roomStr}. جهّز أدواتك وخذ قسطاً من الراحة.`
              : isEn
                ? `${quiz.subject}: "${quiz.title}" tomorrow at ${timeStr}. Pack your materials and rest well!`
                : `Épreuve de ${quiz.subject} : "${quiz.title}" demain à ${timeStr}${roomStr}. Préparez vos affaires et dormez bien !`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'quizzes',
              title,
              message,
              tab: 'quizzes',
              itemId: quiz.id,
              badge: isAr ? 'غداً (J-1)' : isEn ? 'Tomorrow (J-1)' : 'Demain (J-1)',
              urgency: 'soon',
              quiet,
              appData,
            });
          }
        }

        // C. Day-of Morning Opening Reminder (J-0)
        if (diffDays === 0) {
          const uniqueId = `quiz_j0_${quiz.id}_${todayStr}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `اليوم موعد الاختبار! بالتوفيق والنجاح 🌟`
              : isEn
                ? `Exam Day: Best of luck today! 🌟`
                : `Jour J : Examen aujourd’hui ! Bonne chance 🌟`;

            const message = isAr
              ? `مادة ${quiz.subject}: "${quiz.title}" اليوم على الساعة ${timeStr}${roomStr}. ثق بنفسك وتوكل على الله!`
              : isEn
                ? `${quiz.subject}: "${quiz.title}" today at ${timeStr}. You got this!`
                : `Matière ${quiz.subject} : "${quiz.title}" aujourd’hui à ${timeStr}${roomStr}. Vous êtes prêt !`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'quizzes',
              title,
              message,
              tab: 'quizzes',
              itemId: quiz.id,
              badge: isAr ? 'اليوم' : isEn ? 'Exam Day' : 'Jour J',
              urgency: 'imminent',
              quiet,
              appData,
            });
          }
        }

        // D. Imminent check within leadTime window (e.g. 30 min before quiz starts)
        const targetDateTime = new Date(`${quiz.date}T${timeStr}:00`).getTime();
        if (!isNaN(targetDateTime)) {
          const diffMs = targetDateTime - nowTime;
          if (diffMs <= leadTimeMs && diffMs >= -7200000) {
            const uniqueId = `quiz_imminent_${quiz.id}_${quiz.date}_${timeStr}`;
            if (!this.notifiedIds.has(uniqueId)) {
              this.notifiedIds.add(uniqueId);
              newRemindersTriggered = true;

              const title = isAr
                ? `موعد اختبار وشيك: ${quiz.title}`
                : isEn
                  ? `Upcoming Quiz / Exam: ${quiz.title}`
                  : `Épreuve imminente : ${quiz.title}`;

              const message = isAr
                ? `مادة ${quiz.subject} • على الساعة ${timeStr}${roomStr}`
                : isEn
                  ? `${quiz.subject} • At ${timeStr}${roomStr}`
                  : `${quiz.subject} • À ${timeStr}${roomStr}`;

              await this.dispatchReminder({
                id: uniqueId,
                type: 'quizzes',
                title,
                message,
                tab: 'quizzes',
                itemId: quiz.id,
                badge: isAr ? 'وشيك' : isEn ? 'Imminent' : 'Imminent',
                urgency: 'imminent',
                quiet,
                appData,
              });
            }
          }
        }
      }
    }

    // =========================================================================
    // 4. Tasks Reminders
    // =========================================================================
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

            const title = isAr
              ? `تذكير بمهمة: ${task.title}`
              : isEn
                ? `Task Reminder: ${task.title}`
                : `Rappel de tâche : ${task.title}`;

            const message = isAr
              ? `المادة: ${task.subject} • موعد الإنجاز: ${task.dueDate} (${timeStr})`
              : isEn
                ? `Subject: ${task.subject} • Due: ${task.dueDate} at ${timeStr}`
                : `Matière : ${task.subject} • Échéance : ${task.dueDate} à ${timeStr}`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'tasks',
              title,
              message,
              tab: 'tasks',
              itemId: task.id,
              badge: isAr ? 'مهمة' : isEn ? 'Task' : 'Tâche',
              urgency: 'soon',
              quiet,
              appData,
            });
          }
        }
      }
    }

    // =========================================================================
    // 5. Spaced Repetition Lessons (J+1, J+3, J+7, J+14, J+30)
    // =========================================================================
    if (prefs.modules.lessons !== false && appData.lessons) {
      for (const lesson of appData.lessons) {
        if (lesson.isMemorized) continue;

        if (lesson.nextReviewDate && lesson.nextReviewDate <= todayStr) {
          const uniqueId = `lesson_${lesson.id}_${lesson.nextReviewDate}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `حان موعد المراجعة التكرارية (J+${lesson.stage})`
              : isEn
                ? `Spaced Repetition Review Due (J+${lesson.stage})`
                : `Session de Révision J+${lesson.stage} requise`;

            const message = isAr
              ? `درس: ${lesson.title} (${lesson.subject}) • نسبة التمكن: ${lesson.masteryLevel || 0}%`
              : isEn
                ? `Lesson: ${lesson.title} (${lesson.subject}) • Mastery: ${lesson.masteryLevel || 0}%`
                : `Leçon : ${lesson.title} (${lesson.subject}) • Maîtrise : ${lesson.masteryLevel || 0}%`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'lessons',
              title,
              message,
              tab: 'revision',
              itemId: lesson.id,
              badge: `J+${lesson.stage}`,
              urgency: 'soon',
              quiet,
              appData,
            });
          }
        }
      }
    }

    // =========================================================================
    // 6. Goals Target Reminders
    // =========================================================================
    if (prefs.modules.goals !== false && appData.goals) {
      for (const goal of appData.goals) {
        if (goal.done) continue;

        if (goal.targetDate && goal.targetDate <= todayStr) {
          const uniqueId = `goal_${goal.id}_${goal.targetDate}`;
          if (!this.notifiedIds.has(uniqueId)) {
            this.notifiedIds.add(uniqueId);
            newRemindersTriggered = true;

            const title = isAr
              ? `تذكير بالهدف الدراسي`
              : isEn
                ? `Study Goal Target Date`
                : `Objectif d’étude à atteindre`;

            const message = isAr
              ? `الهدف: ${goal.title} • التاريخ المستهدف: ${goal.targetDate}`
              : isEn
                ? `Goal: ${goal.title} • Target date: ${goal.targetDate}`
                : `Objectif : ${goal.title} • Date visée : ${goal.targetDate}`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'goals',
              title,
              message,
              tab: 'goals',
              itemId: goal.id,
              badge: isAr ? 'هدف' : isEn ? 'Goal' : 'Objectif',
              urgency: 'normal',
              quiet,
              appData,
            });
          }
        }
      }
    }

    // =========================================================================
    // 7. Daily Habit Streak Reminder
    // =========================================================================
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
            const title = isAr
              ? `حافظ على شعلة عاداتك اليومية 🔥`
              : isEn
                ? `Protect Your Daily Habit Streak 🔥`
                : `Protège ta flamme d’habitudes 🔥`;

            const message = isAr
              ? `لديك ${count} عادة لم تُكملها اليوم بعد. اضغط هنا لتسجيل إنجازك!`
              : isEn
                ? `You have ${count} habit(s) pending for today. Tap to check them in!`
                : `Tu as ${count} habitude(s) non validée(s) aujourd’hui. Valide-les pour garder ton streak !`;

            await this.dispatchReminder({
              id: uniqueId,
              type: 'habits',
              title,
              message,
              tab: 'habits',
              badge: 'Streak 🔥',
              urgency: 'soon',
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
   * Resolve active Service Worker registration (for native Windows desktop toast support).
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
   * 1. In-App Notification Center history list (bell dropdown)
   * 2. On-Screen Floating HUD Banner (visible directly on desktop/browser screen!)
   * 3. Audio Chime (if sound enabled and not in quiet hours)
   * 4. Windows Desktop / Browser Native Notification (if permitted)
   */
  private async dispatchReminder(params: {
    id: string;
    type: InAppNotification['type'];
    title: string;
    message: string;
    tab: MainTabType;
    itemId?: string;
    badge?: string;
    urgency?: 'normal' | 'soon' | 'imminent';
    quiet: boolean;
    appData: FullAppData;
  }): Promise<void> {
    const { id, type, title, message, tab, itemId, badge, urgency, quiet, appData } = params;

    // 1. Add to In-App Notification Center history list (retaining latest 50 items)
    const newInAppItem: InAppNotification = {
      id,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      tab,
      itemId,
      read: false,
      badge,
      urgency,
    };

    this.inAppNotifications = [
      newInAppItem,
      ...this.inAppNotifications.filter((n) => n.id !== id),
    ].slice(0, 50);
    this.notifyListeners();

    // 2. Dispatch On-Screen Floating HUD Banner (Dynamic Island style)
    if (!quiet) {
      this.triggerHUD(newInAppItem);
    }

    // 3. Play gentle audio chime (if allowed and not in quiet hours)
    if (!quiet && appData.settings.chimeSoundEnabled) {
      try {
        chimePlayer.playChime('notification');
      } catch (err) {
        console.warn('Notification chime failed:', err);
      }
    }

    // 4. Dispatch Windows Desktop / Browser System notification (if not in quiet hours and permission granted)
    if (!quiet && this.isSupported() && Notification.permission === 'granted') {
      const iconUrl = `${import.meta.env.BASE_URL}original_icon_512.png`;
      const notificationData = {
        tab,
        itemId,
        url: `/?tab=${tab}${itemId ? `&id=${encodeURIComponent(itemId)}` : ''}`,
      };

      const isHighPriority = type === 'quizzes' || type === 'homework' || type === 'timeblocking';
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
   * Trigger a manual test notification to verify on-screen HUD, audio chime, and OS integration.
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
    const isAr = lang === 'ar';
    const isEn = lang === 'en';

    const title = isAr
      ? 'نظام الإشعارات الذكي نشط 🔔'
      : isEn
        ? 'Smart Notification Engine Active 🔔'
        : 'Système de Notifications Actif 🔔';

    const message = isAr
      ? 'ستصلك تنبيهات الجلسات قبل 10 و 5 دقائق، وتنبيهات الفروض والاختبارات قبل يومين ويوم واحد!'
      : isEn
        ? 'Alerts will trigger 10m & 5m before study sessions, and 2 days & 1 day before homework and exams!'
        : 'Alertes déclenchées 10 min et 5 min avant vos sessions, et 2 jours et 1 jour avant vos devoirs et examens !';

    const testId = `test_${Date.now()}`;
    await this.dispatchReminder({
      id: testId,
      type: 'timeblocking',
      title,
      message,
      tab: 'settings',
      badge: isAr ? 'تجربة' : isEn ? 'Test' : 'Test',
      urgency: 'imminent',
      quiet: false,
      appData,
    });

    return true;
  }
}

export const notificationService = new NotificationService();
