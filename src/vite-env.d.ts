/// <reference types="vite/client" />

export interface DesktopUpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseNotes?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  message?: string;
}

export interface UpdaterSettings {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
}

declare global {
  const __APP_VERSION__: string;
  const __BUILD_ID__: string;

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
        getSettings?: () => Promise<UpdaterSettings>;
        setSettings?: (settings: Partial<UpdaterSettings>) => Promise<void>;
        openExternal?: (url: string) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}
