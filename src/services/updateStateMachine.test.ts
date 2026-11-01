import { describe, expect, it } from 'vitest';
import {
  computeEstimatedSeconds,
  INITIAL_UPDATE_STATE,
  updateReducer,
  UpdateState,
} from './updateStateMachine';

describe('updateStateMachine: computeEstimatedSeconds', () => {
  it('returns undefined if missing metrics or zero speed', () => {
    expect(computeEstimatedSeconds(undefined, 100, 10)).toBeUndefined();
    expect(computeEstimatedSeconds(50, undefined, 10)).toBeUndefined();
    expect(computeEstimatedSeconds(50, 100, 0)).toBeUndefined();
    expect(computeEstimatedSeconds(50, 100, -5)).toBeUndefined();
  });

  it('computes ceiling remaining seconds correctly', () => {
    // 10 MB total, 5 MB transferred, 1 MB/s speed -> 5s remaining
    expect(computeEstimatedSeconds(5_000_000, 10_000_000, 1_000_000)).toBe(5);
    // 10 MB total, 7 MB transferred, 2 MB/s speed -> 1.5s -> 2s
    expect(computeEstimatedSeconds(7_000_000, 10_000_000, 2_000_000)).toBe(2);
    // Transferred >= Total
    expect(computeEstimatedSeconds(10_000_000, 10_000_000, 1_000_000)).toBe(0);
  });
});

describe('updateStateMachine: updateReducer transitions', () => {
  it('handles background check without updates returning to idle', () => {
    const s1 = updateReducer(INITIAL_UPDATE_STATE, {
      type: 'CHECK_START',
      isManual: false,
      currentVersion: '1.0.0',
    });
    expect(s1.status).toBe('checking');
    expect(s1.isManualCheck).toBe(false);

    const s2 = updateReducer(s1, { type: 'UPDATE_NOT_AVAILABLE', currentVersion: '1.0.0' });
    expect(s2.status).toBe('idle');
  });

  it('handles manual check without updates transitioning to up-to-date', () => {
    const s1 = updateReducer(INITIAL_UPDATE_STATE, {
      type: 'CHECK_START',
      isManual: true,
      currentVersion: '1.0.0',
    });
    expect(s1.status).toBe('checking');
    expect(s1.isManualCheck).toBe(true);

    const s2 = updateReducer(s1, { type: 'UPDATE_NOT_AVAILABLE', currentVersion: '1.0.0' });
    expect(s2.status).toBe('up-to-date');
  });

  it('transitions to available and calculates download progress with ETA', () => {
    const s1 = updateReducer(INITIAL_UPDATE_STATE, {
      type: 'UPDATE_AVAILABLE',
      version: '1.1.0',
      releaseNotes: '### New features',
    });
    expect(s1.status).toBe('available');
    expect(s1.version).toBe('1.1.0');

    const s2 = updateReducer(s1, {
      type: 'DOWNLOAD_PROGRESS',
      percent: 45,
      transferred: 4_500_000,
      total: 10_000_000,
      bytesPerSecond: 1_000_000,
    });
    expect(s2.status).toBe('downloading');
    expect(s2.percent).toBe(45);
    expect(s2.estimatedSeconds).toBe(6);

    const s3 = updateReducer(s2, {
      type: 'UPDATE_DOWNLOADED',
      version: '1.1.0',
    });
    expect(s3.status).toBe('downloaded');
    expect(s3.percent).toBe(100);
  });

  it('keeps background check errors quiet, but shows errors on manual check', () => {
    // Automated background error
    const bgCheck = updateReducer(INITIAL_UPDATE_STATE, {
      type: 'CHECK_START',
      isManual: false,
    });
    const bgError = updateReducer(bgCheck, {
      type: 'UPDATE_ERROR',
      message: 'Network offline',
    });
    expect(bgError.status).toBe('idle');

    // Manual check error
    const manualCheck = updateReducer(INITIAL_UPDATE_STATE, {
      type: 'CHECK_START',
      isManual: true,
    });
    const manualError = updateReducer(manualCheck, {
      type: 'UPDATE_ERROR',
      message: 'Timeout connecting to update server',
    });
    expect(manualError.status).toBe('error');
    expect(manualError.errorMessage).toBe('Timeout connecting to update server');
  });

  it('supports snooze for 24 hours', () => {
    const base: UpdateState = {
      status: 'downloaded',
      version: '1.2.0',
      isManualCheck: false,
    };
    const now = Date.now();
    const snoozed = updateReducer(base, { type: 'SNOOZE', durationMs: 86_400_000 });
    expect(snoozed.snoozedUntil).toBeGreaterThanOrEqual(now + 86_000_000);
  });
});
