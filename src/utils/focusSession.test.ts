import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBlockTimestamps,
  isBlockActiveNow,
  calculateFocusProgress,
  saveActiveFocusSession,
  loadActiveFocusSession,
  clearActiveFocusSession,
  saveBlockPauseState,
  loadBlockPauseState,
  clearBlockPauseState,
  StoredFocusSession,
} from './focusSession';
import { TimeBlock } from '../types';

// Mock localStorage in Node/Vitest test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = String(value);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
  },
};
(globalThis as any).localStorage = localStorageMock;

describe('Focus Session Real-Time Calculation & Persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('calculateFocusProgress', () => {
    it('calculates exact remaining time when starting (0s elapsed)', () => {
      const start = 1000000;
      const duration = 3600; // 60 minutes
      const result = calculateFocusProgress(start, duration, { nowMs: start });

      expect(result.elapsedSeconds).toBe(0);
      expect(result.remainingSeconds).toBe(3600);
      expect(result.progress).toBe(1);
      expect(result.isCompleted).toBe(false);
    });

    it('calculates exact remaining time when 30 minutes have elapsed', () => {
      const start = 1000000;
      const duration = 3600; // 60 minutes
      const now = start + 30 * 60 * 1000; // 30 minutes later

      const result = calculateFocusProgress(start, duration, { nowMs: now });

      expect(result.elapsedSeconds).toBe(1800);
      expect(result.remainingSeconds).toBe(1800); // 30m remaining
      expect(result.progress).toBe(0.5);
      expect(result.isCompleted).toBe(false);
    });

    it('does not reset timer after user leaves and returns 45 minutes later', () => {
      const start = 1000000;
      const duration = 3600;

      // First check at 10 minutes
      const firstCheck = calculateFocusProgress(start, duration, { nowMs: start + 10 * 60 * 1000 });
      expect(firstCheck.remainingSeconds).toBe(3000); // 50m remaining

      // User returns at 45 minutes
      const secondCheck = calculateFocusProgress(start, duration, { nowMs: start + 45 * 60 * 1000 });
      expect(secondCheck.remainingSeconds).toBe(900); // 15m remaining, NOT 3600s or 3000s!
      expect(secondCheck.elapsedSeconds).toBe(2700);
    });

    it('marks completed when elapsed time exceeds duration', () => {
      const start = 1000000;
      const duration = 1500; // 25 minutes
      const now = start + 30 * 60 * 1000; // 30 minutes later

      const result = calculateFocusProgress(start, duration, { nowMs: now });
      expect(result.remainingSeconds).toBe(0);
      expect(result.isCompleted).toBe(true);
      expect(result.progress).toBe(0);
    });

    it('freezes timer correctly when paused', () => {
      const start = 1000000;
      const duration = 3600;
      const pausedAt = start + 10 * 60 * 1000; // Paused after 10m
      const nowWhilePaused = pausedAt + 20 * 60 * 1000; // 20m passed in real life while paused

      const result = calculateFocusProgress(start, duration, {
        nowMs: nowWhilePaused,
        isPaused: true,
        pausedAt: pausedAt,
        totalPausedMs: 0,
      });

      // Because it's paused at 10m, remaining time stays at 50m (3000s), NOT 30m
      expect(result.elapsedSeconds).toBe(600);
      expect(result.remainingSeconds).toBe(3000);
    });

    it('resumes correctly with accumulated paused time', () => {
      const start = 1000000;
      const duration = 3600;
      const totalPausedMs = 15 * 60 * 1000; // Was paused for 15m
      const now = start + 45 * 60 * 1000; // 45m passed in total (15m paused, 30m studied)

      const result = calculateFocusProgress(start, duration, {
        nowMs: now,
        isPaused: false,
        pausedAt: null,
        totalPausedMs: totalPausedMs,
      });

      expect(result.elapsedSeconds).toBe(1800); // 30m studied
      expect(result.remainingSeconds).toBe(1800); // 30m remaining
    });
  });

  describe('getBlockTimestamps', () => {
    it('calculates start and end timestamps for a 05:00 - 06:00 block', () => {
      const refDate = new Date('2026-09-27T00:00:00Z');
      const block: TimeBlock = {
        id: 'tb-1',
        title: 'Math',
        subject: 'Mathématiques',
        startTime: '05:00',
        endTime: '06:00',
        dayOfWeek: 0,
        isCompleted: false,
        type: 'study',
      };

      const { startMs, endMs, durationSeconds } = getBlockTimestamps(block, refDate);
      expect(durationSeconds).toBe(3600);
      expect(endMs - startMs).toBe(3600 * 1000);
    });
  });

  describe('isBlockActiveNow', () => {
    it('returns true when current time is within block hours today', () => {
      const now = new Date('2026-09-27T05:30:00'); // 05:30 on Sunday (day 0)
      const block: TimeBlock = {
        id: 'tb-1',
        title: 'Math',
        subject: 'Mathématiques',
        startTime: '05:00',
        endTime: '06:00',
        dayOfWeek: 0,
        isCompleted: false,
        type: 'study',
      };

      expect(isBlockActiveNow(block, now)).toBe(true);
    });

    it('returns false when block is completed', () => {
      const now = new Date('2026-09-27T05:30:00');
      const block: TimeBlock = {
        id: 'tb-1',
        title: 'Math',
        subject: 'Mathématiques',
        startTime: '05:00',
        endTime: '06:00',
        dayOfWeek: 0,
        isCompleted: true, // Completed!
        type: 'study',
      };

      expect(isBlockActiveNow(block, now)).toBe(false);
    });

    it('returns false when day of week does not match', () => {
      const now = new Date('2026-09-27T05:30:00'); // Sunday (day 0)
      const block: TimeBlock = {
        id: 'tb-1',
        title: 'Math',
        subject: 'Mathématiques',
        startTime: '05:00',
        endTime: '06:00',
        dayOfWeek: 1, // Monday (day 1)
        isCompleted: false,
        type: 'study',
      };

      expect(isBlockActiveNow(block, now)).toBe(false);
    });

    it('returns false when current time is past block endTime', () => {
      const now = new Date('2026-09-27T06:15:00'); // 06:15 (after 06:00)
      const block: TimeBlock = {
        id: 'tb-1',
        title: 'Math',
        subject: 'Mathématiques',
        startTime: '05:00',
        endTime: '06:00',
        dayOfWeek: 0,
        isCompleted: false,
        type: 'study',
      };

      expect(isBlockActiveNow(block, now)).toBe(false);
    });
  });

  describe('Session Persistence in localStorage', () => {
    it('persists and loads active focus session correctly', () => {
      const session: StoredFocusSession = {
        id: 'custom-123',
        title: 'Deep Work',
        subject: 'Physique-Chimie',
        startTimestamp: 1727430000000,
        durationSeconds: 1500,
        endTimestamp: 1727431500000,
        isPaused: false,
        pausedAt: null,
        totalPausedMs: 0,
      };

      saveActiveFocusSession(session);
      const loaded = loadActiveFocusSession();

      expect(loaded).toEqual(session);

      clearActiveFocusSession();
      expect(loadActiveFocusSession()).toBeNull();
    });

    it('persists and loads pause state for scheduled blocks', () => {
      saveBlockPauseState('tb-99', {
        isPaused: true,
        pausedAt: 1727430500000,
        totalPausedMs: 60000,
      });

      const loaded = loadBlockPauseState('tb-99');
      expect(loaded?.isPaused).toBe(true);
      expect(loaded?.totalPausedMs).toBe(60000);

      clearBlockPauseState('tb-99');
      expect(loadBlockPauseState('tb-99')).toBeNull();
    });
  });
});
