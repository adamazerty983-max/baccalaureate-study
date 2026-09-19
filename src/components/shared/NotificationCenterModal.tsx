import React from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  CheckSquare,
  Award,
  BookOpen,
  Brain,
  Target,
  Flame,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { AppLanguage, InAppNotification, MainTabType } from '../../types';
import { getT } from '../../utils/i18n';
import { chimePlayer } from '../../utils/audio';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  language: AppLanguage;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNavigateTab: (tab: MainTabType) => void;
}

const TYPE_CONFIG: Record<
  InAppNotification['type'],
  { icon: React.ComponentType<{ className?: string }>; color: string; border: string; bg: string }
> = {
  tasks: {
    icon: CheckSquare,
    color: 'text-teal-500 dark:text-teal-400',
    border: 'border-teal-500/30',
    bg: 'bg-teal-500/10',
  },
  quizzes: {
    icon: Award,
    color: 'text-amber-500 dark:text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  homework: {
    icon: BookOpen,
    color: 'text-indigo-500 dark:text-indigo-400',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
  },
  lessons: {
    icon: Brain,
    color: 'text-purple-500 dark:text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
  },
  goals: {
    icon: Target,
    color: 'text-emerald-500 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  habits: {
    icon: Flame,
    color: 'text-orange-500 dark:text-orange-400',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
  },
  system: {
    icon: Info,
    color: 'text-sky-500 dark:text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
};

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  language,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigateTab,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatRelativeTime = (timestamp: string): string => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
      if (diffSec < 60) {
        return isAr ? 'الآن' : language === 'en' ? 'Just now' : 'À l’instant';
      }
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) {
        return isAr
          ? `منذ ${diffMin} د`
          : language === 'en'
            ? `${diffMin}m ago`
            : `Il y a ${diffMin} min`;
      }
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) {
        return isAr
          ? `منذ ${diffHour} س`
          : language === 'en'
            ? `${diffHour}h ago`
            : `Il y a ${diffHour} h`;
      }
      const diffDays = Math.floor(diffHour / 24);
      return isAr
        ? `منذ ${diffDays} ي`
        : language === 'en'
          ? `${diffDays}d ago`
          : `Il y a ${diffDays} j`;
    } catch {
      return '';
    }
  };

  const handleItemClick = (notification: InAppNotification) => {
    chimePlayer.playChime('click');
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onNavigateTab(notification.tab);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-heading"
    >
      <div
        className={`w-full sm:max-w-md h-full sm:h-auto sm:max-h-[85vh] sm:rounded-2xl bg-white dark:bg-[#1A2535] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isAr ? 'sm:mr-auto sm:ml-0' : 'sm:ml-auto sm:mr-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip (matching Toast.tsx) */}
        <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="notification-center-heading"
                className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"
              >
                <span>{t('notif_center_title')}</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500 text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                {notifications.length}{' '}
                {isAr ? 'تنبيه مسجل' : language === 'en' ? 'alerts recorded' : 'alertes enregistrées'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  chimePlayer.playChime('click');
                  onMarkAllAsRead();
                }}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                title={t('notif_center_mark_all_read')}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">{t('notif_center_mark_all_read')}</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  chimePlayer.playChime('click');
                  onClearAll();
                }}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center justify-center cursor-pointer"
                title={t('notif_center_clear')}
                aria-label={t('notif_center_clear')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                chimePlayer.playChime('modal_close');
                onClose();
              }}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 min-h-[220px] max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 stroke-[1.5] opacity-60" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('notif_center_empty')}
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                {isAr
                  ? 'ستظهر هنا تذكيراتك بمواعيد الفروض والواجبات والمراجعة التكرارية.'
                  : language === 'en'
                    ? 'Your upcoming exam deadlines, homework, and review alerts will appear here.'
                    : 'Vos alertes d’examens, devoirs et sessions de révision apparaîtront ici.'}
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;
              const Icon = cfg.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-4 flex items-start gap-3.5 transition-all cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !item.read ? 'bg-teal-50/30 dark:bg-teal-950/20' : ''
                  }`}
                >
                  {/* Icon badge */}
                  <div
                    className={`w-9 h-9 rounded-xl ${cfg.bg} ${cfg.color} border ${cfg.border} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3
                        className={`text-xs font-bold truncate ${
                          !item.read
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400 font-mono">
                        <Clock className="w-2.5 h-2.5 opacity-60" />
                        <span>{formatRelativeTime(item.timestamp)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/50 dark:border-slate-800/40">
                      <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 group-hover:underline flex items-center gap-1">
                        <span>
                          {isAr
                            ? 'عرض التفاصيل'
                            : language === 'en'
                              ? 'View details'
                              : 'Voir les détails'}
                        </span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>

                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-teal-500 ring-4 ring-teal-500/20 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
