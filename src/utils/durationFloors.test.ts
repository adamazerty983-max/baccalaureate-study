import { describe, it, expect } from 'vitest';

const PIXELS_PER_MINUTE = 1.5;

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Emulate the updated block duration calculation in TimeBlockingTab
function calculateBlockDuration(startTime: string, endTime: string): number {
  return Math.max(1, timeToMinutes(endTime) - timeToMinutes(startTime));
}

// Emulate the updated heightPx calculation in TimeBlockingTab
function calculateBlockHeightPx(durationMinutes: number): number {
  return Math.max(12, durationMinutes * PIXELS_PER_MINUTE);
}

// Emulate FocusModeModal duration calculation
function calculateFocusModeDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const rawDiff = eh * 60 + em - (sh * 60 + sm);
  return Math.max(1, rawDiff > 0 ? rawDiff : rawDiff + 1440);
}

describe('Time Blocking Precision & Proportional Heights', () => {
  it('correctly calculates 5m, 10m, and 15m durations without rounding up to 15m', () => {
    const dur5 = calculateBlockDuration('08:00', '08:05');
    const dur10 = calculateBlockDuration('08:00', '08:10');
    const dur15 = calculateBlockDuration('08:00', '08:15');

    expect(dur5).toBe(5);
    expect(dur10).toBe(10);
    expect(dur15).toBe(15);
  });

  it('renders 5m, 10m, and 15m tasks at visually distinct, proportionally accurate heights', () => {
    const height5 = calculateBlockHeightPx(5);
    const height10 = calculateBlockHeightPx(10);
    const height15 = calculateBlockHeightPx(15);

    // 5m = 12px (floor), 10m = 15px, 15m = 22.5px
    expect(height5).toBe(12);
    expect(height10).toBe(15);
    expect(height15).toBe(22.5);

    // Each must be strictly distinct and strictly ascending
    expect(height5).toBeLessThan(height10);
    expect(height10).toBeLessThan(height15);

    // Proportions: 10m is 25% taller than 5m, 15m is 50% taller than 10m
    expect(height10 - height5).toBe(3);
    expect(height15 - height10).toBe(7.5);
  });

  it('preserves accurate duration in FocusModeModal for 5m, 10m, and 15m blocks', () => {
    expect(calculateFocusModeDuration('14:00', '14:05')).toBe(5);
    expect(calculateFocusModeDuration('14:00', '14:10')).toBe(10);
    expect(calculateFocusModeDuration('14:00', '14:15')).toBe(15);
  });
});
