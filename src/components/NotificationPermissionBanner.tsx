import React, { useState, useEffect } from 'react';
import { BellRing, X, Sparkles, ShieldCheck } from 'lucide-react';
import { AppLanguage } from '../types';
import { getT } from '../utils/i18n';
import { notificationService } from '../services/notificationService';
import { chimePlayer } from '../utils/audio';

interface NotificationPermissionBannerProps {
  language: AppLanguage;
  onPermissionChanged?: (permission: NotificationPermission) => void;
}

const STORAGE_BANNER_KEY = 'bac_notif_banner_dismissed_v1';

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  language,
  onPermissionChanged,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Only display if browser supports notifications and permission is in default (unprompted) state
    if (typeof window === 'undefined') return;
    if (!notificationService.isSupported()) return;

    try {
      const dismissed = localStorage.getItem(STORAGE_BANNER_KEY);
      if (dismissed === 'true') return;

      if (Notification.permission === 'default') {
        setIsVisible(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    chimePlayer.playChime('click');
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_BANNER_KEY, 'true');
    } catch {}
  };

  const handleEnable = async () => {
    chimePlayer.playChime('click');
    setIsRequesting(true);
    try {
      const perm = await notificationService.requestPermission();
      if (onPermissionChanged) {
        onPermissionChanged(perm);
      }
      if (perm === 'granted') {
        chimePlayer.playChime('toast_success');
      }
    } catch (err) {
      console.warn('Failed to enable notifications:', err);
    } finally {
      setIsRequesting(false);
      setIsVisible(false);
      try {
        localStorage.setItem(STORAGE_BANNER_KEY, 'true');
      } catch {}
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label={t('notif_banner_title')}
      className="relative z-20 mx-4 sm:mx-6 lg:mx-8 mt-3 rounded-2xl bg-gradient-to-r from-teal-900/90 via-[#132233] to-[#1A2535] border border-teal-500/30 text-white shadow-xl overflow-hidden p-4 sm:p-5 transition-all duration-300 animate-in slide-in-from-top-3"
    >
      {/* Decorative ambient glow */}
      <div className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-teal-500/20 blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white p-0.5 shadow-md shadow-teal-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#132233]/70 rounded-[10px] flex items-center justify-center backdrop-blur-xs">
              <BellRing className="w-5 h-5 text-teal-300 animate-bounce" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {t('notif_banner_title')}
              </h3>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                <span>{isAr ? 'تنبيهات ذكية' : 'Alertes Intelligentes'}</span>
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              {t('notif_banner_desc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {t('notif_banner_later')}
          </button>

          <button
            type="button"
            onClick={handleEnable}
            disabled={isRequesting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-md shadow-teal-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isRequesting ? '...' : t('notif_banner_enable')}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer sm:hidden"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
