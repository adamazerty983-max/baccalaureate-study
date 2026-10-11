import { describe, expect, it } from 'vitest';
import { getCalendarWeeksForMonth } from './calendarWeeks';

describe('getCalendarWeeksForMonth', () => {
  it('uses Monday through Sunday when a month starts midweek', () => {
    expect(getCalendarWeeksForMonth(2026, 9)).toEqual([
      { startDate: '2026-09-28', endDate: '2026-10-04' },
      { startDate: '2026-10-05', endDate: '2026-10-11' },
      { startDate: '2026-10-12', endDate: '2026-10-18' },
      { startDate: '2026-10-19', endDate: '2026-10-25' },
      { startDate: '2026-10-26', endDate: '2026-11-01' },
    ]);
  });

  it('returns six full calendar weeks when a month spans six rows', () => {
    const weeks = getCalendarWeeksForMonth(2020, 7);
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual({ startDate: '2020-07-27', endDate: '2020-08-02' });
    expect(weeks.at(-1)).toEqual({ startDate: '2020-08-31', endDate: '2020-09-06' });
  });

  it('handles leap February', () => {
    const weeks = getCalendarWeeksForMonth(2024, 1);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual({ startDate: '2024-01-29', endDate: '2024-02-04' });
    expect(weeks.at(-1)).toEqual({ startDate: '2024-02-26', endDate: '2024-03-03' });
    expect(weeks.every(({ startDate, endDate }) => {
      const start = new Date(`${startDate}T12:00:00`);
      const end = new Date(`${endDate}T12:00:00`);
      return start.getDay() === 1 && end.getDay() === 0 && (end.getTime() - start.getTime()) / 86400000 === 6;
    })).toBe(true);
  });
});
