import { describe, it, expect } from 'vitest';
import {
  calculateTimeBlockDurationMinutes,
  buildDailyStudyHoursMap,
  getDaysZoomData,
  getWeeksZoomData,
  getMonthsZoomData,
  computeNiceMaxY,
  computeMonotoneCubicSplinePath,
  formatDurationLocalized,
  selectStudyHoursChartData,
} from './studyHoursSelector';
import { TimeBlock } from '../types';

describe('studyHoursSelector', () => {
  describe('calculateTimeBlockDurationMinutes (Midnight crossing & precision)', () => {
    it('calculates regular daytime durations accurately', () => {
      expect(calculateTimeBlockDurationMinutes('08:00', '10:00')).toBe(120);
      expect(calculateTimeBlockDurationMinutes('14:00', '15:30')).toBe(90);
      expect(calculateTimeBlockDurationMinutes('09:15', '09:45')).toBe(30);
    });

    it('handles blocks that cross midnight without negative durations', () => {
      // 23:00 to 01:00 is 2 hours (120 min)
      expect(calculateTimeBlockDurationMinutes('23:00', '01:00')).toBe(120);
      // 23:30 to 00:30 is 1 hour (60 min)
      expect(calculateTimeBlockDurationMinutes('23:30', '00:30')).toBe(60);
      // 22:00 to 02:00 is 4 hours (240 min)
      expect(calculateTimeBlockDurationMinutes('22:00', '02:00')).toBe(240);
    });

    it('returns 0 for empty or identical start/end times', () => {
      expect(calculateTimeBlockDurationMinutes('08:00', '08:00')).toBe(0);
      expect(calculateTimeBlockDurationMinutes('', '10:00')).toBe(0);
      expect(calculateTimeBlockDurationMinutes('10:00', '')).toBe(0);
      expect(calculateTimeBlockDurationMinutes(undefined, undefined)).toBe(0);
    });
  });

  describe('buildDailyStudyHoursMap (Filtering, Occurrences & Exclusion)', () => {
    it('excludes sticker_activity blocks (prayer, rest, meals, etc.)', () => {
      const blocks: TimeBlock[] = [
        {
          id: 'b1',
          dayOfWeek: 1,
          dateKey: '2026-10-20',
          startTime: '08:00',
          endTime: '10:00', // 2h study
          title: 'Math Revision',
          subject: 'Mathématiques',
          isCompleted: true,
          type: 'study',
        },
        {
          id: 'b2',
          dayOfWeek: 1,
          dateKey: '2026-10-20',
          startTime: '12:00',
          endTime: '13:00', // 1h prayer/rest
          title: 'Prière Dhuhr',
          subject: 'Activités',
          isCompleted: true,
          type: 'sticker_activity',
          stickerType: 'praying',
        },
      ];

      const map = buildDailyStudyHoursMap(blocks);
      expect(map['2026-10-20']).toBe(2.0); // Only math study is counted, sticker is excluded
    });

    it('excludes uncompleted study blocks', () => {
      const blocks: TimeBlock[] = [
        {
          id: 'b1',
          dayOfWeek: 2,
          dateKey: '2026-10-21',
          startTime: '10:00',
          endTime: '12:00',
          title: 'Physics',
          subject: 'Physique',
          isCompleted: false, // Not completed
          type: 'study',
        },
      ];

      const map = buildDailyStudyHoursMap(blocks);
      expect(map['2026-10-21']).toBeUndefined();
    });

    it('handles recurring blocks with completedOccurrences correctly without double counting', () => {
      const recurringBlock: TimeBlock[] = [
        {
          id: 'rec-1',
          dayOfWeek: 1, // Every Monday
          startTime: '18:00',
          endTime: '20:00', // 2h
          title: 'SVT Weekly',
          subject: 'SVT',
          isCompleted: true,
          type: 'study',
          completedOccurrences: [
            { dateKey: '2026-10-05', completedAt: '2026-10-05T20:01:00Z' },
            { dateKey: '2026-10-12', completedAt: '2026-10-12T20:02:00Z' },
          ],
        },
      ];

      const map = buildDailyStudyHoursMap(recurringBlock);
      expect(map['2026-10-05']).toBe(2.0);
      expect(map['2026-10-12']).toBe(2.0);
      // Ensure total across both days is exactly 4.0
      expect(Object.values(map).reduce((a, b) => a + b, 0)).toBe(4.0);
    });

    it('aggregates multiple blocks on the same day cleanly', () => {
      const blocks: TimeBlock[] = [
        {
          id: 's1',
          dayOfWeek: 3,
          dateKey: '2026-10-22',
          startTime: '08:00',
          endTime: '10:30', // 2.5h
          title: 'Math',
          subject: 'Mathématiques',
          isCompleted: true,
          type: 'study',
        },
        {
          id: 's2',
          dayOfWeek: 3,
          dateKey: '2026-10-22',
          startTime: '14:00',
          endTime: '15:30', // 1.5h
          title: 'Focus session',
          subject: 'Philosophie',
          isCompleted: true,
          type: 'study',
        },
      ];

      const map = buildDailyStudyHoursMap(blocks);
      expect(map['2026-10-22']).toBe(4.0);
    });
  });

  describe('getDaysZoomData (Week boundaries, Past as Zero & Future as Null)', () => {
    it('returns exactly 7 points (Monday to Sunday) for the target week', () => {
      // Simulate today = Wednesday 2026-10-21
      const now = new Date(2026, 9, 21, 14, 0, 0); // 2026-10-21 is Wednesday
      const dailyMap: Record<string, number> = {
        '2026-10-19': 3.5, // Monday: 3.5h
        // Tuesday 2026-10-20 has no study -> must be 0
        '2026-10-21': 1.5, // Wednesday (today): 1.5h
        // Thursday, Friday, Saturday, Sunday are future -> must be null
      };

      const { points } = getDaysZoomData(dailyMap, 0, now, 'fr');
      expect(points).toHaveLength(7);

      // Check dates
      expect(points[0].dateKey).toBe('2026-10-19'); // Monday
      expect(points[0].hours).toBe(3.5);
      expect(points[0].isFuture).toBe(false);

      expect(points[1].dateKey).toBe('2026-10-20'); // Tuesday
      expect(points[1].hours).toBe(0); // Past with no study IS zero
      expect(points[1].isFuture).toBe(false);

      expect(points[2].dateKey).toBe('2026-10-21'); // Wednesday (today)
      expect(points[2].hours).toBe(1.5);
      expect(points[2].isFuture).toBe(false);
      expect(points[2].isToday).toBe(true);

      // Future days (Thursday through Sunday)
      expect(points[3].dateKey).toBe('2026-10-22');
      expect(points[3].hours).toBeNull(); // NEVER plot future as zero!
      expect(points[3].isFuture).toBe(true);

      expect(points[4].dateKey).toBe('2026-10-23');
      expect(points[4].hours).toBeNull();
      expect(points[4].isFuture).toBe(true);

      expect(points[5].dateKey).toBe('2026-10-24');
      expect(points[5].hours).toBeNull();
      expect(points[5].isFuture).toBe(true);

      expect(points[6].dateKey).toBe('2026-10-25');
      expect(points[6].hours).toBeNull();
      expect(points[6].isFuture).toBe(true);
    });

    it('handles week navigation with weekOffset', () => {
      const now = new Date(2026, 9, 21, 14, 0, 0); // Wed 2026-10-21
      // Previous week: weekOffset = -1
      const { points } = getDaysZoomData({}, -1, now, 'fr');
      expect(points).toHaveLength(7);
      expect(points[0].dateKey).toBe('2026-10-12'); // Monday of previous week
      expect(points[6].dateKey).toBe('2026-10-18'); // Sunday of previous week
      // All points in a past week should have isFuture = false and hours = 0
      points.forEach((p) => {
        expect(p.isFuture).toBe(false);
        expect(p.hours).toBe(0);
      });
    });
  });

  describe('getWeeksZoomData (Averages & Bucket Totals)', () => {
    it('plots average study hours per day in each week and includes total in bucket', () => {
      // Wednesday 2026-10-21
      const now = new Date(2026, 9, 21, 14, 0, 0);
      // Last week (Mon 2026-10-12 to Sun 2026-10-18): 14 total hours across 7 days -> avg = 2.0 h/day
      const dailyMap: Record<string, number> = {
        '2026-10-12': 2,
        '2026-10-13': 2,
        '2026-10-14': 2,
        '2026-10-15': 2,
        '2026-10-16': 2,
        '2026-10-17': 2,
        '2026-10-18': 2,
        // Current week (Mon 2026-10-19 to Wed 2026-10-21): 3 elapsed days, 6 total hours -> avg = 2.0 h/day
        '2026-10-19': 3,
        '2026-10-20': 0,
        '2026-10-21': 3,
      };

      const { points } = getWeeksZoomData(dailyMap, 10, now, 'fr');
      expect(points).toHaveLength(10);

      const currentWeekPoint = points[9]; // latest is current week
      expect(currentWeekPoint.dateKey).toBe('2026-10-19');
      expect(currentWeekPoint.elapsedDaysInBucket).toBe(3); // Mon, Tue, Wed
      expect(currentWeekPoint.totalHoursInBucket).toBe(6);
      expect(currentWeekPoint.hours).toBe(2); // 6 / 3 = 2.0 avg/day

      const previousWeekPoint = points[8];
      expect(previousWeekPoint.dateKey).toBe('2026-10-12');
      expect(previousWeekPoint.elapsedDaysInBucket).toBe(7);
      expect(previousWeekPoint.totalHoursInBucket).toBe(14);
      expect(previousWeekPoint.hours).toBe(2); // 14 / 7 = 2.0 avg/day
    });
  });

  describe('getMonthsZoomData (Academic Year & Month Averages)', () => {
    it('covers academic year from start to Bac date with daily averages', () => {
      const now = new Date(2026, 9, 27, 12, 0, 0); // 27 October 2026
      const academicYearStartDate = '2026-09-01T08:00:00';
      const baccalaureateDate = '2027-06-10T08:00:00';

      const dailyMap: Record<string, number> = {
        // September (30 days): 60h total -> 2.0 h/day
        '2026-09-01': 30,
        '2026-09-15': 30,
      };

      const { points } = getMonthsZoomData(dailyMap, academicYearStartDate, baccalaureateDate, now, 'fr');
      // Sep 2026 to Jun 2027 is 10 months
      expect(points.length).toBeGreaterThanOrEqual(10);

      const sepPoint = points[0];
      expect(sepPoint.label).toMatch(/^Sep/i);
      expect(sepPoint.totalHoursInBucket).toBe(60);
      expect(sepPoint.elapsedDaysInBucket).toBe(30);
      expect(sepPoint.hours).toBe(2);

      // October is current month
      const octPoint = points[1];
      expect(octPoint.isToday).toBe(true);
      expect(octPoint.isFuture).toBe(false);

      // November 2026 through June 2027 are future months
      const novPoint = points[2];
      expect(novPoint.isFuture).toBe(true);
      expect(novPoint.hours).toBeNull(); // Never plot future as zero
    });
  });

  describe('computeNiceMaxY', () => {
    it('defaults to 10 if data is <= 10', () => {
      expect(computeNiceMaxY(0)).toBe(10);
      expect(computeNiceMaxY(5.5)).toBe(10);
      expect(computeNiceMaxY(10)).toBe(10);
    });

    it('auto-extends cleanly to 12, 14, 16, 20 if data exceeds 10', () => {
      expect(computeNiceMaxY(10.5)).toBe(12);
      expect(computeNiceMaxY(12.0)).toBe(12);
      expect(computeNiceMaxY(13.2)).toBe(14);
      expect(computeNiceMaxY(15.5)).toBe(16);
      expect(computeNiceMaxY(18.0)).toBe(20);
      expect(computeNiceMaxY(22.0)).toBe(24);
    });
  });

  describe('computeMonotoneCubicSplinePath (Fritsch-Carlson non-overshoot)', () => {
    it('returns empty paths for 0 points', () => {
      expect(computeMonotoneCubicSplinePath([], 100)).toEqual({ linePath: '', areaPath: '' });
    });

    it('returns a valid M and L for 2 points', () => {
      const res = computeMonotoneCubicSplinePath([{ x: 0, y: 10 }, { x: 100, y: 20 }], 100);
      expect(res.linePath).toContain('M 0.00 10.00 L 100.00 20.00');
      expect(res.areaPath).toContain('Z');
    });

    it('generates cubic bezier segments (C) without crashing', () => {
      const points = [
        { x: 0, y: 50 },
        { x: 50, y: 10 },
        { x: 100, y: 10 },
        { x: 150, y: 80 },
        { x: 200, y: 80 },
      ];
      const res = computeMonotoneCubicSplinePath(points, 100);
      expect(res.linePath).toContain('M 0.00 50.00');
      expect(res.linePath).toContain('C');
      expect(res.areaPath).toContain('Z');
    });

    it('creates flat lines with zero overshoot when consecutive values are identical', () => {
      // Points where y is flat at 50
      const points = [
        { x: 0, y: 50 },
        { x: 50, y: 50 },
        { x: 100, y: 50 },
      ];
      const res = computeMonotoneCubicSplinePath(points, 100);
      // Control points for horizontal segments must have y = 50.00
      expect(res.linePath).toContain('C 16.67 50.00, 33.33 50.00, 50.00 50.00');
    });
  });

  describe('formatDurationLocalized', () => {
    it('formats durations in French, Arabic, and English', () => {
      expect(formatDurationLocalized(2.5, 'fr')).toBe('2 h 30 min');
      expect(formatDurationLocalized(1.0, 'fr')).toBe('1 h');
      expect(formatDurationLocalized(0.25, 'fr')).toBe('15 min');

      expect(formatDurationLocalized(2.5, 'ar')).toBe('2 س 30 د');
      expect(formatDurationLocalized(1.0, 'ar')).toBe('1 س');
      expect(formatDurationLocalized(0.5, 'ar')).toBe('30 د');

      expect(formatDurationLocalized(2.5, 'en')).toBe('2h 30m');
      expect(formatDurationLocalized(1.0, 'en')).toBe('1h');
    });
  });

  describe('selectStudyHoursChartData integration', () => {
    it('computes summary stats and hasAnyData flag', () => {
      const blocks: TimeBlock[] = [
        {
          id: 'b1',
          dayOfWeek: 1,
          dateKey: '2026-10-19',
          startTime: '08:00',
          endTime: '11:00', // 3h
          title: 'Math',
          subject: 'Math',
          isCompleted: true,
          type: 'study',
        },
      ];

      const now = new Date(2026, 9, 21, 12, 0, 0);
      const data = selectStudyHoursChartData(blocks, 'days', { now, language: 'fr' });

      expect(data.hasAnyData).toBe(true);
      expect(data.totalStudyHours).toBe(3);
      expect(data.maxY).toBe(10);
      expect(data.points).toHaveLength(7);
    });
  });
});
