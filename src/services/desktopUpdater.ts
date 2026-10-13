import { isTauri } from '@tauri-apps/api/core';

export const DESKTOP_UPDATE_CHECK_EVENT = 'mybac:desktop-update-check';
export const DESKTOP_UPDATE_STATUS_EVENT = 'mybac:desktop-update-status';

export type DesktopUpdateUiStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'installing'
  | 'downloaded'
  | 'error';

export interface DesktopUpdateUiState {
  status: DesktopUpdateUiStatus;
  currentVersion?: string;
  version?: string;
  body?: string;
  progress?: number;
  downloadedBytes?: number;
  message?: string;
}

export function getDownloadPercent(downloadedBytes: number, contentLength: number): number | undefined {
  if (!Number.isFinite(downloadedBytes) || !Number.isFinite(contentLength) || contentLength <= 0) return undefined;
  return Math.min(100, Math.max(0, Math.floor((downloadedBytes / contentLength) * 100)));
}

export function shouldShowDesktopUpdateNotice(
  status: DesktopUpdateUiStatus,
  options: { dismissed: boolean; manualCheck: boolean; isTauri: boolean; hasUpdate: boolean }
): boolean {
  if (options.dismissed) return false;
  if (status === 'available') return options.isTauri && options.hasUpdate;
  if (status === 'downloading' || status === 'installing' || status === 'downloaded') return true;
  return options.manualCheck && (status === 'checking' || status === 'not-available' || status === 'error');
}

export function isDesktopApplication(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.electronAPI?.isElectron || isTauri());
}

export function requestDesktopUpdateCheck(): void {
  if (typeof window === 'undefined' || !isDesktopApplication()) return;
  window.dispatchEvent(new CustomEvent(DESKTOP_UPDATE_CHECK_EVENT));
}

export function publishDesktopUpdateState(state: DesktopUpdateUiState): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DesktopUpdateUiState>(DESKTOP_UPDATE_STATUS_EVENT, { detail: state }));
}
