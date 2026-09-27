/**
 * Enhanced Notification Service with Web Push Integration
 *
 * This service now integrates Web Push for true background notifications
 * that work even when the app is fully closed.
 */

import { webPushService } from './webPushService';
import type { FullAppData, TimeBlock, TaskItem } from '../types';

/**
 * Hook into existing notification triggers to schedule Web Push notifications
 */
export async function scheduleWebPushForTask(
  task: TaskItem,
  userId: string,
  language: string
): Promise<void> {
  if (!webPushService.isSubscribed()) {
    return;
  }

  const dateStr = task.reminderDate || task.dueDate;
  if (!dateStr) return;

  const timeStr = task.dueTime || '18:00';
  const targetDateTime = new Date(`${task.dueDate || dateStr}T${timeStr}:00`);

  if (isNaN(targetDateTime.getTime())) return;

  const notificationId = `task_${task.id}_${task.dueDate}_${timeStr}_webpush`;

  const title =
    language === 'ar'
      ? `تذكير بمهمة: ${task.title}`
      : language === 'en'
        ? `Task Reminder: ${task.title}`
        : `Rappel de tâche : ${task.title}`;

  const body =
    language === 'ar'
      ? `المادة: ${task.subject} • موعد الإنجاز: ${task.dueDate} (${timeStr})`
      : language === 'en'
        ? `Subject: ${task.subject} • Due: ${task.dueDate} at ${timeStr}`
        : `Matière : ${task.subject} • Échéance : ${task.dueDate} à ${timeStr}`;

  await webPushService.scheduleNotification(notificationId, targetDateTime, {
    title,
    body,
    icon: '/original_icon_512.png',
    data: {
      tab: 'tasks',
      itemId: task.id,
    },
    requireInteraction: true,
  });

  console.log(`📅 Scheduled Web Push for task: ${task.title} at ${targetDateTime.toISOString()}`);
}

/**
 * Schedule Web Push for Focus Mode session end
 */
export async function scheduleWebPushForFocusSession(
  block: TimeBlock,
  endTime: Date,
  userId: string,
  language: string
): Promise<void> {
  if (!webPushService.isSubscribed()) {
    return;
  }

  const notificationId = `focus_${block.id}_${endTime.getTime()}_webpush`;

  const title =
    language === 'ar'
      ? `✅ انتهت جلسة التركيز!`
      : language === 'en'
        ? `✅ Focus Session Complete!`
        : `✅ Session de concentration terminée !`;

  const durationMins = Math.round(
    (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000
  );

  const body =
    language === 'ar'
      ? `أحسنت! لقد أكملت ${durationMins} دقيقة من ${block.subject}. خذ استراحة!`
      : language === 'en'
        ? `Great job! You completed ${durationMins} minutes of ${block.subject}. Take a break!`
        : `Bravo ! Tu as complété ${durationMins} minutes de ${block.subject}. Fais une pause !`;

  await webPushService.scheduleNotification(notificationId, endTime, {
    title,
    body,
    icon: '/original_icon_512.png',
    data: {
      tab: 'timeblocking',
      itemId: block.id,
    },
    requireInteraction: false,
  });

  console.log(`⏰ Scheduled Web Push for Focus end at ${endTime.toISOString()}`);
}

/**
 * Schedule Web Push for time block start (5 minutes before)
 */
export async function scheduleWebPushForBlockStart(
  block: TimeBlock,
  userId: string,
  language: string
): Promise<void> {
  if (!webPushService.isSubscribed()) {
    return;
  }

  const [startHour, startMin] = block.startTime.split(':').map(Number);
  const today = new Date();
  const startDateTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    startHour,
    startMin,
    0
  );

  // Schedule 5 minutes before
  const notifyTime = new Date(startDateTime.getTime() - 5 * 60 * 1000);

  if (notifyTime.getTime() < Date.now()) {
    return; // Already passed
  }

  const notificationId = `block_start_${block.id}_${startDateTime.getTime()}_webpush`;

  const title =
    language === 'ar'
      ? `⏰ بدء جلسة خلال 5 دقائق`
      : language === 'en'
        ? `⏰ Session starting in 5 minutes`
        : `⏰ Session dans 5 minutes`;

  const body =
    language === 'ar'
      ? `${block.title} (${block.subject}) • ${block.startTime} - ${block.endTime}`
      : language === 'en'
        ? `${block.title} (${block.subject}) • ${block.startTime} - ${block.endTime}`
        : `${block.title} (${block.subject}) • ${block.startTime} - ${block.endTime}`;

  await webPushService.scheduleNotification(notificationId, notifyTime, {
    title,
    body,
    icon: '/original_icon_512.png',
    data: {
      tab: 'timeblocking',
      itemId: block.id,
    },
    requireInteraction: false,
  });

  console.log(`🔔 Scheduled Web Push for block start: ${block.title} at ${notifyTime.toISOString()}`);
}

/**
 * Cancel Web Push for a task
 */
export async function cancelWebPushForTask(task: TaskItem): Promise<void> {
  const dateStr = task.reminderDate || task.dueDate;
  if (!dateStr) return;

  const timeStr = task.dueTime || '18:00';
  const notificationId = `task_${task.id}_${task.dueDate}_${timeStr}_webpush`;

  await webPushService.cancelScheduledNotification(notificationId);
  console.log(`🚫 Cancelled Web Push for task: ${task.title}`);
}

/**
 * Cancel Web Push for a time block
 */
export async function cancelWebPushForBlock(block: TimeBlock): Promise<void> {
  const [startHour, startMin] = block.startTime.split(':').map(Number);
  const today = new Date();
  const startDateTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    startHour,
    startMin,
    0
  );

  const notificationId = `block_start_${block.id}_${startDateTime.getTime()}_webpush`;
  await webPushService.cancelScheduledNotification(notificationId);
  console.log(`🚫 Cancelled Web Push for block: ${block.title}`);
}

/**
 * Initialize Web Push for a user
 */
export async function initializeWebPush(userId: string): Promise<void> {
  await webPushService.init(userId);
  console.log(`🔔 Web Push initialized for user: ${userId}`);
}

/**
 * Schedule all pending notifications from app data
 */
export async function syncWebPushNotifications(
  appData: FullAppData,
  userId: string
): Promise<void> {
  if (!webPushService.isSubscribed()) {
    console.log('⚠️  Web Push not subscribed, skipping sync');
    return;
  }

  const language = appData.settings.language || 'fr';
  const now = Date.now();

  // Schedule tasks
  if (appData.tasks) {
    for (const task of appData.tasks) {
      if (task.status !== 'completed' && task.dueDate) {
        const taskTime = new Date(`${task.dueDate}T${task.dueTime || '18:00'}:00`).getTime();
        if (taskTime > now) {
          await scheduleWebPushForTask(task, userId, language);
        }
      }
    }
  }

  // Schedule time blocks (today's blocks only)
  if (appData.timeBlocks) {
    const today = new Date();
    const currentDayOfWeek = today.getDay();

    for (const block of appData.timeBlocks) {
      if (block.dayOfWeek === currentDayOfWeek) {
        await scheduleWebPushForBlockStart(block, userId, language);
      }
    }
  }

  console.log('✅ Web Push notifications synced');
}
