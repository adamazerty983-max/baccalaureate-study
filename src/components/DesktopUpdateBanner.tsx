import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle2, Sparkles, X } from 'lucide-react';
import { AppLanguage } from '../types';
import { getT } from '../utils/i18n';
import { chimePlayer } from '../utils/audio';

interface DesktopUpdateBannerProps {
  language: AppLanguage;
}

export const DesktopUpdateBanner: React.FC<DesktopUpdateBannerProps> = ({ language }) => {
  const t = getT(language);
  const isAr = language === 'ar';

  const [status, setStatus] = useState<string>('idle');
  const [version, setVersion] = useState<string>('');
  const [percent, setPercent] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.isElectron || !window.electronAPI.updater) {
      return;
    }

    const unsubscribe = window.electronAPI.updater.onStatusChange((data) => {
      if (data.status) {
        setStatus(data.status);
      }
      if (data.version) {
        setVersion(data.version);
      }
      if (typeof data.percent === 'number') {
        setPercent(data.percent);
      }

      // If an update has finished downloading, un-dismiss so user can choose to restart
      if (data.status === 'downloaded') {
        setIsDismissed(false);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleRestart = async () => {
    if (!window.electronAPI?.updater) return;
    try {
      chimePlayer.playChime('click');
    } catch {}
    setIsRestarting(true);
    try {
      await window.electronAPI.updater.restartAndInstall();
    } catch (err) {
      console.error('Failed to quit and install update:', err);
      setIsRestarting(false);
    }
  };

  const handleDismiss = () => {
    try {
      chimePlayer.playChime('click');
    } catch {}
    setIsDismissed(true);
  };

  // Only render during 'downloading' or 'downloaded' states if not dismissed
  if (isDismissed || (status !== 'downloading' && status !== 'downloaded')) {
    return null;
  }

  return (
    <div
      role="region"
      aria-live="polite"
      className="relative z-30 mx-4 sm:mx-6 lg:mx-8 mt-3 rounded-2xl bg-gradient-to-r from-blue-950/95 via-indigo-950/90 to-slate-900/95 border border-indigo-500/35 text-white shadow-2xl overflow-hidden p-4 sm:p-5 transition-all duration-300 animate-in slide-in-from-top-3"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Ambient background glow */}
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left icon and message */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white p-0.5 shadow-md shadow-indigo-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950/70 rounded-[10px] flex items-center justify-center backdrop-blur-xs">
              {status === 'downloaded' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
              ) : (
                <Download className="w-5 h-5 text-indigo-300 animate-bounce" />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {status === 'downloaded'
                  ? t('desktop_update_title_ready')
                  : t('desktop_update_title_available')}
              </h3>

              {version && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>v{version}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              {status === 'downloaded'
                ? t('desktop_update_desc_ready').replace('{v}', version ? `v${version}` : '')
                : t('desktop_update_downloading').replace('{v}', version ? `v${version}` : '')}
            </p>

            {/* Progress bar during download */}
            {status === 'downloading' && (
              <div className="mt-2.5 max-w-md">
                <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1 font-mono">
                  <span>{percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(Math.max(percent, 2), 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {status === 'downloaded' ? (
            <>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {t('desktop_update_btn_later')}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                disabled={isRestarting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
                <span>{isRestarting ? '...' : t('desktop_update_btn_restart')}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
