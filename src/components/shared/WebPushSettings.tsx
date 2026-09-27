/**
 * Web Push Integration Component
 *
 * Displays Web Push subscription status and allows users to:
 * 1. Enable/disable background push notifications
 * 2. See current subscription status
 * 3. Test push notifications
 * 4. View scheduled notifications
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle, Send, Clock } from 'lucide-react';
import { webPushService } from '../../services/webPushService';
import { AppLanguage } from '../../types';
import { getT } from '../../utils/i18n';

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

  const [status, setStatus] = useState({
    supported: false,
    permission: 'default' as NotificationPermission,
    subscribed: false,
  });
  const [loading, setLoading] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    initializeStatus();
  }, [userId]);

  const initializeStatus = async () => {
    await webPushService.init(userId);
    const currentStatus = webPushService.getSubscriptionStatus();
    setStatus(currentStatus);

    if (currentStatus.subscribed) {
      const scheduled = await webPushService.getScheduledNotifications();
      setScheduledCount(scheduled.length);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const success = await webPushService.subscribe();
      if (success) {
        setStatus(webPushService.getSubscriptionStatus());
        const scheduled = await webPushService.getScheduledNotifications();
        setScheduledCount(scheduled.length);
      }
    } catch (err) {
      console.error('Failed to subscribe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const success = await webPushService.unsubscribe();
      if (success) {
        setStatus(webPushService.getSubscriptionStatus());
        setScheduledCount(0);
      }
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPush = async () => {
    if (onTestNotification) {
      onTestNotification();
    }
  };

  if (!status.supported) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-400 mb-1">
              {isAr ? 'الإشعارات الخلفية غير مدعومة' : 'Notifications en arrière-plan non supportées'}
            </h3>
            <p className="text-sm text-red-300/80">
              {isAr
                ? 'متصفحك لا يدعم إشعارات الدفع. جرب Chrome أو Firefox أو Edge.'
                : 'Votre navigateur ne supporte pas les notifications push. Essayez Chrome, Firefox ou Edge.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            {status.subscribed ? (
              <Bell className="w-5 h-5 text-green-400" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            {isAr ? 'الإشعارات الخلفية' : 'Notifications en arrière-plan'}
          </h3>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              status.subscribed
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {status.subscribed
              ? isAr
                ? 'مفعّل'
                : 'Activé'
              : isAr
                ? 'غير مفعّل'
                : 'Désactivé'}
          </div>
        </div>

        <p className="text-sm text-white/60 mb-4">
          {isAr
            ? 'استقبل إشعارات حتى عندما يكون التطبيق مغلقاً بالكامل. تتطلب خادم خلفي للعمل.'
            : 'Recevez des notifications même lorsque l\'app est totalement fermée. Nécessite un serveur backend.'}
        </p>

        {/* Permission Status */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <div
            className={`w-2 h-2 rounded-full ${
              status.permission === 'granted'
                ? 'bg-green-400'
                : status.permission === 'denied'
                  ? 'bg-red-400'
                  : 'bg-yellow-400'
            }`}
          />
          <span className="text-white/70">
            {isAr ? 'حالة الإذن:' : 'Autorisation :'}{' '}
            <span className="text-white font-medium">
              {status.permission === 'granted'
                ? isAr
                  ? 'ممنوح'
                  : 'Accordée'
                : status.permission === 'denied'
                  ? isAr
                    ? 'مرفوض'
                    : 'Refusée'
                  : isAr
                    ? 'غير محدد'
                    : 'Non définie'}
            </span>
          </span>
        </div>

        {/* Scheduled Notifications Count */}
        {status.subscribed && (
          <div className="flex items-center gap-2 text-sm mb-4">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-white/70">
              {isAr ? 'إشعارات مجدولة:' : 'Notifications planifiées :'}{' '}
              <span className="text-white font-medium">{scheduledCount}</span>
            </span>
          </div>
        )}

        {/* Subscribe/Unsubscribe Button */}
        <div className="flex gap-2">
          {!status.subscribed ? (
            <button
              onClick={handleSubscribe}
              disabled={loading || status.permission === 'denied'}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Bell className="w-4 h-4" />
              {loading
                ? '...'
                : isAr
                  ? 'تفعيل الإشعارات الخلفية'
                  : 'Activer les notifications'}
            </button>
          ) : (
            <>
              <button
                onClick={handleTestPush}
                className="flex-1 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                {isAr ? 'اختبار' : 'Tester'}
              </button>
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition-all"
              >
                <BellOff className="w-4 h-4" />
                {loading ? '...' : isAr ? 'إلغاء التفعيل' : 'Désactiver'}
              </button>
            </>
          )}
        </div>

        {/* Denied Permission Warning */}
        {status.permission === 'denied' && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-300">
              {isAr
                ? 'تم رفض إذن الإشعارات. يُرجى تفعيله من إعدادات المتصفح.'
                : 'Permission de notification refusée. Veuillez l\'activer dans les paramètres du navigateur.'}
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300/90">
            <p className="font-semibold mb-2">
              {isAr ? 'متطلبات الاستضافة:' : 'Exigences d\'hébergement :'}
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-300/80">
              <li>
                {isAr
                  ? 'يتطلب خادم خلفي دائم العمل (Render.com، Railway، Fly.io)'
                  : 'Nécessite un serveur backend persistant (Render.com, Railway, Fly.io)'}
              </li>
              <li>
                {isAr
                  ? 'لا يعمل على استضافة ثابتة مثل GitHub Pages'
                  : 'Ne fonctionne pas sur hébergement statique comme GitHub Pages'}
              </li>
              <li>
                {isAr
                  ? 'يتم إرسال الإشعارات من الخادم حتى عند إغلاق التطبيق'
                  : 'Les notifications sont envoyées depuis le serveur même app fermée'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
