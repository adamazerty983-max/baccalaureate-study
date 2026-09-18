import { describe, it, expect } from 'vitest';
import { mergeAppData } from './merge';
import { TaskItem, TimeBlock, FullAppData } from '../types';

function block(p: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 'b1',
    dayOfWeek: 2,
    dateKey: '2026-09-09',
    startTime: '08:00',
    endTime: '09:00',
    title: 'Math',
    subject: 'Math',
    isCompleted: false,
    type: 'study',
    ...p,
  };
}

function task(p: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 't1',
    createdAt: '2026-09-09T10:00:00Z',
    title: 'Revision',
    subject: 'Physics',
    priority: 'high',
    status: 'todo',
    type: 'revision',
    dueDate: '2026-09-09',
    progressPercentage: 0,
    ...p,
  };
}

function appData(p: Partial<FullAppData> = {}): FullAppData {
  return {
    version: 4,
    settings: {} as FullAppData['settings'],
    tasks: [],
    quizzes: [],
    homework: [],
    notes: [],
    timeBlocks: [],
    grades: [],
    goals: [],
    lessons: [],
    habits: [],
    habitLogs: {},
    weeklyReviews: {},
    updatedAt: '2026-09-09T12:00:00.000Z',
    ...p,
  };
}

describe('mergeAppData — stale writer cannot erase completions (streak bug root fix)', () => {
  it('union-preserves a completion when a stale blob replaces a fresher local state', () => {
    // Local: user completed Français at 19:18 (fresher, streak lives)
    const local = appData({
      timeBlocks: [block({ id: 'b-fr', isCompleted: true, completedAt: '2026-09-09T19:18:03Z' })],
      updatedAt: '2026-09-09T19:18:05Z',
    });
    // Stale writer: snapshot taken BEFORE completion, re-stamped "now" by a save/echo path
    const stale = appData({
      timeBlocks: [block({ id: 'b-fr', isCompleted: false, completedAt: undefined })],
      updatedAt: '2026-09-09T19:19:00Z', // newer blob timestamp, older item state
    });

    const merged = mergeAppData(local, stale);
    const fr = merged.timeBlocks.find((b) => b.id === 'b-fr');
    expect(fr?.isCompleted).toBe(true);
    expect(fr?.completedAt).toBe('2026-09-09T19:18:03Z');
  });

  it('deliberate uncheck still wins when it is the newer item-level change', () => {
    const local = appData({
      timeBlocks: [block({ id: 'b1', isCompleted: false })], // unchecked at 20:00
      updatedAt: '2026-09-09T20:00:00Z',
    });
    const stale = appData({
      timeBlocks: [block({ id: 'b1', isCompleted: true, completedAt: '2026-09-09T19:18:03Z', updatedAt: '2026-09-09T19:18:03Z' })],
      updatedAt: '2026-09-09T19:30:00Z',
    });

    const merged = mergeAppData(local, local.timeBlocks[0] && stale);
    const b = merged.timeBlocks.find((x) => x.id === 'b1');
    expect(b?.isCompleted).toBe(false); // uncheck respected
  });

  it('items added by either side are union-kept (no lost tasks)', () => {
    const local = appData({ tasks: [task({ id: 'a' })], updatedAt: '2026-09-09T12:00:00Z' });
    const remote = appData({ tasks: [task({ id: 'b' })], updatedAt: '2026-09-09T12:05:00Z' });

    const merged = mergeAppData(local, remote);
    const ids = merged.tasks.map((t) => t.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('returns primary reference untouched when secondary is not newer and nothing conflicts', () => {
    const primary = appData({ updatedAt: '2026-09-09T12:00:00Z' });
    const secondary = appData({ updatedAt: '2026-09-09T11:00:00Z' });
    expect(mergeAppData(primary, secondary)).toBe(primary);
  });

  it('echo of identical content does not create a new state (breaks save→echo loop)', () => {
    const primary = appData({
      tasks: [task({ id: 'a' })],
      updatedAt: '2026-09-09T12:00:00Z',
    });
    const echo = appData({
      tasks: [task({ id: 'a' })],
      updatedAt: '2026-09-09T12:30:00Z', // cloud re-stamped, but content identical
    });
    expect(mergeAppData(primary, echo)).toBe(primary);
  });
});
