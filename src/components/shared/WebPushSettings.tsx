/**
 * Web Push & Background Notification Settings Component
 *
 * Displays notification capability and allows users to:
 * 1. Enable/disable system and background push reminders
 * 2. View live permission status (granted, denied, default)
 * 3. Send immediate test notification (HUD banner + chime + system toast)
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { webPushService } from '../../services/webPushService';
import { AppLanguage } from '../../types';
import { getT } from '../../utils/i18n';
import { chimePlayer } from '../../utils/audio';

interface WebPushSettingsProps {
  language: AppLanguage;
  userId: string;
  onTestNotification?: () => void;
}

export const WebPushSettings: React.FC<WebPushSettingsProps> = ({
  language,
  userId,
  onTestNotification,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  const [status, setStatus] = useState(() => webPushService.getSubscriptionStatus());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeStatus();
  }, [userId]);

  const initializeStatus = async () => {
    await webPushService.init(userId);
    setStatus(webPushService.getSubscriptionStatus());
  };

  const handleSubscribe = async () => {
    setLoading(true);
    chimePlayer.playChime('click');
    try {
      const success = await webPushService.subscribe();
      const updatedStatus = webPushService.getSubscriptionStatus();
      setStatus(updatedStatus);

      if (success || updatedStatus.permission === 'granted') {
        chimePlayer.playChime('toast_success');
        // Immediately trigger test notification so user has instant visual confirmation!
        if (onTestNotification) {
          onTestNotification();
        }
      } else if (updatedStatus.permission === 'denied') {
        chimePlayer.playChime('toast_error');
      }
    } catch (err) {
      console.error('Failed to subscribe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    chimePlayer.playChime('click');
    try {
      await webPushService.unsubscribe();
      setStatus(webPushService.getSubscriptionStatus());
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPush = () => {
    chimePlayer.playChime('click');
    if (onTestNotification) {
      onTestNotification();
    }
  };

  if (!status.supported) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-amber-400 mb-1">
              {isAr ? 'الإشعارات غير مدعومة في هذا المتصفح' : 'Notifications non supportées par ce navigateur'}
            </h3>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              {isAr
                ? 'متصفحك الحالي لا يدعم إشعارات الويب. يرجى استخدام Google Chrome أو Microsoft Edge أو Mozilla Firefox.'
                : 'Votre navigateur ne supporte pas les notifications standards. Essayez Chrome, Edge ou Firefox.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isGranted = status.permission === 'granted';
  const isDenied = status.permission === 'denied';
  const isActive = status.subscribed && isGranted;

  return (
    <div className="space-y-3.5">
      {/* Current Status Box */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {isActive ? (
                <Bell className="w-4 h-4 text-emerald-500" />
              ) : (
                <BellOff className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {isAr ? 'الإشعارات وتنبيهات الخلفية' : 'Notifications et alertes d’arrière-plan'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'استقبل تنبيهات سطح المكتب وجلسات المذاكرة والفروض والاختبارات.'
                  : 'Recevez des alertes pour vos séances, devoirs et examens.'}
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
            }`}
          >
            {isActive
              ? isAr
                ? 'مفعّل ✓'
                : 'Activé ✓'
              : isAr
                ? 'غير مفعّل'
                : 'Désactivé'}
          </span>
        </div>

        {/* Permission Indicator */}
        <div className="flex items-center gap-2 text-xs mb-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <span
            className={`w-2 h-2 rounded-full ${
              isGranted
                ? 'bg-emerald-500'
                : isDenied
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-500 dark:text-slate-400">
            {isAr ? 'حالة إذن المتصفح:' : 'Autorisation du navigateur :'}{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {isGranted
                ? isAr
                  ? 'ممنوح ومسموح به ✓'
                  : 'Accordée ✓'
                : isDenied
                  ? isAr
                    ? 'مرفوض / محظور'
                    : 'Refusée'
                  : isAr
                    ? 'في انتظار الإذن'
                    : 'En attente d’autorisation'}
            </strong>
          </span>
        </div>

        {/* Main Action Buttons */}
        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Bell className="w-4 h-4" />
              <span>
                {loading
                  ? '...'
                  : isDenied
                    ? isAr
                      ? 'إعادة طلب الإذن'
                      : 'Réautoriser les notifications'
                    : isAr
                      ? 'تفعيل التنبيهات والإشعارات'
                      : 'Activer les notifications'}
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleTestPush}
                className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-98 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4 text-teal-500" />
                <span>{isAr ? 'تجربة إشعار فوري (Test)' : 'Tester l’alerte'}</span>
              </button>
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/30 transition-all cursor-pointer"
              >
                <BellOff className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Denied Warning Banner */}
        {isDenied && (
          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed">
              {isAr
                ? 'تم حظر الإشعارات في متصفحك. يُرجى النقر على أيقونة القفل (🔒) بجانب شريط العنوان في الأعلى واختيار "السماح بالإشعارات".'
                : 'Les notifications sont bloquées dans votre navigateur. Cliquez sur l’icône de cadenas (🔒) à gauche de l’URL pour autoriser les notifications.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
