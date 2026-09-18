/// <reference types="vite/client" />

export interface DesktopUpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  message?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      updater?: {
        onStatusChange: (callback: (data: DesktopUpdateStatus) => void) => () => void;
        checkForUpdates: () => Promise<unknown>;
        restartAndInstall: () => Promise<void>;
        getAppVersion: () => Promise<string>;
      };
    };
  }
}


