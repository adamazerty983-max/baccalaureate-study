import {
  INITIAL_UPDATE_STATE,
  UpdateAction,
  updateReducer,
  UpdateState,
  UpdateStatus,
} from './updateStateMachine';

const SNOOZE_STORAGE_KEY = 'mybac:update-snooze-until';
const LAST_CHECK_STORAGE_KEY = 'mybac:last-update-check-ts';

type Listener = (state: UpdateState) => void;

class UpdateService {
  private state: UpdateState = INITIAL_UPDATE_STATE;
  private listeners = new Set<Listener>();
  private pollIntervalId: number | null = null;
  private isFocusMode = false;

  constructor() {
    this.restoreStoredSnooze();
    this.initEnvironment();
    this.setupChunkFailureListener();
  }

  private restoreStoredSnooze() {
    try {
      const stored = localStorage.getItem(SNOOZE_STORAGE_KEY);
      if (stored) {
        const until = Number(stored);
        if (until > Date.now()) {
          this.state = { ...this.state, snoozedUntil: until };
        } else {
          localStorage.removeItem(SNOOZE_STORAGE_KEY);
        }
      }
    } catch {
      // Storage unavailable in private browsing
    }
  }

  private dispatch(action: UpdateAction) {
    this.state = updateReducer(this.state, action);
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('UpdateService listener error:', e);
      }
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public getState(): UpdateState {
    return this.state;
  }

  public setFocusMode(active: boolean) {
    this.isFocusMode = active;
    this.notify();
  }

  public isBannerVisible(): boolean {
    if (this.isFocusMode) return false;

    // Check if currently snoozed
    if (this.state.snoozedUntil && this.state.snoozedUntil > Date.now()) {
      return false;
    }

    const { status, isManualCheck } = this.state;
    if (status === 'downloaded' || status === 'downloading' || status === 'available') {
      return true;
    }

    // Manual checks display feedback
    if (isManualCheck && (status === 'checking' || status === 'up-to-date' || status === 'error')) {
      return true;
    }

    return false;
  }

  private initEnvironment() {
    const isElectron = Boolean(typeof window !== 'undefined' && window.electronAPI?.isElectron);

    if (isElectron && window.electronAPI?.updater) {
      // Electron desktop environment
      window.electronAPI.updater.getAppVersion().then((version) => {
        this.dispatch({ type: 'SIMULATE_STATE', state: { currentVersion: version } });
      }).catch(() => {});

      window.electronAPI.updater.onStatusChange((data) => {
        switch (data.status) {
          case 'checking':
            this.dispatch({ type: 'CHECK_START', isManual: this.state.isManualCheck });
            break;
          case 'available':
            this.dispatch({
              type: 'UPDATE_AVAILABLE',
              version: data.version,
              releaseNotes: data.releaseNotes,
            });
            break;
          case 'not-available':
            this.dispatch({ type: 'UPDATE_NOT_AVAILABLE', currentVersion: data.version });
            break;
          case 'downloading':
            this.dispatch({
              type: 'DOWNLOAD_PROGRESS',
              percent: data.percent ?? 0,
              transferred: data.transferred,
              total: data.total,
              bytesPerSecond: data.bytesPerSecond,
            });
            break;
          case 'downloaded':
            this.dispatch({
              type: 'UPDATE_DOWNLOADED',
              version: data.version,
              releaseNotes: data.releaseNotes,
            });
            break;
          case 'error':
            this.dispatch({ type: 'UPDATE_ERROR', message: data.message });
            break;
        }
      });
    } else if (typeof window !== 'undefined') {
      // Web / PWA environment
      const currentVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
      this.state = { ...this.state, currentVersion: currentVer };

      // Poll version.json on focus, visibility change, and every 15 minutes
      window.addEventListener('focus', () => this.checkWebVersion(false));
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkWebVersion(false);
        }
      });

      this.pollIntervalId = window.setInterval(() => {
        this.checkWebVersion(false);
      }, 15 * 60 * 1000);

      // Initial silent check
      setTimeout(() => this.checkWebVersion(false), 3000);
    }
  }

  private setupChunkFailureListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('mybac:chunk-preload-failed', () => {
      this.notifyChunkLoadFailure();
    });
  }

  public notifyChunkLoadFailure() {
    this.dispatch({
      type: 'UPDATE_AVAILABLE',
      version: 'New Version',
      releaseNotes: 'Une nouvelle version a été déployée. Cliquez sur Actualiser pour mettre à jour.',
    });
  }

  public async checkWebVersion(isManual = false) {
    if (this.state.status === 'downloading') return;

    this.dispatch({ type: 'CHECK_START', isManual, currentVersion: this.state.currentVersion });
    this.recordLastCheckTime();

    try {
      const versionUrl = `${import.meta.env.BASE_URL || '/'}version.json`.replace(/\/\//g, '/');
      const res = await fetch(versionUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const currentBuild = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '';

      if (data.buildId && currentBuild && data.buildId !== currentBuild) {
        this.dispatch({
          type: 'UPDATE_AVAILABLE',
          version: data.version || 'New',
          releaseNotes: data.releaseNotes,
        });
      } else {
        this.dispatch({
          type: 'UPDATE_NOT_AVAILABLE',
          currentVersion: data.version || this.state.currentVersion,
        });
      }
    } catch (err) {
      this.dispatch({
        type: 'UPDATE_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  public async checkForUpdates(isManual = true) {
    const isElectron = Boolean(typeof window !== 'undefined' && window.electronAPI?.isElectron);
    this.recordLastCheckTime();

    if (isElectron && window.electronAPI?.updater) {
      this.dispatch({ type: 'CHECK_START', isManual, currentVersion: this.state.currentVersion });
      try {
        await window.electronAPI.updater.checkForUpdates();
      } catch (err) {
        this.dispatch({
          type: 'UPDATE_ERROR',
          message: err instanceof Error ? err.message : 'Update check failed',
        });
      }
    } else {
      await this.checkWebVersion(isManual);
    }
  }

  public async restartOrRefresh() {
    const isElectron = Boolean(typeof window !== 'undefined' && window.electronAPI?.isElectron);
    if (isElectron && window.electronAPI?.updater) {
      await window.electronAPI.updater.restartAndInstall();
    } else {
      window.location.reload();
    }
  }

  public snooze(durationMs = 24 * 60 * 60 * 1000) {
    const until = Date.now() + durationMs;
    try {
      localStorage.setItem(SNOOZE_STORAGE_KEY, String(until));
    } catch {
      // Ignored
    }
    this.dispatch({ type: 'SNOOZE', durationMs });
  }

  public reset() {
    this.dispatch({ type: 'RESET' });
  }

  public simulate(state: Partial<UpdateState>) {
    this.dispatch({ type: 'SIMULATE_STATE', state });
  }

  public recordLastCheckTime() {
    try {
      localStorage.setItem(LAST_CHECK_STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignored
    }
  }

  public getLastCheckTime(): number | null {
    try {
      const stored = localStorage.getItem(LAST_CHECK_STORAGE_KEY);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  }
}

export const updateService = new UpdateService();
