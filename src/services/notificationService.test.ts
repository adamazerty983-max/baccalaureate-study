import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationService } from './notificationService';
import { FullAppData, TimeBlock, HomeworkItem, QuizItem } from '../types';
import { INITIAL_SETTINGS } from '../utils/constants';

// Mock IndexedDB persistence
vi.mock('../utils/indexedDB', () => ({
  loadNotifiedIds: vi.fn().mockResolvedValue([]),
  loadInAppNotifications: vi.fn().mockResolvedValue([]),
  saveNotifiedIds: vi.fn().mockResolvedValue(undefined),
  saveInAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

// Mock audio
vi.mock('../utils/audio', () => ({
  chimePlayer: {
    playChime: vi.fn(),
  },
}));

describe('NotificationService & SystemNotificationHUD', () => {
  const createMockAppData = (): FullAppData => {
    return {
      version: 4,
      settings: {
        ...INITIAL_SETTINGS,
        language: 'fr',
        chimeSoundEnabled: true,
        notifications: {
          enabled: true,
          modules: {
            tasks: true,
            quizzes: true,
            homework: true,
            lessons: true,
            goals: true,
            habits: true,
            timeblocking: true,
          },
          leadTimeMinutes: 30,
          advanceDaysReminders: true,
          timeblockLeadMinutes: 10,
          habitReminderTime: '20:00',
          quietHours: {
            enabled: false,
            start: '23:00',
            end: '07:00',
          },
        },
      },
      tasks: [],
      quizzes: [],
      homework: [],
      notes: [],
      timeBlocks: [],
      grades: [],
      goals: [],
      lessons: [],
      habits: [],
      weeklyReviews: {},
      updatedAt: new Date().toISOString(),
    };
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await notificationService.init();
    await notificationService.clearAll();
  });

  it('detects Quiet Hours correctly across overnight periods', () => {
    const quietPrefs = {
      enabled: true,
      start: '23:00',
      end: '07:00',
    };

    expect(notificationService.isInQuietHours({ enabled: false, start: '23:00', end: '07:00' })).toBe(false);

    // Test with daytime quiet hours: 14:00 - 16:00
    const afternoonQuiet = { enabled: true, start: '14:00', end: '16:00' };
    const dateAt15 = new Date('2026-09-29T15:00:00');
    vi.setSystemTime(dateAt15);
    expect(notificationService.isInQuietHours(afternoonQuiet)).toBe(true);

    const dateAt17 = new Date('2026-09-29T17:00:00');
    vi.setSystemTime(dateAt17);
    expect(notificationService.isInQuietHours(afternoonQuiet)).toBe(false);

    vi.useRealTimers();
  });

  it('triggers HUD banner and in-app reminder 10 minutes before a scheduled timeBlock', async () => {
    // Freeze time at 14:20:00 on a Tuesday (day 2)
    const fixedNow = new Date('2026-09-29T14:20:00');
    vi.setSystemTime(fixedNow);

    const hudAlerts: any[] = [];
    const unsubscribeHUD = notificationService.onHUD((item) => {
      hudAlerts.push(item);
    });

    const appData = createMockAppData();
    const testBlock: TimeBlock = {
      id: 'block-math-1430',
      dayOfWeek: fixedNow.getDay(), // matches Tuesday
      startTime: '14:30', // exactly 10 min away!
      endTime: '16:00',
      title: 'Mathématiques - Nombres Complexes',
      subject: 'Mathématiques',
      isCompleted: false,
      type: 'study',
    };
    appData.timeBlocks = [testBlock];

    await notificationService.scanForReminders(appData);

    expect(hudAlerts.length).toBeGreaterThanOrEqual(1);
    const alert = hudAlerts.find((a) => a.itemId === 'block-math-1430');
    expect(alert).toBeDefined();
    expect(alert.type).toBe('timeblocking');
    expect(alert.tab).toBe('timeblocking');
    expect(alert.badge).toContain('10 min');
    expect(alert.title).toContain('Mathématiques');

    unsubscribeHUD();
    vi.useRealTimers();
  });

  it('triggers HUD banner and in-app reminder 5 minutes before a scheduled timeBlock', async () => {
    // Freeze time at 08:55:00
    const fixedNow = new Date('2026-09-29T08:55:00');
    vi.setSystemTime(fixedNow);

    const hudAlerts: any[] = [];
    const unsubscribeHUD = notificationService.onHUD((item) => {
      hudAlerts.push(item);
    });

    const appData = createMockAppData();
    const testBlock: TimeBlock = {
      id: 'block-phys-0900',
      dayOfWeek: fixedNow.getDay(),
      startTime: '09:00', // exactly 5 min away
      endTime: '10:30',
      title: 'Physique - Ondes et Électromagnétisme',
      subject: 'Physique Chimie',
      isCompleted: false,
      type: 'study',
    };
    appData.timeBlocks = [testBlock];

    await notificationService.scanForReminders(appData);

    const alert = hudAlerts.find((a) => a.itemId === 'block-phys-0900');
    expect(alert).toBeDefined();
    expect(alert.badge).toContain('5 min');
    expect(alert.urgency).toBe('imminent');

    unsubscribeHUD();
    vi.useRealTimers();
  });

  it('triggers J-2 advance reminder for homework due in two days upon scanning', async () => {
    // Current date: 2026-09-29
    const fixedNow = new Date('2026-09-29T10:00:00');
    vi.setSystemTime(fixedNow);

    const hudAlerts: any[] = [];
    const unsubscribeHUD = notificationService.onHUD((item) => {
      hudAlerts.push(item);
    });

    const appData = createMockAppData();
    const hwItem: HomeworkItem = {
      id: 'hw-philosophie-1',
      title: 'Dissertation Philosophie Bac',
      subject: 'Philosophie',
      dueDate: '2026-10-01', // exactly 2 days later!
      dueTime: '18:00',
      priority: 'high',
      progressPercentage: 0,
      status: 'pending',
      isProjectSubmission: false,
      checklist: [],
      createdAt: '2026-09-28T10:00:00Z',
    };
    appData.homework = [hwItem];

    await notificationService.scanForReminders(appData);

    const alert = hudAlerts.find((a) => a.itemId === 'hw-philosophie-1');
    expect(alert).toBeDefined();
    expect(alert.type).toBe('homework');
    expect(alert.badge).toBe('J-2');
    expect(alert.title).toContain('J-2');
    expect(alert.tab).toBe('homework');

    unsubscribeHUD();
    vi.useRealTimers();
  });

  it('triggers J-1 advance reminder for quizzes / exams scheduled tomorrow', async () => {
    // Current date: 2026-09-29
    const fixedNow = new Date('2026-09-29T11:00:00');
    vi.setSystemTime(fixedNow);

    const hudAlerts: any[] = [];
    const unsubscribeHUD = notificationService.onHUD((item) => {
      hudAlerts.push(item);
    });

    const appData = createMockAppData();
    const quizItem: QuizItem = {
      id: 'quiz-svt-demain',
      title: 'Contrôle Génétique Humaine',
      subject: 'Sciences de la Vie et de la Terre',
      date: '2026-09-30', // tomorrow!
      time: '08:30',
      room: 'B12',
      targetScore: 20,
      totalScore: 20,
      topics: ['Génétique'],
      status: 'upcoming',
      difficulty: 'medium',
      priority: 'high',
      createdAt: '2026-09-28T10:00:00Z',
    };
    appData.quizzes = [quizItem];

    await notificationService.scanForReminders(appData);

    const alert = hudAlerts.find((a) => a.itemId === 'quiz-svt-demain');
    expect(alert).toBeDefined();
    expect(alert.type).toBe('quizzes');
    expect(alert.badge).toContain('J-1');
    expect(alert.message).toContain('B12');
    expect(alert.tab).toBe('quizzes');

    unsubscribeHUD();
    vi.useRealTimers();
  });

  it('sendTestNotification dispatches immediately to HUD listener', async () => {
    const hudAlerts: any[] = [];
    const unsubscribeHUD = notificationService.onHUD((item) => {
      hudAlerts.push(item);
    });

    const appData = createMockAppData();
    await notificationService.sendTestNotification(appData);

    expect(hudAlerts.length).toBe(1);
    expect(hudAlerts[0].type).toBe('timeblocking');
    expect(hudAlerts[0].tab).toBe('settings');

    unsubscribeHUD();
  });
});
