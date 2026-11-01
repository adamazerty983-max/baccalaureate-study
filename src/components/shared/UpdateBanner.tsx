import React, { useEffect, useState, useTransition } from 'react';
import {
  Download,
  RefreshCw,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { AppLanguage } from '../../types';
import { getT } from '../../utils/i18n';
import { chimePlayer } from '../../utils/audio';
import { updateService } from '../../services/updateService';
import { UpdateState } from '../../services/updateStateMachine';
import { ReleaseNotesModal } from './ReleaseNotesModal';

interface UpdateBannerProps {
  language: AppLanguage;
  isFocusModeOpen?: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatRemainingSeconds(seconds?: number, remainingWord = 'remaining'): string {
  if (seconds === undefined || seconds < 0) return '';
  if (seconds < 60) return `${seconds}s ${remainingWord}`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s ${remainingWord}`;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  language,
  isFocusModeOpen = false,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const [, startTransition] = useTransition();

  const [updateState, setUpdateState] = useState<UpdateState>(() => updateService.getState());
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    updateService.setFocusMode(isFocusModeOpen);
  }, [isFocusModeOpen]);

  useEffect(() => {
    const unsubscribe = updateService.subscribe((next) => {
      startTransition(() => {
        setUpdateState(next);
        // Reset dismissed state on new state transitions
        if (next.status === 'downloaded' || next.status === 'available') {
          setIsDismissed(false);
        }
      });
    });
    return unsubscribe;
  }, []);

  const isVisible = !isDismissed && updateService.isBannerVisible();
  if (!isVisible) return null;

  const { status, version, percent, transferred, total, bytesPerSecond, estimatedSeconds, errorMessage } = updateState;
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

  const handleAction = async () => {
    try {
      chimePlayer.playChime('click');
    } catch {
      // Audio is optional
    }

    if (status === 'downloaded' || (status === 'available' && !isElectron)) {
      await updateService.restartOrRefresh();
    } else if (status === 'available' && isElectron) {
      await updateService.checkForUpdates(true);
    } else if (status === 'error') {
      await updateService.checkForUpdates(true);
    }
  };

  const handleLater = () => {
    try {
      chimePlayer.playChime('click');
    } catch {
      // Audio is optional
    }
    updateService.snooze();
    setIsDismissed(true);
  };

  const handleClose = () => {
    setIsDismissed(true);
    if (status === 'up-to-date' || status === 'error') {
      updateService.reset();
    }
  };

  const remainingText = formatRemainingSeconds(estimatedSeconds, t('desktop_update_eta_remaining'));
  const progressRatio = Math.min(1, Math.max(0, (percent ?? 0) / 100));

  return (
    <>
      <aside
        role="status"
        aria-live="polite"
        dir={isAr ? 'rtl' : 'ltr'}
        className="fixed bottom-4 inset-inline-end-4 z-40 max-w-md w-[calc(100vw-2rem)] bg-white dark:bg-[#121927] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-black/20 p-4 animate-in fade-in slide-in-from-bottom-2 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Status Icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/10 text-teal-600 dark:text-teal-400">
              {status === 'checking' && <RefreshCw className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400" />}
              {status === 'downloading' && <Download className="w-4 h-4 animate-bounce text-teal-600 dark:text-teal-400" />}
              {status === 'downloaded' && <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
              {status === 'available' && <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
              {status === 'up-to-date' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
            </div>

            {/* Status text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {status === 'checking' && (isAr ? 'جارٍ التحقق من التحديثات…' : isEn ? 'Checking for updates…' : 'Recherche de mises à jour…')}
                  {status === 'available' && t('desktop_update_title_available')}
                  {status === 'downloading' && (isAr ? `جارٍ تحميل الإصدار ${version || ''}…` : isEn ? `Downloading version ${version || ''}…` : `Téléchargement de la version ${version || ''}…`)}
                  {status === 'downloaded' && t('desktop_update_title_ready')}
                  {status === 'up-to-date' && (isAr ? 'التطبيق محدّث إلى آخر إصدار' : isEn ? 'The app is up to date' : 'L’application est à jour')}
                  {status === 'error' && (isAr ? 'تعذّر التحقق من التحديثات' : isEn ? 'Could not check for updates' : 'Vérification impossible')}
                </h3>
                {version && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                    v{version}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {status === 'downloading' && (
                  <span>
                    {percent !== undefined && <strong className="text-slate-800 dark:text-slate-200 font-bold">{percent}%</strong>}
                    {total && transferred ? ` • ${formatBytes(transferred)} / ${formatBytes(total)}` : ''}
                    {remainingText ? ` • ${remainingText}` : ''}
                  </span>
                )}
                {status === 'downloaded' && t('desktop_update_desc_ready', { v: version || '' })}
                {status === 'available' && (isAr ? 'تحديث جديد متاح للتحميل والتثبيت.' : isEn ? 'A new version is ready to be installed.' : 'Une nouvelle version est disponible.')}
                {status === 'up-to-date' && (isAr ? 'أنت تستخدم أحدث إصدار متوفر.' : isEn ? 'You are running the latest release.' : 'Vous utilisez la dernière version disponible.')}
                {status === 'error' && (errorMessage || (isAr ? 'يرجى التحقق من اتصالك بالإنترنت.' : isEn ? 'Please check your internet connection.' : 'Veuillez vérifier votre connexion internet.'))}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            aria-label={isAr ? 'إغلاق' : isEn ? 'Close' : 'Fermer'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress bar strictly animated via transform: scaleX (no layout thrashing, GPU accelerated) */}
        {status === 'downloading' && (
          <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full will-change-transform"
              style={{
                transform: `scaleX(${progressRatio})`,
                transformOrigin: isAr ? 'right' : 'left',
                transition: 'transform 150ms ease-out',
              }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          {updateState.releaseNotes ? (
            <button
              type="button"
              onClick={() => setIsNotesModalOpen(true)}
              className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>{t('desktop_update_btn_whats_new')}</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            {status === 'downloaded' && (
              <button
                type="button"
                onClick={handleLater}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('desktop_update_btn_later')}
              </button>
            )}

            {(status === 'downloaded' || status === 'available' || status === 'error') && (
              <button
                type="button"
                onClick={handleAction}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm shadow-teal-600/20 transition-colors flex items-center gap-1.5"
              >
                {status === 'downloaded' && (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isElectron ? t('desktop_update_btn_restart') : t('desktop_update_btn_refresh')}</span>
                  </>
                )}
                {status === 'available' && (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isElectron ? t('desktop_update_title_available') : t('desktop_update_btn_refresh')}</span>
                  </>
                )}
                {status === 'error' && (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('desktop_update_btn_retry')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Release Notes Modal */}
      <ReleaseNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        version={version}
        releaseNotes={updateState.releaseNotes}
        language={language}
      />
    </>
  );
};
