import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  Flame,
  Sparkles,
  RefreshCw,
  Calculator,
  Target,
  Edit2,
  X,
  CheckSquare,
  Plus,
  Trash2,
  CalendarClock,
  Brain,
  Compass,
  ChevronRight,
} from 'lucide-react';
import { AppLanguage, FullAppData, HomeworkItem, QuizItem, TaskItem } from '../types';
import { BAC_SUBJECTS } from '../utils/constants';
import { StreakFlameCanvas } from './StreakFlameCanvas';
import { DuolingoStreakFlame } from './DuolingoStreakFlame';
import { ProgressRing } from './ProgressRing';
import { CalendarHeatmap } from './CalendarHeatmap';
import { chimePlayer } from '../utils/audio';
import { getT } from '../utils/i18n';
import { calculateDailyStreak, getLocalDateStr, getWeekDaysStreakStatus } from '../utils/streak';

interface DashboardProps {
  appData: FullAppData;
  language: AppLanguage;
  onNavigateTab: (tabId: string) => void;
  onToggleHomework: (id: string) => void;
  onToggleTaskComplete?: (id: string) => void;
  onAddTask?: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  onDeleteTask?: (id: string) => void;
  onUpdateBacDate: (newDate: string, newStartDate?: string) => void;
}

// Motivational Quotes by period
const QUOTES_POOL = {
  morning: [
    { text: 'النجاح لا يأتي بالصدفة، بل هو ثمرة الانضباط الصباحي والعمل الجاد المستمر.', author: 'حكمة اليوم', lang: 'ar' },
    { text: 'Chaque matin est une nouvelle chance d’avancer d’un pas vers l’excellence au Bac.', author: 'Discipline', lang: 'fr' },
    { text: 'Early mornings and quiet hours build extraordinary academic triumphs.', author: 'Focus', lang: 'en' },
  ],
  afternoon: [
    { text: 'لا تستسلم في منتصف الطريق، فالإصرار هو الفارق بين العادي والمتميز.', author: 'العزيمة', lang: 'ar' },
    { text: 'La constance bat le talent lorsque le talent ne s’exerce pas constamment.', author: 'Régularité', lang: 'fr' },
    { text: 'Small consistent efforts compounded daily produce massive exam success.', author: 'Consistency', lang: 'en' },
  ],
  evening: [
    { text: 'حصاد التعب نجاح، ولذة التفوق تنسيك كل سهر وبذل.', author: 'الطموح', lang: 'ar' },
    { text: 'Le repos bien mérité prépare la concentration de demain.', author: 'Sagesse', lang: 'fr' },
    { text: 'Review today’s gains and sleep with the peace of a day well spent.', author: 'Reflection', lang: 'en' },
  ],
};

function getPeriod(): 'morning' | 'afternoon' | 'evening' {
  const hr = new Date().getHours();
  if (hr < 12) return 'morning';
  if (hr < 18) return 'afternoon';
  return 'evening';
}

export const Dashboard: React.FC<DashboardProps> = ({
  appData,
  language,
  onNavigateTab,
  onToggleHomework,
  onToggleTaskComplete,
  onAddTask,
  onDeleteTask,
  onUpdateBacDate,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const todayStr = getLocalDateStr();

  // Inline Quick Add Task on Dashboard
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskSubject, setQuickTaskSubject] = useState(BAC_SUBJECTS[0].name);
  const [quickTaskPriority, setQuickTaskPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'completed'>('all');

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [newBacDate, setNewBacDate] = useState(
    appData.settings.baccalaureateDate?.slice(0, 16) || '2027-06-10T08:00'
  );
  const [newStartDate, setNewStartDate] = useState(
    appData.settings.academicYearStartDate?.slice(0, 16) || '2026-09-07T08:00'
  );

  // Sync state when appData changes
  useEffect(() => {
    if (appData.settings.baccalaureateDate) {
      setNewBacDate(appData.settings.baccalaureateDate.slice(0, 16));
    }
    if (appData.settings.academicYearStartDate) {
      setNewStartDate(appData.settings.academicYearStartDate.slice(0, 16));
    }
  }, [appData.settings.baccalaureateDate, appData.settings.academicYearStartDate]);

  // Quote State
  const [quoteIndex, setQuoteIndex] = useState(0);
  const period = getPeriod();
  const currentQuotes = QUOTES_POOL[period];
  const quote = currentQuotes[quoteIndex % currentQuotes.length];

  // Update Countdown every second
  useEffect(() => {
    const target = new Date(appData.settings.baccalaureateDate || '2026-06-10T08:00:00').getTime();

    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [appData.settings.baccalaureateDate]);

  // Weighted average calculation
  const weightedAverage = useMemo(() => {
    if (!appData.grades || appData.grades.length === 0) return null;
    let pts = 0;
    let coeff = 0;
    appData.grades.forEach((g) => {
      pts += g.grade * g.coeff;
      coeff += g.coeff;
    });
    return coeff > 0 ? pts / coeff : null;
  }, [appData.grades]);

  // Goals completion
  const goalsCompletion = useMemo(() => {
    const goals = appData.goals || [];
    if (goals.length === 0) return 0;
    const done = goals.filter((g) => g.done).length;
    return Math.round((done / goals.length) * 100);
  }, [appData.goals]);

  // Upcoming Exams
  const upcomingExams = useMemo(() => {
    return (appData.quizzes || [])
      .filter((q) => q.status === 'upcoming')
      .slice(0, 3);
  }, [appData.quizzes]);

  // Pending Homework
  const pendingHw = useMemo(() => {
    return (appData.homework || [])
      .filter((h) => h.status !== 'submitted')
      .slice(0, 4);
  }, [appData.homework]);

  // Daily Tasks & TimeBlocks Streak Engine (Strict: requires completed task/block)
  const streakData = useMemo(() => {
    return calculateDailyStreak(appData.tasks || [], [], appData.timeBlocks || []);
  }, [appData.tasks, appData.timeBlocks]);

  const weekDays = useMemo(() => {
    return getWeekDaysStreakStatus(streakData.completedDates, language);
  }, [streakData.completedDates, language]);


  const handleQuickSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !onAddTask) return;

    onAddTask({
      title: quickTaskTitle.trim(),
      subject: quickTaskSubject,
      priority: quickTaskPriority,
      status: 'todo',
      type: 'revision',
      dueDate: todayStr,
      progressPercentage: 0,
    });

    setQuickTaskTitle('');
  };

  const handleAddPresetTask = (title: string, subject: string, priority: 'high' | 'medium' | 'low' = 'high') => {
    if (!onAddTask) return;
    onAddTask({
      title,
      subject,
      priority,
      status: 'todo',
      type: 'revision',
      dueDate: todayStr,
      progressPercentage: 0,
    });
  };

  const handleSaveDate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBacDate(newBacDate, newStartDate);
    setIsEditDateOpen(false);
  };

  // Mention calculation for average tile
  const mentionText = useMemo(() => {
    if (weightedAverage === null) return null;
    if (weightedAverage >= 16) return { label: isAr ? 'ميزة حسن جداً ★★★' : 'Mention Très Bien ★★★', color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (weightedAverage >= 14) return { label: isAr ? 'ميزة حسن ★★' : 'Mention Bien ★★', color: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20' };
    if (weightedAverage >= 12) return { label: isAr ? 'ميزة مستحسن ★' : 'Mention Assez Bien ★', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
    if (weightedAverage >= 10) return { label: isAr ? 'ميزة مقبول' : 'Mention Passable', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    return { label: isAr ? 'في طور التحسين' : 'En progression', color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' };
  }, [weightedAverage, isAr]);

  // % of Baccalaureate preparation path
  // Officially starts on Monday (academicYearStartDate: e.g. 2026-09-07).
  // Before Monday, progress is 0% (school hasn't started yet).
  // On Monday and onwards, it starts from 0% and progresses up to 100% on the exam date.
  const { bacTrajectoryPercent, isBeforeStart } = useMemo(() => {
    const now = new Date().getTime();
    const rawStart = appData.settings.academicYearStartDate;
    // Fallback: if not set or outdated 2025 date, default to Monday September 7, 2026
    const startStr = (!rawStart || rawStart.startsWith('2025'))
      ? '2026-09-07T08:00:00'
      : rawStart;
    const startDate = new Date(startStr).getTime();
    const targetDate = new Date(appData.settings.baccalaureateDate || '2027-06-10T08:00:00').getTime();

    if (now < startDate) {
      return { bacTrajectoryPercent: 0, isBeforeStart: true };
    }
    if (now >= targetDate) {
      return { bacTrajectoryPercent: 100, isBeforeStart: false };
    }

    const totalDuration = targetDate - startDate;
    if (totalDuration <= 0) {
      return { bacTrajectoryPercent: 0, isBeforeStart: false };
    }

    const elapsed = now - startDate;
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    return { bacTrajectoryPercent: percent, isBeforeStart: false };
  }, [appData.settings.academicYearStartDate, appData.settings.baccalaureateDate]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-16">
      {/* =========================================================
          BENTO ROW 1: HERO COUNTDOWN (7 COLS) & STREAK FLAME (5 COLS)
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Bento Box 1: Hero Exam Countdown & Trajectory (7 cols) */}
        <div className="lg:col-span-7 bento-card relative overflow-hidden bg-gradient-to-br from-[#0c1424] via-[#0f172a] to-[#161c30] text-white p-6 sm:p-7 border border-teal-500/20 shadow-xl flex flex-col justify-between group">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Bar */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('cd_eyebrow')}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-['Outfit'] text-white tracking-tight">
                {t('cd_title')}
              </h1>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>
                  {isAr ? 'الموعد الرسمي المستهدف: ' : 'Date officielle ciblée : '}
                  <strong className="text-teal-300 font-semibold">
                    {new Date(appData.settings.baccalaureateDate || '2026-06-10').toLocaleDateString(
                      isAr ? 'ar-MA' : 'fr-FR',
                      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </strong>
                </span>
              </p>
            </div>

            <button
              onClick={() => setIsEditDateOpen(true)}
              className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-teal-200 text-xs font-bold transition-all border border-white/10 cursor-pointer shrink-0"
              title="Modifier la date"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t('edit')}</span>
            </button>
          </div>

          {/* 4 Digital Countdown Counters */}
          <div className="relative z-10 grid grid-cols-4 gap-2 sm:gap-3 my-6 text-center">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xs">
              <div className="text-2xl sm:text-4xl font-black font-['Outfit'] font-mono text-teal-400 tracking-tight">
                {timeLeft.days}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-300/80 mt-1">
                {t('days')}
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xs">
              <div className="text-2xl sm:text-4xl font-black font-['Outfit'] font-mono text-white tracking-tight">
                {timeLeft.hours < 10 ? `0${timeLeft.hours}` : timeLeft.hours}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-300/80 mt-1">
                {t('hours')}
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xs">
              <div className="text-2xl sm:text-4xl font-black font-['Outfit'] font-mono text-white tracking-tight">
                {timeLeft.minutes < 10 ? `0${timeLeft.minutes}` : timeLeft.minutes}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-300/80 mt-1">
                {t('minutes')}
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xs">
              <div className="text-2xl sm:text-4xl font-black font-['Outfit'] font-mono text-amber-400 tracking-tight animate-pulse">
                {timeLeft.seconds < 10 ? `0${timeLeft.seconds}` : timeLeft.seconds}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300/80 mt-1">
                {t('seconds')}
              </div>
            </div>
          </div>

          {/* Bac Trajectory Mini Progress Strip */}
          <div className="relative z-10 pt-3 border-t border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">
                {isAr ? 'مسار التحضير للامتحان الوطني' : 'Trajectoire vers l\'examen national'}
              </span>
              <span className="text-teal-300 font-bold font-mono">
                {timeLeft.days} {isAr ? 'يوم متبقٍ' : 'jours restants'}{' '}
                <span className="text-slate-300 font-normal">
                  ({bacTrajectoryPercent}%{isBeforeStart ? (isAr ? ' - يبدأ الإثنين' : ' - Démarre lundi') : ''})
                </span>
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 rounded-full transition-all duration-700"
                style={{ width: `${bacTrajectoryPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bento Box 2: Duolingo Daily Streak Flame (5 cols) */}
        <div className="lg:col-span-5 bento-card relative overflow-hidden bg-[#131F24] border border-[#2B3842] shadow-xl p-6 sm:p-7 flex flex-col justify-between text-white group">
          {/* Flame + Streak Count */}
          <div className="flex flex-col items-center text-center w-full">
            <div>
              <DuolingoStreakFlame size={120} />
            </div>

            <div className="text-5xl sm:text-6xl font-black font-['Outfit'] text-white tracking-tight leading-none mt-1">
              {streakData.currentStreak}
            </div>

            <div className="text-lg sm:text-xl font-black text-[#FF9600] tracking-wide mt-1.5">
              {streakData.currentStreak > 0
                ? isAr
                  ? `${streakData.currentStreak} أيام متتالية!`
                  : language === 'fr'
                    ? `${streakData.currentStreak} jours de série !`
                    : `${streakData.currentStreak} day streak!`
                : isAr
                  ? '0 أيام متتالية'
                  : language === 'fr'
                    ? '0 jour de série'
                    : '0 day streak'}
            </div>

            {/* Today logged hours & status pill */}
            <div className="flex items-center gap-2 mt-2">
              {streakData.todayStudyHours > 0 ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold shadow-xs">
                  <span>⏱️ {streakData.todayStudyHours}h {isAr ? 'ساعات اليوم' : 'étudiées'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#182229] border border-[#2B3842] text-[#8495A0] text-xs font-semibold">
                  <span>{isAr ? 'في انتظار إنجاز أول مهمة اليوم' : 'En attente d\'activité aujourd\'hui'}</span>
                </div>
              )}
            </div>
          </div>

          {/* 7-Days Row */}
          <div className="w-full bg-[#182229] border border-[#2B3842] rounded-2xl p-3 sm:p-4 mt-5 space-y-3">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
              {weekDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`text-[11px] font-bold ${day.isToday
                      ? 'text-[#FF9600]'
                      : day.status === 'done' || day.status === 'flame'
                        ? 'text-slate-200'
                        : 'text-[#8495A0]'
                      }`}
                  >
                    {day.name}
                  </span>

                  {day.status === 'done' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FF9600] text-[#131F24] flex items-center justify-center font-black text-xs shadow-md">
                      <CheckCircle className="w-4 h-4 text-[#131F24] stroke-[3]" />
                    </div>
                  )}

                  {day.status === 'flame' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FF9600] text-[#131F24] flex items-center justify-center font-black text-xs shadow-md ring-2 ring-[#FF9600]/40">
                      <Flame className="w-3.5 h-3.5 text-[#131F24] fill-current stroke-[2.5]" />
                    </div>
                  )}

                  {day.status === 'empty' && (
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all ${day.isToday
                        ? 'border-[#FF9600]/60 bg-[#FF9600]/10 text-[#FF9600]'
                        : 'border-[#2B3842] bg-[#131F24]'
                        }`}
                    >
                      {day.isToday && <span className="w-2 h-2 rounded-full bg-[#FF9600] animate-ping" />}
                    </div>
                  )}

                  {day.status === 'future' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#2A3840]/60 border border-[#384852]/60 flex items-center justify-center" />
                  )}
                </div>
              ))}
            </div>

            {/* Streak Status Tip */}
            <div className="pt-2 border-t border-[#2B3842] text-center text-xs font-medium">
              {streakData.isTodayCompleted ? (
                <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                  <span>✓</span>
                  <span>{isAr ? 'تم إنجاز وتأكيد مهمة اليوم! الشعلة مشتعلة 🔥' : 'Tâche validée ! Série active aujourd\'hui 🔥'}</span>
                </span>
              ) : (
                <span className="text-[#FF9600] font-semibold flex items-center justify-center gap-1">
                  <span>⚡</span>
                  <span>{isAr ? 'أنجز مهمة لتأكيد شعلة اليوم!' : 'Validez une tâche pour allumer la flamme !'}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          BENTO ROW 2: 4 CORE METRICS (3 COLS EACH)
          ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Weighted Average */}
        <div
          onClick={() => onNavigateTab('average')}
          className="bento-card p-5 bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:border-teal-500/50 hover:shadow-md cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>{t('tile_avg')}</span>
          </div>
          <div className="my-3 flex items-center gap-3">
            <ProgressRing
              progress={weightedAverage !== null ? Math.round((weightedAverage / 20) * 100) : 0}
              size={56}
              strokeWidth={5}
              gradientId="dash-avg-ring"
              gradientColors={{ from: '#0D9488', to: '#6366F1' }}
              centerContent={
                <span className="text-[10px] font-black font-['Outfit'] text-teal-600 dark:text-teal-400">
                  {weightedAverage !== null ? `${Math.round((weightedAverage / 20) * 100)}%` : '—'}
                </span>
              }
            />
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black font-['Outfit'] text-teal-600 dark:text-teal-400 tracking-tight">
                  {weightedAverage !== null ? weightedAverage.toFixed(2) : '—'}
                </span>
                <span className="text-xs text-slate-400 font-bold">/ 20</span>
              </div>
            </div>
          </div>
          <div>
            {mentionText ? (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black border ${mentionText.color}`}>
                {mentionText.label}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-semibold">
                {isAr ? 'في انتظار إضافة النقط' : 'En attente de notes'}
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Goals Progress */}
        <div
          onClick={() => onNavigateTab('goals')}
          className="bento-card p-5 bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:border-emerald-500/50 hover:shadow-md cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>{t('tile_goals')}</span>
          </div>
          <div className="my-3 flex items-center gap-3">
            <ProgressRing
              progress={goalsCompletion}
              size={56}
              strokeWidth={5}
              gradientId="dash-goals-ring"
              gradientColors={{ from: '#10B981', to: '#059669' }}
              centerContent={
                <span className="text-[10px] font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400">
                  {goalsCompletion}%
                </span>
              }
            />
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400 tracking-tight">
              {goalsCompletion}%
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {appData.goals?.filter((g) => g.done).length || 0} / {appData.goals?.length || 0} {t('tile_goals_sub')}
          </span>
        </div>

        {/* Metric 3: Upcoming Exams */}
        <div
          onClick={() => onNavigateTab('quizzes')}
          className="bento-card p-5 bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:border-indigo-500/50 hover:shadow-md cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>{t('tile_exams')}</span>
          </div>
          <div className="my-3 flex items-center gap-3">
            <ProgressRing
              progress={Math.min(100, upcomingExams.length * 20)}
              size={56}
              strokeWidth={5}
              gradientId="dash-exams-ring"
              gradientColors={{ from: '#6366F1', to: '#8B5CF6' }}
              centerContent={
                <span className="text-[13px] font-black font-['Outfit'] text-indigo-600 dark:text-indigo-400">
                  {upcomingExams.length}
                </span>
              }
            />
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-indigo-600 dark:text-indigo-400 tracking-tight">
              {upcomingExams.length}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {upcomingExams.length > 0
              ? isAr
                ? `أقرب فرض: ${upcomingExams[0]?.subject || ''}`
                : `Prochain: ${upcomingExams[0]?.subject || ''}`
              : isAr
                ? 'لا توجد فروض مجدولة'
                : 'Aucune épreuve'}
          </span>
        </div>

        {/* Metric 4: Pending Homework */}
        <div
          onClick={() => onNavigateTab('homework')}
          className="bento-card p-5 bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:border-amber-500/50 hover:shadow-md cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>{t('tile_hw')}</span>
          </div>
          <div className="my-3 flex items-center gap-3">
            <ProgressRing
              progress={pendingHw.length > 0 ? Math.min(100, Math.round((pendingHw.filter((h) => h.priority === 'high').length / Math.max(1, pendingHw.length)) * 100)) : 0}
              size={56}
              strokeWidth={5}
              gradientId="dash-hw-ring"
              gradientColors={{ from: '#F59E0B', to: '#EF4444' }}
              centerContent={
                <span className="text-[13px] font-black font-['Outfit'] text-amber-600 dark:text-amber-400">
                  {pendingHw.length}
                </span>
              }
            />
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-amber-600 dark:text-amber-400 tracking-tight">
              {pendingHw.length}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {pendingHw.filter((h) => h.priority === 'high').length > 0
              ? isAr
                ? `${pendingHw.filter((h) => h.priority === 'high').length} ذات أولوية قصوى`
                : `${pendingHw.filter((h) => h.priority === 'high').length} prioritaires`
              : t('tile_hw_sub')}
          </span>
        </div>
      </div>

      {/* =========================================================
          BENTO ROW 3: DAILY EXECUTION (8 COLS) & DEADLINES RADAR (4 COLS)
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Bento Box 5: Daily Tasks & Interactive Streak Confirmation (8 cols) */}
        <div className="lg:col-span-8 bento-card bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm space-y-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-xs">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isAr ? 'المهام اليومية وتأكيد الشعلة' : 'Tâches Quotidiennes & Validation Série'}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    {(appData.tasks || []).filter((t) => t.status === 'completed').length} / {(appData.tasks || []).length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr
                    ? 'اضغط على زر الدائرة لتأكيد إنجاز المهمة وإشعال شعلة الانضباط 🔥'
                    : 'Cochez une tâche pour la valider et faire grimper votre série de révision 🔥'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTaskFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${taskFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  {isAr ? 'الكل' : 'Toutes'}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('todo')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${taskFilter === 'todo'
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  {isAr ? 'قيد الإنجاز' : 'À faire'}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${taskFilter === 'completed'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  {isAr ? 'المكتملة' : 'Faites'}
                </button>
              </div>

              <button
                onClick={() => onNavigateTab('tasks')}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 shrink-0 ml-1 cursor-pointer"
              >
                <span>{isAr ? 'عرض الكل' : 'Voir tout'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Daily Completion Progress Bar */}
          {(appData.tasks || []).length > 0 && (
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {isAr ? 'نسبة إنجاز مهام اليوم:' : 'Progression des tâches :'}
                </span>
                <span className="font-black font-['Outfit'] text-teal-600 dark:text-teal-400">
                  {Math.round(
                    (((appData.tasks || []).filter((t) => t.status === 'completed').length) /
                      Math.max(1, (appData.tasks || []).length)) *
                    100
                  )}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (((appData.tasks || []).filter((t) => t.status === 'completed').length) /
                        Math.max(1, (appData.tasks || []).length)) *
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Quick Add Task Input Form on Dashboard */}
          {onAddTask && (
            <form onSubmit={handleQuickSubmitTask} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={
                  isAr
                    ? 'أضف مهمة لليوم (مثال: تلخيص درس الإعداد العقدية)...'
                    : 'Ajouter une tâche pour aujourd’hui (ex: Révision Mathématiques)...'
                }
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />

              <div className="flex items-center gap-2">
                <select
                  value={quickTaskSubject}
                  onChange={(e) => setQuickTaskSubject(e.target.value)}
                  className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none"
                >
                  {BAC_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={quickTaskPriority}
                  onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                  className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none"
                >
                  <option value="high">{isAr ? 'أولوية قصوى' : 'Priorité Haute'}</option>
                  <option value="medium">{isAr ? 'أولوية متوسطة' : 'Priorité Moyenne'}</option>
                  <option value="low">{isAr ? 'أولوية عادية' : 'Priorité Normale'}</option>
                </select>

                <button
                  type="submit"
                  disabled={!quickTaskTitle.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'إضافة' : 'Ajouter'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Preset Quick Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400">
              {isAr ? 'أفكار سريعة:' : 'Suggestions :'}
            </span>
            <button
              type="button"
              onClick={() => handleAddPresetTask('Exercices Nombres Complexes', 'Mathématiques', 'high')}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/20 transition-all cursor-pointer"
            >
              + 📐 Maths
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetTask('Synthèse Physique-Chimie', 'Physique-Chimie', 'high')}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/20 transition-all cursor-pointer"
            >
              + ⚡ Physique
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetTask('Schéma Bilan SVT', 'SVT', 'medium')}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20 transition-all cursor-pointer"
            >
              + 🧬 SVT
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetTask('Concepts Clés Philosophie', 'Philosophie', 'medium')}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/20 transition-all cursor-pointer"
            >
              + 📚 Philo
            </button>
          </div>

          {/* Tasks List with Interactive Confirmation Check */}
          <div className="space-y-2 pt-2 max-h-[360px] overflow-y-auto no-scrollbar">
            {(appData.tasks || [])
              .filter((task) => {
                if (taskFilter === 'todo') return task.status !== 'completed';
                if (taskFilter === 'completed') return task.status === 'completed';
                return true;
              })
              .map((task) => {
                const isCompleted = task.status === 'completed';
                const subjectInfo = BAC_SUBJECTS.find((s) => s.name === task.subject);

                return (
                  <div
                    key={task.id}
                    className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${isCompleted
                      ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 opacity-90'
                      : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:border-teal-500/40 hover:shadow-xs'
                      }`}
                  >
                    {/* Confirmation Button & Task Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (onToggleTaskComplete) {
                            onToggleTaskComplete(task.id);
                          }
                        }}
                        title={
                          isCompleted
                            ? isAr
                              ? 'إلغاء التأكيد'
                              : 'Marquer comme non complétée'
                            : isAr
                              ? 'تأكيد إنجاز المهمة وزيادة الشعلة'
                              : 'Confirmer la tâche pour allumer la flamme'
                        }
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${isCompleted
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : 'border-2 border-slate-300 dark:border-slate-600 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600'
                          }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <Circle className="w-4 h-4 stroke-[2]" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                              }`}
                          >
                            {task.title}
                          </span>
                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black shrink-0">
                              {isAr ? 'تم التأكيد 🔥' : 'Validée 🔥'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <span
                              className={`w-2 h-2 rounded-full ${subjectInfo?.dotColor || 'bg-teal-500'}`}
                            />
                            <span>{task.subject}</span>
                          </span>
                          <span>•</span>
                          <span
                            className={`font-semibold ${task.priority === 'high'
                              ? 'text-rose-500'
                              : task.priority === 'medium'
                                ? 'text-amber-500'
                                : 'text-slate-400'
                              }`}
                          >
                            {task.priority === 'high'
                              ? isAr
                                ? 'أولوية قصوى'
                                : 'Haute'
                              : task.priority === 'medium'
                                ? isAr
                                  ? 'أولوية متوسطة'
                                  : 'Moyenne'
                                : isAr
                                  ? 'عادية'
                                  : 'Basse'}
                          </span>
                          {task.estimatedHours && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">
                                ⏱️ {task.estimatedHours}h
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    {onDeleteTask && (
                      <button
                        type="button"
                        onClick={() => {
                          chimePlayer.playChime('delete');
                          onDeleteTask(task.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

            {/* Empty State */}
            {((appData.tasks || []).length === 0 ||
              (appData.tasks || []).filter((t) => {
                if (taskFilter === 'todo') return t.status !== 'completed';
                if (taskFilter === 'completed') return t.status === 'completed';
                return true;
              }).length === 0) && (
                <div className="text-center py-7 text-slate-400 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5">
                  <Sparkles className="w-5 h-5 mx-auto text-teal-500/60" />
                  <p>
                    {taskFilter === 'completed'
                      ? isAr
                        ? 'لم يتم إكمال أي مهمة بعد في هذا التصفية.'
                        : 'Aucune tâche complétée dans ce filtre.'
                      : taskFilter === 'todo'
                        ? isAr
                          ? 'جميع المهام مكتملة! رائع جداً.'
                          : 'Toutes les tâches sont terminées ! Bravo !'
                        : isAr
                          ? 'لا توجد مهام حالياً. اختر فكرة سريعة أعلاه أو أضف مهمتك لبدء الشعلة!'
                          : 'Aucune tâche actuellement. Ajoutez une tâche ci-dessus pour allumer la flamme !'}
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Bento Box 6: Deadlines & Next Up Radar (4 cols) */}
        <div className="lg:col-span-4 bento-card bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{isAr ? 'رادار الاستحقاقات القادمة' : 'Radar des Échéances'}</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onNavigateTab('quizzes')}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {isAr ? 'فروض' : 'Quiz'}
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  onClick={() => onNavigateTab('homework')}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {isAr ? 'واجبات' : 'Devoirs'}
                </button>
              </div>
            </div>

            {/* Upcoming Exams (Max 2) */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-3 h-3 text-indigo-500" />
                <span>{isAr ? 'أقرب الفروض' : 'Prochaines Épreuves'}</span>
              </div>
              {upcomingExams.slice(0, 2).map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => onNavigateTab('quizzes')}
                  className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between gap-2.5 cursor-pointer hover:border-indigo-400/60 transition-all"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {exam.title}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {exam.subject} • {exam.date}
                    </div>
                  </div>
                  <span className="text-[11px] font-black font-['Outfit'] text-indigo-600 dark:text-indigo-400 shrink-0">
                    {exam.targetScore}/20
                  </span>
                </div>
              ))}
              {upcomingExams.length === 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-center text-xs text-slate-400 font-medium">
                  {t('no_exams')}
                </div>
              )}
            </div>

            {/* Pending Homework (Max 2) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-amber-500" />
                <span>{isAr ? 'أقرب الواجبات' : 'Devoirs Urgents'}</span>
              </div>
              {pendingHw.slice(0, 2).map((hw) => (
                <div
                  key={hw.id}
                  className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => onToggleHomework(hw.id)}
                      className="w-4 h-4 rounded-md border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 hover:border-amber-500 transition-colors cursor-pointer"
                    >
                      {hw.status === 'submitted' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {hw.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {hw.subject} • {hw.dueDate}
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                    {hw.priority}
                  </span>
                </div>
              ))}
              {pendingHw.length === 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-center text-xs text-slate-400 font-medium">
                  {t('no_hw')}
                </div>
              )}
            </div>
          </div>

          {/* Quick Add Shortcut Footnote */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium text-[11px]">
              {isAr ? 'الجدول والمواعيد' : 'Planning complet'}
            </span>
            <button
              onClick={() => onNavigateTab('timeblocking')}
              className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isAr ? 'فتح المخطط' : 'Ouvrir'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          BENTO ROW 3.5: GITHUB-STYLE CALENDAR HEATMAP
          ========================================================= */}
      <CalendarHeatmap
        appData={appData}
        language={language}
      />

      {/* =========================================================
          BENTO ROW 4: QUICK LAUNCHPAD (4 COMPACT BENTO BOXES)
          ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Launchpad 1: Time Blocking Planner */}
        <div
          onClick={() => onNavigateTab('timeblocking')}
          className="bento-card p-4 sm:p-5 bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:border-teal-500/50 hover:shadow-md cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarClock className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'جدول الحصص والتخطيط' : 'Time Blocking Planner'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isAr ? 'سحب الملصقات والجدولة' : 'Glisser-déposer stickers & blocs'}
            </div>
          </div>
        </div>

        {/* Launchpad 2: Leitner Smart Revision */}
        <div
          onClick={() => onNavigateTab('revision')}
          className="bento-card p-4 sm:p-5 bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:border-purple-500/50 hover:shadow-md cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Brain className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'المراجعة التكرارية الذكية' : 'Révision Leitner'}
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
              {(appData.lessons || []).filter((l) => l.nextReviewDate <= todayStr).length} {isAr ? 'دروس مستحقة' : 'leçons à réviser'}
            </div>
          </div>
        </div>

        {/* Launchpad 3: Habits & Rituals */}
        <div
          onClick={() => onNavigateTab('habits')}
          className="bento-card p-4 sm:p-5 bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:border-amber-500/50 hover:shadow-md cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'عادات الانضباط' : 'Rituels & Habitudes'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {appData.habits?.length || 0} {isAr ? 'عادات يومية مبرمجة' : 'habitudes actives'}
            </div>
          </div>
        </div>

        {/* Launchpad 4: Motivational Quote Bento Tile */}
        <div className="bento-card p-4 sm:p-5 bg-gradient-to-br from-teal-500/10 via-indigo-500/10 to-purple-500/10 dark:from-teal-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border border-teal-500/30 shadow-xs flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'جرعة تحفيز' : 'Inspiration'}</span>
            </div>
            <button
              onClick={() => setQuoteIndex((prev) => prev + 1)}
              className="p-1 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
              title="Changer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic line-clamp-2 mt-2 leading-relaxed">
            "{quote.text}"
          </p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">
            — {quote.author}
          </span>
        </div>
      </div>

      {/* Modal: Edit Baccalaureate Date */}
      {isEditDateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold font-['Outfit']">
                {isAr ? 'تعديل موعد الامتحان' : 'Modifier la date de l\'examen'}
              </h3>
              <button
                onClick={() => setIsEditDateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('settings_start_date')}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-teal-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr
                    ? 'يبدأ احتساب النسبة المئوية للمسار الدراسي انطلاقاً من هذا التاريخ (0% يوم الإثنين).'
                    : 'Le compteur de progression (%) commence officiellement à cette date (0% le lundi).'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('settings_exam_date')}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newBacDate}
                  onChange={(e) => setNewBacDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditDateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-500/20 cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
