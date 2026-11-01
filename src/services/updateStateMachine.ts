export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  currentVersion?: string;
  version?: string;
  releaseNotes?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  estimatedSeconds?: number;
  errorMessage?: string;
  isManualCheck: boolean;
  snoozedUntil?: number;
}

export type UpdateAction =
  | { type: 'CHECK_START'; isManual: boolean; currentVersion?: string }
  | { type: 'UPDATE_AVAILABLE'; version?: string; releaseNotes?: string }
  | { type: 'UPDATE_NOT_AVAILABLE'; currentVersion?: string }
  | {
      type: 'DOWNLOAD_PROGRESS';
      percent: number;
      transferred?: number;
      total?: number;
      bytesPerSecond?: number;
    }
  | { type: 'UPDATE_DOWNLOADED'; version?: string; releaseNotes?: string }
  | { type: 'UPDATE_ERROR'; message?: string }
  | { type: 'SNOOZE'; durationMs?: number }
  | { type: 'RESET' }
  | { type: 'SIMULATE_STATE'; state: Partial<UpdateState> };

export const INITIAL_UPDATE_STATE: UpdateState = {
  status: 'idle',
  isManualCheck: false,
};

export function computeEstimatedSeconds(
  transferred?: number,
  total?: number,
  bytesPerSecond?: number
): number | undefined {
  if (!total || !transferred || !bytesPerSecond || bytesPerSecond <= 0) return undefined;
  const remaining = total - transferred;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / bytesPerSecond);
}

export function updateReducer(state: UpdateState, action: UpdateAction): UpdateState {
  switch (action.type) {
    case 'CHECK_START':
      return {
        ...state,
        status: 'checking',
        isManualCheck: action.isManual,
        currentVersion: action.currentVersion ?? state.currentVersion,
        errorMessage: undefined,
      };

    case 'UPDATE_AVAILABLE':
      return {
        ...state,
        status: 'available',
        version: action.version ?? state.version,
        releaseNotes: action.releaseNotes ?? state.releaseNotes,
        errorMessage: undefined,
      };

    case 'UPDATE_NOT_AVAILABLE':
      // Manual checks show "up-to-date"; automated background checks settle back to idle calmly
      return {
        ...state,
        status: state.isManualCheck ? 'up-to-date' : 'idle',
        currentVersion: action.currentVersion ?? state.currentVersion,
        errorMessage: undefined,
      };

    case 'DOWNLOAD_PROGRESS': {
      const estimatedSeconds = computeEstimatedSeconds(
        action.transferred,
        action.total,
        action.bytesPerSecond
      );
      return {
        ...state,
        status: 'downloading',
        percent: Math.min(100, Math.max(0, action.percent)),
        transferred: action.transferred,
        total: action.total,
        bytesPerSecond: action.bytesPerSecond,
        estimatedSeconds,
        errorMessage: undefined,
      };
    }

    case 'UPDATE_DOWNLOADED':
      return {
        ...state,
        status: 'downloaded',
        percent: 100,
        version: action.version ?? state.version,
        releaseNotes: action.releaseNotes ?? state.releaseNotes,
        errorMessage: undefined,
      };

    case 'UPDATE_ERROR':
      // If error happens during an automated background check, settle back to idle without alarming user
      return {
        ...state,
        status: state.isManualCheck ? 'error' : 'idle',
        errorMessage: action.message,
      };

    case 'SNOOZE': {
      const duration = action.durationMs ?? 24 * 60 * 60 * 1000;
      return {
        ...state,
        snoozedUntil: Date.now() + duration,
      };
    }

    case 'RESET':
      return {
        ...INITIAL_UPDATE_STATE,
        currentVersion: state.currentVersion,
      };

    case 'SIMULATE_STATE':
      return {
        ...state,
        ...action.state,
      };

    default:
      return state;
  }
}
