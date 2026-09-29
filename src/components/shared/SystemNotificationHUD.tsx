import React, { useEffect, useState, useRef } from 'react';
import {
  CalendarDays,
  BookOpen,
  Award,
  CheckSquare,
  Brain,
  Flame,
  BellRing,
  X,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AppLanguage, InAppNotification, MainTabType } from '../../types';
import { getT } from '../../utils/i18n';
import { chimePlayer } from '../../utils/audio';

interface SystemNotificationHUDProps {
  queue: InAppNotification[];
  language: AppLanguage;
  onDismiss: (id: string) => void;
  onNavigate: (tab: MainTabType, itemId?: string) => void;
}

const CATEGORY_STYLES: Record<
  InAppNotification['type'],
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    borderGlow: string;
    badgeBg: string;
    badgeText: string;
    progressBar: string;
  }
> = {
  timeblocking: {
    icon: CalendarDays,
    accentColor: 'text-cyan-400',
    borderGlow: 'border-cyan-500/40 shadow-cyan-500/20',
    badgeBg: 'bg-cyan-500/20 border-cyan-400/30',
    badgeText: 'text-cyan-300',
    progressBar: 'bg-gradient-to-r from-cyan-400 to-teal-400',
  },
  homework: {
    icon: BookOpen,
    accentColor: 'text-amber-400',
    borderGlow: 'border-amber-500/40 shadow-amber-500/20',
    badgeBg: 'bg-amber-500/20 border-amber-400/30',
    badgeText: 'text-amber-300',
    progressBar: 'bg-gradient-to-r from-amber-400 to-orange-400',
  },
  quizzes: {
    icon: Award,
    accentColor: 'text-rose-400',
    borderGlow: 'border-rose-500/40 shadow-rose-500/20',
    badgeBg: 'bg-rose-500/20 border-rose-400/30',
    badgeText: 'text-rose-300',
    progressBar: 'bg-gradient-to-r from-rose-500 to-red-400',
  },
  tasks: {
    icon: CheckSquare,
    accentColor: 'text-teal-400',
    borderGlow: 'border-teal-500/40 shadow-teal-500/20',
    badgeBg: 'bg-teal-500/20 border-teal-400/30',
    badgeText: 'text-teal-300',
    progressBar: 'bg-gradient-to-r from-teal-400 to-emerald-400',
  },
  lessons: {
    icon: Brain,
    accentColor: 'text-purple-400',
    borderGlow: 'border-purple-500/40 shadow-purple-500/20',
    badgeBg: 'bg-purple-500/20 border-purple-400/30',
    badgeText: 'text-purple-300',
    progressBar: 'bg-gradient-to-r from-purple-400 to-pink-400',
  },
  habits: {
    icon: Flame,
    accentColor: 'text-orange-400',
    borderGlow: 'border-orange-500/40 shadow-orange-500/20',
    badgeBg: 'bg-orange-500/20 border-orange-400/30',
    badgeText: 'text-orange-300',
    progressBar: 'bg-gradient-to-r from-orange-400 to-amber-400',
  },
  goals: {
    icon: Sparkles,
    accentColor: 'text-emerald-400',
    borderGlow: 'border-emerald-500/40 shadow-emerald-500/20',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/30',
    badgeText: 'text-emerald-300',
    progressBar: 'bg-gradient-to-r from-emerald-400 to-teal-400',
  },
  system: {
    icon: BellRing,
    accentColor: 'text-sky-400',
    borderGlow: 'border-sky-500/40 shadow-sky-500/20',
    badgeBg: 'bg-sky-500/20 border-sky-400/30',
    badgeText: 'text-sky-300',
    progressBar: 'bg-gradient-to-r from-sky-400 to-indigo-400',
  },
};

const DISPLAY_DURATION_MS = 7500;

export const SystemNotificationHUD: React.FC<SystemNotificationHUDProps> = ({
  queue,
  language,
  onDismiss,
  onNavigate,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  const activeNotification = queue[currentIndex] || queue[0];
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);

  // Reset or adjust index when queue changes
  useEffect(() => {
    if (currentIndex >= queue.length && queue.length > 0) {
      setCurrentIndex(queue.length - 1);
    }
  }, [queue.length, currentIndex]);

  // Main countdown and auto-dismiss lifecycle
  useEffect(() => {
    if (!activeNotification) return;

    setIsExiting(false);
    setProgress(100);
    elapsedBeforePauseRef.current = 0;
    startTimeRef.current = Date.now();

    const updateInterval = 40; // ~25 FPS
    const timer = window.setInterval(() => {
      if (isPaused) {
        startTimeRef.current = Date.now() - elapsedBeforePauseRef.current;
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      elapsedBeforePauseRef.current = elapsed;
      const remainingRatio = Math.max(0, 1 - elapsed / DISPLAY_DURATION_MS);
      setProgress(remainingRatio * 100);

      if (elapsed >= DISPLAY_DURATION_MS) {
        clearInterval(timer);
        handleDismissCurrent();
      }
    }, updateInterval);

    timerRef.current = timer;

    return () => {
      clearInterval(timer);
    };
  }, [activeNotification?.id, isPaused]);

  if (!activeNotification) return null;

  const style = CATEGORY_STYLES[activeNotification.type] || CATEGORY_STYLES.system;
  const CategoryIcon = style.icon;

  const handleDismissCurrent = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(activeNotification.id);
      setIsExiting(false);
      setProgress(100);
    }, 240);
  };

  const handleActionClick = () => {
    chimePlayer.playChime('click');
    onNavigate(activeNotification.tab, activeNotification.itemId);
    handleDismissCurrent();
  };

  const getCategoryLabel = (type: InAppNotification['type']) => {
    switch (type) {
      case 'timeblocking':
        return t('notif_category_timeblocking');
      case 'homework':
        return t('notif_category_homework');
      case 'quizzes':
        return t('notif_category_quizzes');
      case 'tasks':
        return t('notif_category_tasks');
      case 'lessons':
        return t('notif_category_lessons');
      case 'habits':
        return t('notif_category_habits');
      case 'goals':
        return t('notif_category_goals');
      case 'system':
      default:
        return t('notif_category_system');
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      dir={isAr ? 'rtl' : 'ltr'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[420px] sm:max-w-lg pointer-events-auto transition-all duration-300 ease-out ${
        isExiting
          ? '-translate-y-6 opacity-0 scale-95'
          : 'translate-y-0 opacity-100 scale-100 animate-in slide-in-from-top-4'
      }`}
    >
      {/* Dynamic Island / System HUD Outer Pill Shell */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-[#0B1523]/96 backdrop-blur-2xl border ${style.borderGlow} text-white shadow-2xl transition-all duration-300`}
      >
        {/* Subtle Ambient Glow Effect Behind Banner */}
        <div
          className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40 ${style.badgeBg}`}
        />

        {/* Content Container */}
        <div className="p-4 sm:p-4.5">
          {/* Header Row: Category Badge + Timing Pill + Queue indicator + Close Button */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${style.badgeBg} ${style.badgeText} tracking-tight`}
              >
                <CategoryIcon className="w-3.5 h-3.5" />
                <span className="truncate">{getCategoryLabel(activeNotification.type)}</span>
              </span>

              {activeNotification.badge && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/90 border border-white/15">
                  <Clock className="w-3 h-3 text-white/70" />
                  <span>{activeNotification.badge}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {queue.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/80 border border-white/10">
                  +{queue.length - 1}
                </span>
              )}

              <button
                type="button"
                onClick={handleDismissCurrent}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={t('notif_hud_dismiss')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Body: Icon + Title & Description + Quick Navigate Button */}
          <div
            className="flex items-start gap-3 cursor-pointer group"
            onClick={handleActionClick}
          >
            <div
              className={`w-10 h-10 rounded-xl p-0.5 shrink-0 flex items-center justify-center bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 shadow-inner group-hover:scale-105 transition-transform`}
            >
              <div
                className={`w-full h-full rounded-[10px] bg-[#121E2F] flex items-center justify-center ${style.accentColor}`}
              >
                <CategoryIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors leading-snug line-clamp-1">
                {activeNotification.title}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
                {activeNotification.message}
              </p>
            </div>

            {/* Direct Open Action Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleActionClick();
              }}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 transition-all cursor-pointer shrink-0 self-center"
            >
              <span>{t('notif_hud_open')}</span>
              {isAr ? (
                <ExternalLink className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Progress Countdown Bar */}
        <div className="h-1 w-full bg-white/5 overflow-hidden">
          <div
            className={`h-full ${style.progressBar} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
