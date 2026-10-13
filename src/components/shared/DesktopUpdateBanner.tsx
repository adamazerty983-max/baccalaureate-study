import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, LoaderCircle, RefreshCw, Sparkles, X } from 'lucide-react';
import { AppLanguage } from '../../types';
import { getT } from '../../utils/i18n';
import { chimePlayer } from '../../utils/audio';
import {
  DESKTOP_UPDATE_CHECK_EVENT,
  DesktopUpdateUiState,
  getDownloadPercent,
  isDesktopApplication,
  publishDesktopUpdateState,
  shouldShowDesktopUpdateNotice,
} from '../../services/desktopUpdater';

const DISMISSED_UPDATE_KEY = 'mybac:desktop-update-dismissed:';

type UpdateHandle = import('@tauri-apps/plugin-updater').Update;

interface DesktopUpdateBannerProps {
  language: AppLanguage;
}

export const DesktopUpdateBanner: React.FC<DesktopUpdateBannerProps> = ({ language }) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const updateRef = useRef<UpdateHandle | null>(null);
  const autoCheckStartedRef = useRef(false);
  const [state, setState] = useState<DesktopUpdateUiState>({ status: 'idle' });
  const [isDismissed, setIsDismissed] = useState(false);
  const [isManualCheck, setIsManualCheck] = useState(false);

  const setUpdateState = useCallback((next: DesktopUpdateUiState) => {
    setState(next);
    publishDesktopUpdateState(next);
  }, []);

  const checkForTauriUpdate = useCallback(async (manual: boolean) => {
    if (!isDesktopApplication()) return;
    const { isTauri } = await import('@tauri-apps/api/core');
    if (!isTauri()) return;

    setIsManualCheck(manual);
    setIsDismissed(false);
    setUpdateState({ status: 'checking' });

    try {
      const [{ check }, { getVersion }] = await Promise.all([
        import('@tauri-apps/plugin-updater'),
        import('@tauri-apps/api/app'),
      ]);
      const currentVersion = await getVersion();
      const previousUpdate = updateRef.current;
      updateRef.current = null;
      if (previousUpdate) await previousUpdate.close().catch(() => undefined);

      const update = await check({ timeout: 10_000 });
      if (!update) {
        setUpdateState({
          status: 'not-available',
          currentVersion,
          message: manual ? (isAr ? 'التطبيق محدّث إلى آخر إصدار.' : isEn ? 'You are using the latest version.' : 'Vous utilisez la dernière version.') : undefined,
        });
        return;
      }

      updateRef.current = update;
      const nextState: DesktopUpdateUiState = {
        status: 'available',
        currentVersion: update.currentVersion || currentVersion,
        version: update.version,
        body: update.body,
      };
      setUpdateState(nextState);

      let wasDismissed = false;
      try {
        wasDismissed = localStorage.getItem(`${DISMISSED_UPDATE_KEY}${update.version}`) === 'true';
      } catch {
        // Storage may be unavailable in a restricted WebView; keep the session usable.
      }
      setIsDismissed(wasDismissed && !manual);
    } catch (error) {
      setUpdateState({
        status: 'error',
        message: manual
          ? (isAr ? 'تعذّر التحقق الآن. يمكنك المحاولة مجددًا لاحقًا.' : isEn ? 'Could not check right now. Please try again later.' : 'Vérification impossible pour le moment. Réessayez plus tard.')
          : undefined,
      });
    }
  }, [isAr, isEn, setUpdateState]);

  useEffect(() => {
    if (!isDesktopApplication()) return;

    let cancelled = false;
    let autoCheckTimer: number | undefined;
    const isTauriRuntime = (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;

    const handleManualCheck = () => {
      if (isTauriRuntime) {
        void checkForTauriUpdate(true);
      } else if (window.electronAPI?.updater) {
        setIsManualCheck(true);
        setIsDismissed(false);
        setUpdateState({ status: 'checking' });
        void window.electronAPI.updater.checkForUpdates().catch((error: unknown) => {
          setUpdateState({
            status: 'error',
            message: error instanceof Error ? error.message : undefined,
          });
        });
      }
    };

    window.addEventListener(DESKTOP_UPDATE_CHECK_EVENT, handleManualCheck);

    if (isTauriRuntime) {
      if (!autoCheckStartedRef.current) {
        autoCheckStartedRef.current = true;
        autoCheckTimer = window.setTimeout(() => {
          autoCheckTimer = undefined;
          if (!cancelled) void checkForTauriUpdate(false);
        }, 3_500);
      }
    } else if (window.electronAPI?.updater) {
      const unsubscribe = window.electronAPI.updater.onStatusChange((data) => {
        const next: DesktopUpdateUiState = {
          // Electron downloads automatically as soon as update-available fires;
          // Tauri waits for the user's explicit install action.
          status: data.status === 'available' ? 'downloading' : data.status === 'error' ? 'error' : data.status,
          version: data.version,
          progress: data.percent,
          message: data.message,
        };
        setUpdateState(next);
        if (data.status === 'downloaded') {
          let dismissed = false;
          try {
            dismissed = Boolean(data.version && localStorage.getItem(`${DISMISSED_UPDATE_KEY}${data.version}`) === 'true');
          } catch {
            // Continue to show the update if storage isn't available.
          }
          setIsDismissed(dismissed);
        }
      });

      void window.electronAPI.updater.getAppVersion().then((currentVersion) => {
        if (!cancelled) setState((previous) => ({ ...previous, currentVersion }));
      }).catch(() => undefined);

      return () => {
        cancelled = true;
        if (autoCheckTimer !== undefined) {
          window.clearTimeout(autoCheckTimer);
          autoCheckStartedRef.current = false;
        }
        window.removeEventListener(DESKTOP_UPDATE_CHECK_EVENT, handleManualCheck);
        unsubscribe();
      };
    }

    return () => {
      cancelled = true;
      if (autoCheckTimer !== undefined) {
        window.clearTimeout(autoCheckTimer);
        autoCheckStartedRef.current = false;
      }
      window.removeEventListener(DESKTOP_UPDATE_CHECK_EVENT, handleManualCheck);
    };
  }, [checkForTauriUpdate, setUpdateState]);

  const handleInstall = async () => {
    try {
      chimePlayer.playChime('click');
    } catch {
      // Audio is optional.
    }

    if (updateRef.current) {
      const update = updateRef.current;
      setUpdateState({
        status: 'downloading',
        currentVersion: update.currentVersion,
        version: update.version,
        body: update.body,
        downloadedBytes: 0,
      });

      let downloadedBytes = 0;
      let contentLength = 0;
      try {
        await update.download((event) => {
          if (event.event === 'Started') {
            contentLength = event.data.contentLength ?? 0;
          } else if (event.event === 'Progress') {
            downloadedBytes += event.data.chunkLength;
            setUpdateState({
              status: 'downloading',
              currentVersion: update.currentVersion,
              version: update.version,
              body: update.body,
              downloadedBytes,
              progress: getDownloadPercent(downloadedBytes, contentLength),
            });
          }
        }, { timeout: 120_000 });

        setUpdateState({
          status: 'installing',
          currentVersion: update.currentVersion,
          version: update.version,
          body: update.body,
        });
        await update.install({ restartAfterInstall: true });
        if (!/Windows/i.test(navigator.userAgent)) {
          const { relaunch } = await import('@tauri-apps/plugin-process');
          await relaunch();
        }
      } catch (error) {
        setUpdateState({
          status: 'error',
          currentVersion: update.currentVersion,
          version: update.version,
          message: error instanceof Error ? error.message : undefined,
        });
      }
      return;
    }

    if (window.electronAPI?.updater) {
      try {
        await window.electronAPI.updater.restartAndInstall();
      } catch (error) {
        setUpdateState({
          status: 'error',
          message: error instanceof Error ? error.message : undefined,
        });
      }
    }
  };

  const handleLater = async () => {
    try {
      chimePlayer.playChime('click');
    } catch {
      // Audio is optional.
    }
    if (state.version) {
      try {
        localStorage.setItem(`${DISMISSED_UPDATE_KEY}${state.version}`, 'true');
      } catch {
        // Dismissal will still apply for the current session.
      }
    }
    if (updateRef.current) {
      await updateRef.current.close().catch(() => undefined);
      updateRef.current = null;
    }
    setIsDismissed(true);
  };

  const handleCheckAgain = () => {
    if ((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined) {
      void checkForTauriUpdate(true);
      return;
    }
    if (window.electronAPI?.updater) {
      setIsManualCheck(true);
      setIsDismissed(false);
      setUpdateState({ status: 'checking' });
      void window.electronAPI.updater.checkForUpdates().catch((error: unknown) => {
        setUpdateState({ status: 'error', message: error instanceof Error ? error.message : undefined });
      });
    }
  };

  const isTauriRuntime = (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;
  if (
    !isDesktopApplication() ||
    !shouldShowDesktopUpdateNotice(state.status, {
      dismissed: isDismissed,
      manualCheck: isManualCheck,
      isTauri: isTauriRuntime,
      hasUpdate: Boolean(updateRef.current),
    })
  ) return null;

  const title = state.status === 'available'
    ? (isAr ? 'تحديث جديد متاح' : isEn ? 'New update available' : 'Nouvelle mise à jour disponible')
    : state.status === 'downloading'
      ? (isAr ? 'جارٍ تنزيل التحديث' : isEn ? 'Downloading update' : 'Téléchargement de la mise à jour')
      : state.status === 'installing'
        ? (isAr ? 'جارٍ تثبيت التحديث' : isEn ? 'Installing update' : 'Installation de la mise à jour')
        : state.status === 'downloaded'
          ? t('desktop_update_title_ready')
          : state.status === 'checking'
            ? (isAr ? 'جارٍ التحقق من التحديثات' : isEn ? 'Checking for updates' : 'Recherche de mises à jour')
            : state.status === 'not-available'
              ? (isAr ? 'لا توجد تحديثات' : isEn ? 'No updates available' : 'Aucune mise à jour disponible')
              : (isAr ? 'تعذّر التحقق من التحديثات' : isEn ? 'Update check failed' : 'Échec de la vérification');

  const description = state.status === 'installing'
    ? (isAr ? 'سيُغلق التطبيق أثناء التثبيت ثم يُعاد تشغيله تلقائيًا.' : isEn ? 'The app will close during installation and restart automatically when it finishes.' : 'L’application se fermera pendant l’installation puis redémarrera automatiquement.')
    : state.status === 'downloading'
      ? state.progress !== undefined
        ? `${isAr ? 'تم التنزيل' : isEn ? 'Downloaded' : 'Téléchargé'} ${state.progress}%`
        : (state.downloadedBytes ?? 0) > 0
          ? `${isAr ? 'تم التنزيل' : isEn ? 'Downloaded' : 'Téléchargé'} ${((state.downloadedBytes ?? 0) / (1024 * 1024)).toFixed(1)} MB`
          : (isAr ? 'جارٍ تنزيل التحديث…' : isEn ? 'The update is downloading…' : 'Téléchargement de la mise à jour…')
      : state.status === 'available'
        ? (isAr ? 'راجع ملاحظات الإصدار، ثم نزّل التحديث وثبّته عندما يناسبك.' : isEn ? 'Review the release notes, then download and install when convenient.' : 'Consultez les notes, puis téléchargez et installez quand cela vous convient.')
        : state.message || (isAr ? 'يمكنك مواصلة استخدام التطبيق أثناء التحقق.' : isEn ? 'You can keep using the app while checking.' : 'Vous pouvez continuer à utiliser l’application pendant la vérification.');

  return (
    <section
      role="region"
      aria-live="polite"
      aria-label={isAr ? 'تحديث التطبيق' : isEn ? 'Application update' : 'Mise à jour de l’application'}
      className="relative z-30 mx-4 sm:mx-6 lg:mx-8 mt-3 rounded-2xl bg-gradient-to-r from-blue-950/95 via-indigo-950/90 to-slate-900/95 border border-indigo-500/35 text-white shadow-2xl overflow-hidden p-4 sm:p-5 transition-all duration-300 animate-in slide-in-from-top-3"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white p-0.5 shadow-md shadow-indigo-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950/80 rounded-[10px] flex items-center justify-center">
              {state.status === 'checking' || state.status === 'downloading' || state.status === 'installing' ? (
                <LoaderCircle className="w-5 h-5 text-indigo-300 animate-spin" />
              ) : state.status === 'error' ? (
                <AlertCircle className="w-5 h-5 text-amber-300" />
              ) : state.status === 'downloaded' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Download className="w-5 h-5 text-indigo-300" />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
              {state.version && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>v{state.version}</span>
                </span>
              )}
            </div>

            {state.currentVersion && state.version && (
              <p className="text-[11px] text-indigo-200/80 mb-1">
                {isAr ? 'الإصدار الحالي' : isEn ? 'Current version' : 'Version actuelle'}: v{state.currentVersion} · {isAr ? 'المتاح' : isEn ? 'Available' : 'Disponible'}: v{state.version}
              </p>
            )}
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{description}</p>

            {state.body && state.status === 'available' && (
              <div className="mt-2 max-h-24 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/30 p-2.5 text-xs text-slate-200 whitespace-pre-wrap">
                {state.body}
              </div>
            )}

            {state.status === 'downloading' && state.progress !== undefined && (
              <div className="mt-2.5 max-w-md">
                <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1 font-mono">
                  <span>{state.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-200" style={{ width: `${state.progress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
          {state.status === 'available' && (
            <>
              <button type="button" onClick={() => void handleLater()} className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                {isAr ? 'لاحقًا' : isEn ? 'Later' : 'Plus tard'}
              </button>
              <button type="button" onClick={() => void handleInstall()} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تنزيل وتثبيت' : isEn ? 'Download & Install' : 'Télécharger et installer'}</span>
              </button>
              <button type="button" onClick={handleCheckAgain} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" aria-label={isAr ? 'تحقق مجددًا' : isEn ? 'Check again' : 'Vérifier à nouveau'}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
          {state.status === 'downloaded' && (
            <button type="button" onClick={() => void handleInstall()} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة التشغيل والتحديث' : isEn ? 'Restart & Update' : 'Redémarrer et mettre à jour'}</span>
            </button>
          )}
          {state.status === 'error' && (
            <>
              <button type="button" onClick={handleCheckAgain} className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />{isAr ? 'حاول مجددًا' : isEn ? 'Try again' : 'Réessayer'}
              </button>
              <button type="button" onClick={() => setIsDismissed(true)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10" aria-label={isAr ? 'إغلاق' : isEn ? 'Dismiss' : 'Fermer'}><X className="w-4 h-4" /></button>
            </>
          )}
          {(state.status === 'checking' || state.status === 'downloading' || state.status === 'installing') && isManualCheck && (
            <button type="button" onClick={() => setIsDismissed(true)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10" aria-label={isAr ? 'إغلاق' : isEn ? 'Dismiss' : 'Fermer'}><X className="w-4 h-4" /></button>
          )}
          {state.status === 'not-available' && (
            <button type="button" onClick={() => setIsDismissed(true)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10" aria-label={isAr ? 'إغلاق' : isEn ? 'Dismiss' : 'Fermer'}><X className="w-4 h-4" /></button>
          )}
        </div>
      </div>
    </section>
  );
};
