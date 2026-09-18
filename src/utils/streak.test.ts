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
