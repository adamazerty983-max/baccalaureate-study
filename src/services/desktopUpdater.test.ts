import { describe, expect, it } from 'vitest';
import { getDownloadPercent, shouldShowDesktopUpdateNotice } from './desktopUpdater';

describe('desktop updater notice states', () => {
  it('shows a Tauri update offer, but waits for Electron download status', () => {
    expect(shouldShowDesktopUpdateNotice('available', {
      dismissed: false,
      manualCheck: false,
      isTauri: true,
      hasUpdate: true,
    })).toBe(true);

    expect(shouldShowDesktopUpdateNotice('available', {
      dismissed: false,
      manualCheck: true,
      isTauri: false,
      hasUpdate: false,
    })).toBe(false);
  });

  it('keeps automatic checks quiet and shows manual results and active downloads', () => {
    expect(shouldShowDesktopUpdateNotice('error', {
      dismissed: false,
      manualCheck: false,
      isTauri: true,
      hasUpdate: false,
    })).toBe(false);
    expect(shouldShowDesktopUpdateNotice('not-available', {
      dismissed: false,
      manualCheck: true,
      isTauri: true,
      hasUpdate: false,
    })).toBe(true);
    expect(shouldShowDesktopUpdateNotice('downloading', {
      dismissed: false,
      manualCheck: false,
      isTauri: false,
      hasUpdate: false,
    })).toBe(true);
  });

  it('does not display a percentage without a known content length', () => {
    expect(getDownloadPercent(500, 0)).toBeUndefined();
    expect(getDownloadPercent(750, 1000)).toBe(75);
    expect(getDownloadPercent(1500, 1000)).toBe(100);
  });

  it('suppresses the dismissed update version', () => {
    expect(shouldShowDesktopUpdateNotice('downloaded', {
      dismissed: true,
      manualCheck: false,
      isTauri: true,
      hasUpdate: true,
    })).toBe(false);
  });
});
