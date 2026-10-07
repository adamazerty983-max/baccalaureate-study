import { describe, it, expect } from 'vitest';
import { shouldFreezeFlame } from './streak';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('shouldFreezeFlame — blue until today is validated', () => {
  it('freezes (blue) when today has no completed planner/task item', () => {
    expect(shouldFreezeFlame({ completedDates: new Set() })).toBe(true);
  });

  it('freezes even if yesterday was completed but today is still open', () => {
    expect(shouldFreezeFlame({ completedDates: new Set([daysAgo(1)]) })).toBe(true);
  });

  it('burns hot (red) once any item is completed today', () => {
    expect(shouldFreezeFlame({ completedDates: new Set([daysAgo(0)]) })).toBe(false);
  });

  it('burns hot when today and past days are completed', () => {
    expect(shouldFreezeFlame({ completedDates: new Set([daysAgo(0), daysAgo(1)]) })).toBe(false);
  });
});

describe('calculateAllStreakPeriods & syncAndGetPreservedStreaks', () => {
  it('correctly calculates continuous streak segments and identifies record streak', async () => {
    const { calculateAllStreakPeriods } = await import('./streak');
    const dates = new Set([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      // gap on 08-04
      '2026-08-05',
      '2026-08-06',
    ]);

    const periods = calculateAllStreakPeriods(dates);
    expect(periods).toHaveLength(2);

    const streak3 = periods.find((p) => p.length === 3);
    const streak2 = periods.find((p) => p.length === 2);

    expect(streak3).toBeDefined();
    expect(streak3?.startDate).toBe('2026-08-01');
    expect(streak3?.endDate).toBe('2026-08-03');
    expect(streak3?.isRecord).toBe(true);

    expect(streak2).toBeDefined();
    expect(streak2?.startDate).toBe('2026-08-05');
    expect(streak2?.endDate).toBe('2026-08-06');
    expect(streak2?.isRecord).toBeFalsy();
  });

  it('preserves historical streaks across syncs', async () => {
    const { syncAndGetPreservedStreaks } = await import('./streak');
    const dates = new Set(['2026-09-01', '2026-09-02', '2026-09-03']);

    const preserved = syncAndGetPreservedStreaks(dates);
    expect(preserved.length).toBeGreaterThanOrEqual(1);
    expect(preserved.some((p) => p.length === 3 && p.startDate === '2026-09-01')).toBe(true);
  });
});

