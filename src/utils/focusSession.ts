import { TimeBlock } from '../types';

export const FOCUS_SESSION_STORAGE_KEY = 'bac_focus_mode_active_session';
export const FOCUS_PAUSE_STORAGE_PREFIX = 'bac_focus_pause_';

export interface StoredFocusSession {
  id: string;
  blockId?: string;
  title: string;
  subject: string;
  startTimestamp: number; // Unix epoch ms
  durationSeconds: number; // Total planned duration in seconds
  endTimestamp: number; // startTimestamp + durationSeconds * 1000
  isPaused: boolean;
  pausedAt?: number | null; // Unix epoch ms when paused
  totalPausedMs: number; // Accumulated paused milliseconds
}

export interface FocusPauseState {
  isPaused: boolean;
  pausedAt: number | null;
  totalPausedMs: number;
}

/**
 * Calculates real start and end timestamps for a scheduled TimeBlock for a reference date (defaults to today).
 */
export function getBlockTimestamps(block: TimeBlock, referenceDate = new Date()): {
  startMs: number;
  endMs: number;
  durationSeconds: number;
} {
  const [sh, sm] = (block.startTime || '00:00').split(':').map(Number);
  const [eh, em] = (block.endTime || '01:00').split(':').map(Number);

  const startMs = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    sh || 0,
    sm || 0,
    0,
    0
  ).getTime();

  let endMs = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    eh || 0,
    em || 0,
    0,
    0
  ).getTime();

  // If endTime <= startTime (e.g., spanning past midnight), advance endMs by 1 day
  if (endMs <= startMs) {
    endMs += 24 * 60 * 60 * 1000;
  }

  const durationSeconds = Math.max(60, Math.round((endMs - startMs) / 1000));
  return { startMs, endMs, durationSeconds };
}

/**
 * Checks if a scheduled TimeBlock is currently active right now.
 * Validates:
 * 1. Not completed.
 * 2. Matches today's date or today's day of week.
 * 3. Current time is within [startMins, endMins).
 */
export function isBlockActiveNow(block: TimeBlock, now = new Date()): boolean {
  if (block.isCompleted) return false;

  const todayDateKey = now.toISOString().slice(0, 10);
  const currentDay = now.getDay();
  const matchesDate = block.dateKey ? block.dateKey === todayDateKey : block.dayOfWeek === currentDay;
  if (!matchesDate) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = (block.startTime || '00:00').split(':').map(Number);
  const [eh, em] = (block.endTime || '00:00').split(':').map(Number);
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;

  if (endMins <= startMins) {
    endMins += 24 * 60;
  }

  return currentMins >= startMins && currentMins < endMins;
}

/**
 * Calculates elapsed and remaining time based on true elapsed timestamps:
 * remaining = duration - (now - startTimestamp - totalPausedMs)
 */
export function calculateFocusProgress(
  startTimestamp: number,
  durationSeconds: number,
  options?: {
    nowMs?: number;
    isPaused?: boolean;
    pausedAt?: number | null;
    totalPausedMs?: number;
  }
): {
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number; // 0 to 1 ratio remaining
  isCompleted: boolean;
} {
  const now = options?.nowMs ?? Date.now();
  const totalPausedMs = options?.totalPausedMs ?? 0;
  const isPaused = options?.isPaused ?? false;
  const pausedAt = options?.pausedAt ?? null;

  let effectiveNow = now;
  if (isPaused && pausedAt) {
    // When paused, freeze the elapsed calculation at the moment of pause
    effectiveNow = pausedAt;
  }

  const elapsedMs = Math.max(0, effectiveNow - startTimestamp - totalPausedMs);
  const elapsedSeconds = Math.min(durationSeconds, Math.floor(elapsedMs / 1000));
  const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
  const progress = durationSeconds > 0 ? remainingSeconds / durationSeconds : 0;
  const isCompleted = remainingSeconds <= 0;

  return {
    elapsedSeconds,
    remainingSeconds,
    progress,
    isCompleted,
  };
}

/**
 * Persists an active custom focus session into localStorage.
 */
export function saveActiveFocusSession(session: StoredFocusSession): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(FOCUS_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Failed to save focus session:', err);
  }
}

/**
 * Loads an active custom focus session from localStorage.
 */
export function loadActiveFocusSession(): StoredFocusSession | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(FOCUS_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: StoredFocusSession = JSON.parse(raw);
    if (!session || !session.startTimestamp || !session.durationSeconds) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Clears the active custom focus session from localStorage.
 */
export function clearActiveFocusSession(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(FOCUS_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Saves pause state for a scheduled block.
 */
export function saveBlockPauseState(blockId: string, state: FocusPauseState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${FOCUS_PAUSE_STORAGE_PREFIX}${blockId}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/**
 * Loads pause state for a scheduled block.
 */
export function loadBlockPauseState(blockId: string): FocusPauseState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(`${FOCUS_PAUSE_STORAGE_PREFIX}${blockId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clears pause state for a scheduled block.
 */
export function clearBlockPauseState(blockId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`${FOCUS_PAUSE_STORAGE_PREFIX}${blockId}`);
  } catch {
    // ignore
  }
}
