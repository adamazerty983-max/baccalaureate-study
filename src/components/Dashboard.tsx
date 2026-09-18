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
  Zap,
  Dna,
  ScrollText,
  Quote,
  GraduationCap,
  Languages,
  AlertTriangle,
} from 'lucide-react';
import { AppLanguage, FullAppData, HomeworkItem, QuizItem, TaskItem, TaskType } from '../types';
import { BAC_SUBJECTS, getSubjectCoefficient } from '../utils/constants';
import { TASK_TYPES_VISUAL, evaluateTaskUrgency } from '../utils/taskVisualConfig';
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
  onOpenFocusMode?: () => void;
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

const SUBJECT_THEMES: Record<string, {
  cardBg: string;
  borderColor: string;
  hoverBorder: string;
  progressGradient: string;
  accentText: string;
  badgeBg: string;
  dotBg: string;
}> = {
  math: {
    cardBg: 'bg-teal-50/50 dark:bg-teal-950/20',
    borderColor: 'border-teal-200/70 dark:border-teal-900/40',
    hoverBorder: 'hover:border-teal-500/60 hover:shadow-teal-500/5',
    progressGradient: 'from-teal-500 to-emerald-500',
    accentText: 'text-teal-700 dark:text-teal-300',
    badgeBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25',
    dotBg: 'bg-teal-500',
  },
  physics: {
    cardBg: 'bg-sky-50/50 dark:bg-sky-950/20',
    borderColor: 'border-sky-200/70 dark:border-sky-900/40',
    hoverBorder: 'hover:border-sky-500/60 hover:shadow-sky-500/5',
    progressGradient: 'from-sky-500 to-blue-600',
    accentText: 'text-sky-700 dark:text-sky-300',
    badgeBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    dotBg: 'bg-sky-500',
  },
  biology: {
    cardBg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200/70 dark:border-emerald-900/40',
    hoverBorder: 'hover:border-emerald-500/60 hover:shadow-emerald-500/5',
    progressGradient: 'from-emerald-500 to-green-600',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    dotBg: 'bg-emerald-500',
  },
  philosophy: {
    cardBg: 'bg-purple-50/50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200/70 dark:border-purple-900/40',
    hoverBorder: 'hover:border-purple-500/60 hover:shadow-purple-500/5',
    progressGradient: 'from-purple-500 to-indigo-600',
    accentText: 'text-purple-700 dark:text-purple-300',
    badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
    dotBg: 'bg-purple-500',
  },
  french: {
    cardBg: 'bg-amber-50/50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200/70 dark:border-amber-900/40',
    hoverBorder: 'hover:border-amber-500/60 hover:shadow-amber-500/5',
    progressGradient: 'from-amber-500 to-orange-500',
    accentText: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    dotBg: 'bg-amber-500',
  },
  english: {
    cardBg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    borderColor: 'border-indigo-200/70 dark:border-indigo-900/40',
    hoverBorder: 'hover:border-indigo-500/60 hover:shadow-indigo-500/5',
    progressGradient: 'from-indigo-500 to-blue-600',
    accentText: 'text-indigo-700 dark:text-indigo-300',
    badgeBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
    dotBg: 'bg-indigo-500',
  },
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
  onOpenFocusMode,
  onUpdateBacDate,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const todayStr = getLocalDateStr();

  // Inline Quick Add Task on Dashboard
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskSubject, setQuickTaskSubject] = useState(BAC_SUBJECTS[0].name);
  const [quickTaskPriority, setQuickTaskPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('high');
  const [quickTaskType, setQuickTaskType] = useState<TaskType>('homework');
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'completed'>('all');

  // Identify Urgent & Overdue Attention Tasks for Exam / Focus Period
  const urgentAttentionTasks = useMemo(() => {
    return (appData.tasks || []).filter((task) => {
      if (task.status === 'completed') return false;
      const urgency = evaluateTaskUrgency(task.dueDate, task.dueTime, task.priority, language);
      return urgency.isUrgentAttention || task.priority === 'urgent' || task.priority === 'high';
    });
  }, [appData.tasks, language]);

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
      type: quickTaskType,
      dueDate: todayStr,
      progressPercentage: 0,
    });

    chimePlayer.playChime('add');
    setQuickTaskTitle('');
  };

  const handleAddPresetTask = (
    title: string,
    subject: string,
    priority: 'urgent' | 'high' | 'medium' | 'low' = 'high',
    type: TaskType = 'revision'
  ) => {
    if (!onAddTask) return;
    onAddTask({
      title,
      subject,
      priority,
      status: 'todo',
      type,
      dueDate: todayStr,
      progressPercentage: 0,
    });
    chimePlayer.playChime('add');
  };

  const handleSaveDate = (e: React.FormEvent) => {
    e.preventDefault();
    chimePlayer.playChime('add');
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

  // Executive Greeting & Date calculation
  const { greetingText, periodBadge, formattedCurrentDate } = useMemo(() => {
    const d = new Date();
    const formatted = d.toLocaleDateString(
      isAr ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-US',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    );

    let greet = '';
    let badge = '';
    if (period === 'morning') {
      greet = isAr ? 'صباح العزيمة والتركيز' : language === 'fr' ? 'Bonjour, préparez votre excellence' : 'Good morning, pursue excellence';
      badge = isAr ? 'فترة الصباح' : language === 'fr' ? 'Matinée Focus' : 'Morning Focus';
    } else if (period === 'afternoon') {
      greet = isAr ? 'مساء الجد والاجتهاد' : language === 'fr' ? 'Bel après-midi de révision' : 'Productive afternoon';
      badge = isAr ? 'فترة الظهيرة' : language === 'fr' ? 'Après-midi Actif' : 'Afternoon Study';
    } else {
      greet = isAr ? 'أمسية مراجعة هادئة' : language === 'fr' ? 'Soirée de consolidation & calme' : 'Quiet evening review';
      badge = isAr ? 'فترة المساء' : language === 'fr' ? 'Session Soirée' : 'Evening Review';
    }

    return {
      greetingText: greet,
      periodBadge: badge,
      formattedCurrentDate: formatted,
    };
  }, [isAr, language, period]);

  // Core Bac Subjects summary for the Mastery Grid
  const coreSubjectsData = useMemo(() => {
    const mainIds = ['math', 'physics', 'biology', 'philosophy', 'french', 'english'];
    const selected = BAC_SUBJECTS.filter((s) => mainIds.includes(s.id));

    return selected.map((subj) => {
      const subjectGrades = (appData.grades || []).filter(
        (g) => g.subject.toLowerCase() === subj.name.toLowerCase() || subj.name.toLowerCase().includes(g.subject.toLowerCase())
      );
      const avg = subjectGrades.length > 0
        ? subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length
        : null;

      const subjectTasks = (appData.tasks || []).filter((t) => t.subject === subj.name);
      const doneTasks = subjectTasks.filter((t) => t.status === 'completed').length;
      const totalTasks = subjectTasks.length;
      const taskProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const subjectLessons = (appData.lessons || []).filter((l) => l.subject === subj.name);
      const coefficient = getSubjectCoefficient(subj.name, appData.settings.customCoefficients);
      const theme = SUBJECT_THEMES[subj.id] || {
        cardBg: 'bg-slate-50/70 dark:bg-slate-900/40',
        borderColor: 'border-slate-200/80 dark:border-slate-800',
        hoverBorder: 'hover:border-teal-500/50',
        progressGradient: 'from-teal-500 to-indigo-500',
        accentText: 'text-teal-600 dark:text-teal-400',
        badgeBg: 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
        dotBg: subj.dotColor,
      };

      return {
        ...subj,
        theme,
        coefficient,
        averageGrade: avg,
        doneTasks,
        totalTasks,
        taskProgress,
        lessonsCount: subjectLessons.length,
      };
    });
  }, [appData.grades, appData.tasks, appData.lessons, appData.settings.customCoefficients]);

  return (
    <div className="space-y-5 sm:space-y-6 pb-20">
      {/* =========================================================
          EXECUTIVE GREETING & STATUS BANNER
          ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-white via-slate-50/90 to-teal-50/30 dark:from-[#0D1525]/95 dark:via-[#101A2E]/95 dark:to-[#152238]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-black font-['Outfit'] text-slate-900 dark:text-white tracking-tight truncate">
                {greetingText}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 shrink-0">
                <Sparkles className="w-3 h-3 text-teal-500" />
                <span>{periodBadge}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="capitalize font-medium">{formattedCurrentDate}</span>
              <span>•</span>
              <span className="text-teal-600 dark:text-teal-400 font-bold">
                {isAr ? 'برنامج التفوق للبكالوريا الوطنية' : 'Objectif Mention Très Bien'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          {onOpenFocusMode && (
            <button
              onClick={onOpenFocusMode}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>{isAr ? 'جلسة تركيز فوري' : 'Session Focus'}</span>
            </button>
          )}
          <button
            onClick={() => onNavigateTab('timeblocking')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/90 hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer shadow-2xs"
          >
            <CalendarClock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">{isAr ? 'المخطط' : 'Planning'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          BENTO ROW 1: HERO COUNTDOWN (7 COLS) & STREAK FLAME (5 COLS)
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Bento Box 1: Hero Exam Countdown & Trajectory (7 cols) */}
        <div className="lg:col-span-7 bento-card relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#091120] via-[#0E182A] to-[#14233D] text-white p-6 sm:p-7 border border-teal-500/25 shadow-2xl flex flex-col justify-between group">
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Bar */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>{t('cd_eyebrow')}</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-['Outfit'] text-white tracking-tight leading-snug">
                {t('cd_title')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-teal-400 shrink-0" />
                <span>
                  {isAr ? 'الموعد الرسمي المستهدف: ' : 'Date officielle ciblée : '}
                  <strong className="text-teal-200 font-semibold px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 ml-1 inline-block">
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
              className="self-start sm:self-center flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-teal-200 text-xs font-bold transition-all duration-200 border border-white/15 cursor-pointer backdrop-blur-md hover:border-teal-400/40 shadow-xs active:scale-95 shrink-0"
              title={isAr ? 'تعديل موعد الامتحان' : 'Modifier la date de l\'examen'}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t('edit')}</span>
            </button>
          </div>

          {/* 4 Precision Digital Countdown Pods */}
          <div className="relative z-10 grid grid-cols-4 gap-2 sm:gap-3.5 my-6 text-center">
            {/* Days Pod */}
            <div className="relative rounded-2xl bg-teal-950/25 dark:bg-black/35 border border-teal-500/25 p-3 sm:p-4 backdrop-blur-md shadow-inner group/pod hover:border-teal-400/50 transition-all duration-200">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black font-['Outfit'] font-mono text-teal-400 tracking-tight">
                {timeLeft.days}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-teal-300/80 mt-1">
                {t('days')}
              </div>
            </div>

            {/* Hours Pod */}
            <div className="relative rounded-2xl bg-sky-950/25 dark:bg-black/35 border border-sky-500/25 p-3 sm:p-4 backdrop-blur-md shadow-inner group/pod hover:border-sky-400/50 transition-all duration-200">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black font-['Outfit'] font-mono text-sky-300 tracking-tight">
                {timeLeft.hours < 10 ? `0${timeLeft.hours}` : timeLeft.hours}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-sky-300/80 mt-1">
                {t('hours')}
              </div>
            </div>

            {/* Minutes Pod */}
            <div className="relative rounded-2xl bg-indigo-950/25 dark:bg-black/35 border border-indigo-500/25 p-3 sm:p-4 backdrop-blur-md shadow-inner group/pod hover:border-indigo-400/50 transition-all duration-200">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black font-['Outfit'] font-mono text-indigo-300 tracking-tight">
                {timeLeft.minutes < 10 ? `0${timeLeft.minutes}` : timeLeft.minutes}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-indigo-300/80 mt-1">
                {t('minutes')}
              </div>
            </div>

            {/* Seconds Pod */}
            <div className="relative rounded-2xl bg-amber-950/25 dark:bg-black/35 border border-amber-500/25 p-3 sm:p-4 backdrop-blur-md shadow-inner group/pod hover:border-amber-400/50 transition-all duration-200">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black font-['Outfit'] font-mono text-amber-400 tracking-tight animate-pulse">
                {timeLeft.seconds < 10 ? `0${timeLeft.seconds}` : timeLeft.seconds}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-300/80 mt-1">
                {t('seconds')}
              </div>
            </div>
          </div>

          {/* Bac Trajectory Progress Rail */}
          <div className="relative z-10 pt-4 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>
                  {isAr ? 'مسار التحضير للامتحان الوطني' : 'Trajectoire vers l\'examen national'}
                </span>
              </span>
              <span className="text-teal-300 font-bold font-mono text-xs bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/10">
                {timeLeft.days} {isAr ? 'يوم متبقٍ' : 'jours restants'}{' '}
                <span className="text-slate-300 font-normal">
                  ({bacTrajectoryPercent}%{isBeforeStart ? (isAr ? ' - يبدأ الإثنين' : ' - Démarre lundi') : ''})
                </span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/40 border border-white/10 p-0.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(20,184,166,0.5)]"
                style={{ width: `${bacTrajectoryPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bento Box 2: Duolingo Daily Streak Flame (5 cols) */}
        <div className={`lg:col-span-5 bento-card relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#091120] via-[#0E182A] to-[#14233D] text-white p-6 sm:p-7 flex flex-col justify-between shadow-2xl transition-all duration-500 group ${streakData.isTodayCompleted
          ? 'border border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.12)]'
          : 'border border-sky-500/30 hover:border-sky-500/50 shadow-[0_0_25px_rgba(14,165,233,0.12)]'
          }`}>
          {/* Subtle Ambient Ember Glow */}
          <div
            className={`absolute top-10 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${streakData.isTodayCompleted
              ? 'bg-amber-500/15'
              : 'bg-sky-500/15'
              }`}
          />

          {/* Flame + Streak Count */}
          <div className="relative z-10 flex flex-col items-center text-center w-full">
            <div>
              <DuolingoStreakFlame size={120} isFrozen={!streakData.isTodayCompleted} />
            </div>

            <div className="text-5xl sm:text-6xl font-black font-['Outfit'] text-white tracking-tight leading-none mt-2 drop-shadow-md">
              {streakData.currentStreak}
            </div>

            <div className={`text-base sm:text-lg font-black tracking-wide mt-1.5 flex items-center justify-center gap-1.5 ${streakData.isTodayCompleted ? 'text-amber-400' : 'text-sky-400'
              }`}>
              <Flame className={`w-4 h-4 shrink-0 ${streakData.isTodayCompleted ? 'fill-amber-400 text-amber-400' : 'fill-sky-400 text-sky-400'
                }`} />
              <span>
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
              </span>
            </div>

            {/* Today logged hours & status pill */}
            <div className="flex items-center gap-2 mt-2.5">
              {streakData.todayStudyHours > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{streakData.todayStudyHours}h {isAr ? 'ساعات اليوم' : 'étudiées'}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-medium">
                  <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{isAr ? 'في انتظار إنجاز أول مهمة اليوم' : 'En attente d\'activité aujourd\'hui'}</span>
                </div>
              )}
            </div>
          </div>

          {/* 7-Days Progression Matrix */}
          <div className="relative z-10 w-full bg-black/30 border border-white/10 rounded-2xl p-3.5 sm:p-4 mt-5 space-y-3 backdrop-blur-md">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
              {weekDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`text-[11px] font-bold ${day.isToday
                      ? streakData.isTodayCompleted ? 'text-amber-400' : 'text-sky-400'
                      : day.status === 'done' || day.status === 'flame'
                        ? 'text-slate-200'
                        : 'text-slate-500'
                      }`}
                  >
                    {day.name}
                  </span>

                  {day.status === 'done' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-md shadow-amber-500/20">
                      <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[3]" />
                    </div>
                  )}

                  {day.status === 'flame' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40">
                      <Flame className="w-4 h-4 fill-white stroke-[2]" />
                    </div>
                  )}

                  {day.status === 'empty' && (
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all ${day.isToday
                        ? streakData.isTodayCompleted
                          ? 'border-2 border-amber-500 bg-amber-500/15 text-amber-400 shadow-xs'
                          : 'border-2 border-sky-500 bg-sky-500/15 text-sky-400 shadow-xs'
                        : 'border-white/10 bg-white/5'
                        }`}
                    >
                      {day.isToday && <span className={`w-2 h-2 rounded-full animate-ping ${streakData.isTodayCompleted ? 'bg-amber-400' : 'bg-sky-400'}`} />}
                    </div>
                  )}

                  {day.status === 'future' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center" />
                  )}
                </div>
              ))}
            </div>

            {/* Streak Status Tip */}
            <div className="pt-2.5 border-t border-white/10 text-center text-xs font-medium">
              {streakData.isTodayCompleted ? (
                <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تم إنجاز وتأكيد مهمة اليوم! الشعلة مشتعلة' : 'Tâche validée ! Série active aujourd\'hui'}</span>
                  <Flame className="w-3.5 h-3.5 fill-current" />
                </span>
              ) : (
                <span className="text-sky-300 font-semibold flex items-center justify-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 fill-sky-400 text-sky-400 shrink-0" />
                  <span>{isAr ? 'أكمل أي مهمة في الـ Planner لإشعال النار الذهبية!' : 'Complétez une tâche dans le Planner pour allumer la flamme dorée !'}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          BENTO ROW 2: 4 CORE KPI METRIC CARDS (3 COLS EACH)
          ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Weighted Average */}
        <div
          onClick={() => onNavigateTab('average')}
          className="bento-card p-5 sm:p-5.5 rounded-3xl bg-gradient-to-br from-white via-white to-teal-50/25 dark:from-[#0E1726]/95 dark:via-[#10192A]/95 dark:to-[#122432]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-teal-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <Calculator className="w-4 h-4" />
              </div>
              <span className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                {t('tile_avg')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-teal-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
          </div>

          <div className="my-3.5 flex items-center gap-3.5">
            <ProgressRing
              progress={weightedAverage !== null ? Math.round((weightedAverage / 20) * 100) : 0}
              size={56}
              strokeWidth={5}
              gradientId="dash-avg-ring"
              gradientColors={{ from: '#0D9488', to: '#14B8A6' }}
              centerContent={
                <span className="text-[10px] font-black font-['Outfit'] text-teal-600 dark:text-teal-400">
                  {weightedAverage !== null ? `${Math.round((weightedAverage / 20) * 100)}%` : '—'}
                </span>
              }
            />
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black font-['Outfit'] text-teal-700 dark:text-teal-300 tracking-tight">
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
          className="bento-card p-5 sm:p-5.5 rounded-3xl bg-gradient-to-br from-white via-white to-emerald-50/25 dark:from-[#0E1726]/95 dark:via-[#10192A]/95 dark:to-[#102422]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-emerald-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                {t('tile_goals')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
          </div>

          <div className="my-3.5 flex items-center gap-3.5">
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
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-emerald-700 dark:text-emerald-300 tracking-tight">
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
          className="bento-card p-5 sm:p-5.5 rounded-3xl bg-gradient-to-br from-white via-white to-indigo-50/25 dark:from-[#0E1726]/95 dark:via-[#10192A]/95 dark:to-[#181938]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-400 to-purple-500" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                {t('tile_exams')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
          </div>

          <div className="my-3.5 flex items-center gap-3.5">
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
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-indigo-700 dark:text-indigo-300 tracking-tight">
              {upcomingExams.length}
            </div>
          </div>

          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
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
          className="bento-card p-5 sm:p-5.5 rounded-3xl bg-gradient-to-br from-white via-white to-amber-50/25 dark:from-[#0E1726]/95 dark:via-[#10192A]/95 dark:to-[#221c1f]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-amber-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-rose-500" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                {t('tile_hw')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
          </div>

          <div className="my-3.5 flex items-center gap-3.5">
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
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-amber-700 dark:text-amber-300 tracking-tight">
              {pendingHw.length}
            </div>
          </div>

          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
            {pendingHw.filter((h) => h.priority === 'high').length > 0
              ? isAr
                ? `${pendingHw.filter((h) => h.priority === 'high').length} ذات أولوية قصوى`
                : `${pendingHw.filter((h) => h.priority === 'high').length} prioritaires`
              : t('tile_hw_sub')}
          </span>
        </div>
      </div>

      {/* =========================================================
          BENTO ROW 2.5: CORE BACCALAUREATE SUBJECTS MASTERY RADAR
          ========================================================= */}
      <div className="bento-card rounded-3xl bg-white/90 dark:bg-[#111726]/95 border border-slate-200/80 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'مواد البكالوريا ومستوى الجاهزية' : 'Matières du Baccalauréat & Préparation'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {coreSubjectsData.length} {isAr ? 'مواد أساسية' : 'matières clés'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'انقر على أي مادة لاختيارها فوراً في شريط المهام أو متابعة تقدمها'
                  : 'Cliquez sur une matière pour la sélectionner dans vos tâches ou réviser'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('average')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1 shrink-0 self-end sm:self-center cursor-pointer transition-colors"
          >
            <span>{isAr ? 'سجل النقط والمعاملات' : 'Toutes les matières'}</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {coreSubjectsData.map((subj) => (
            <div
              key={subj.id}
              onClick={() => {
                setQuickTaskSubject(subj.name);
                setTaskFilter('all');
              }}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-xs ${subj.theme.cardBg} ${subj.theme.borderColor} ${subj.theme.hoverBorder} hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-2.5 h-2.5 rounded-full ${subj.theme.dotBg} ring-2 ring-white dark:ring-slate-900 shadow-xs`} />
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${subj.theme.badgeBg}`}>
                  Coeff {subj.coefficient}
                </span>
              </div>

              <div className="my-2.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:underline">
                  {subj.name}
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  {subj.averageGrade !== null ? (
                    <>
                      <span className={`text-sm font-black font-['Outfit'] ${subj.theme.accentText}`}>
                        {subj.averageGrade.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400">/ 20</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">
                      {subj.lessonsCount > 0
                        ? `${subj.lessonsCount} ${isAr ? 'دروس' : 'leçons'}`
                        : isAr ? 'قيد الإعداد' : 'En cours'}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>{subj.doneTasks}/{subj.totalTasks} {isAr ? 'مهام' : 'tâches'}</span>
                  <span>{subj.taskProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800/80 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${subj.theme.progressGradient} rounded-full transition-all duration-300`}
                    style={{ width: `${subj.taskProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================
          BENTO ROW 3: DAILY EXECUTION (8 COLS) & DEADLINES RADAR (4 COLS)
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Bento Box 5: Daily Tasks & Interactive Streak Confirmation (8 cols) */}
        <div className="lg:col-span-8 bento-card relative overflow-hidden rounded-3xl bg-white dark:bg-[#111726]/95 border border-slate-200/80 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600" />
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-xs">
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
                    ? 'اضغط على زر الدائرة لتأكيد إنجاز المهمة وإشعال شعلة الانضباط'
                    : 'Cochez une tâche pour la valider et faire grimper votre série de révision'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl text-xs font-semibold border border-slate-200/60 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTaskFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${taskFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  {isAr ? 'الكل' : 'Toutes'}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('todo')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${taskFilter === 'todo'
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  {isAr ? 'قيد الإنجاز' : 'À faire'}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${taskFilter === 'completed'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  {isAr ? 'المكتملة' : 'Faites'}
                </button>
              </div>

              <button
                onClick={() => onNavigateTab('tasks')}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500 flex items-center gap-1 shrink-0 ml-1 cursor-pointer transition-colors"
              >
                <span>{isAr ? 'عرض الكل' : 'Voir tout'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Daily Completion Progress Bar */}
          {(appData.tasks || []).length > 0 && (
            <div className="space-y-1.5 bg-slate-50/80 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
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

          {/* Quick Add Task Input Form on Dashboard with Type Differentiation */}
          {onAddTask && (
            <form onSubmit={handleQuickSubmitTask} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <input
                type="text"
                placeholder={
                  isAr
                    ? 'أضف مهمة، واجب، أو فرض (مثال: واجب الأعداد العقدية ص 45)...'
                    : 'Ajouter une tâche, devoir ou contrôle (ex: Devoir Maths p.45)...'
                }
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400"
              />

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Task Type Selector */}
                <select
                  value={quickTaskType}
                  onChange={(e) => setQuickTaskType(e.target.value as any)}
                  className="px-2.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  title={isAr ? 'نوع المهمة' : 'Type de tâche'}
                >
                  <option value="homework">{isAr ? '📚 واجب منزلي' : '📚 Devoir'}</option>
                  <option value="quiz">{isAr ? '⚡ فرض محروس' : '⚡ Contrôle'}</option>
                  <option value="exam">{isAr ? '🎯 إمتحان' : '🎯 Examen'}</option>
                  <option value="project">{isAr ? '🎓 مشروع أستاذ' : '🎓 Projet'}</option>
                  <option value="revision">{isAr ? '🧠 مراجعة' : '🧠 Révision'}</option>
                </select>

                <select
                  value={quickTaskSubject}
                  onChange={(e) => setQuickTaskSubject(e.target.value)}
                  className="px-2.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer max-w-[130px] truncate"
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
                  className="px-2.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="urgent">{isAr ? '🚨 قصوى' : '🚨 Urgent'}</option>
                  <option value="high">{isAr ? '🔴 مرتفعة' : '🔴 Haute'}</option>
                  <option value="medium">{isAr ? '🟡 متوسطة' : '🟡 Moyenne'}</option>
                  <option value="low">{isAr ? '🟢 عادية' : '🟢 Normale'}</option>
                </select>

                <button
                  type="submit"
                  disabled={!quickTaskTitle.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all shrink-0 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'إضافة' : 'Ajouter'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Preset Quick Chips (Distinct Types: Homework, Exam, Project, Revision) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400">
              {isAr ? 'إضافة سريعة مسبقة:' : 'Modèles rapides :'}
            </span>
            <button
              type="button"
              onClick={() => handleAddPresetTask('Devoir Nombres Complexes', 'Mathématiques', 'high', 'homework')}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 transition-all cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>{isAr ? 'واجب رياضيات' : 'Devoir Maths'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetTask('Contrôle Continu Physique', 'Physique-Chimie', 'urgent', 'quiz')}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold border border-rose-500/25 transition-all cursor-pointer"
            >
              <Zap className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>{isAr ? 'فرض فيزياء' : 'Contrôle PC'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetTask('Projet Recherche Philosophie', 'Philosophie', 'medium', 'project')}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/25 transition-all cursor-pointer"
            >
              <GraduationCap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>{isAr ? 'مشروع أستاذ' : 'Projet Philo'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetTask('Schéma Bilan SVT', 'SVT', 'medium', 'revision')}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-semibold border border-sky-500/25 transition-all cursor-pointer"
            >
              <Brain className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              <span>{isAr ? 'تلخيص SVT' : 'Bilan SVT'}</span>
            </button>
          </div>

          {/* Urgent Spotlight Banner (When Overdue or Urgent tasks exist) */}
          {urgentAttentionTasks.length > 0 && taskFilter !== 'completed' && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border-2 border-rose-500/30 dark:border-rose-500/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/30 animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <span>
                      {isAr
                        ? `تنبيه: لديك ${urgentAttentionTasks.length} مهام أو واجبات عاجلة تتطلب تركيزك!`
                        : `Attention : ${urgentAttentionTasks.length} tâches/devoirs urgents requièrent votre attention !`}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                    {isAr
                      ? 'مهمة مستعجلة، انقر للانتقال إليها والبدء فوراً لضمان عدم التراكم:'
                      : 'Priorités immédiates pour votre examen :'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {urgentAttentionTasks.slice(0, 3).map((uTask) => (
                  <button
                    key={uTask.id}
                    type="button"
                    onClick={() => {
                      chimePlayer.playChime('click');
                      onNavigateTab('tasks');
                    }}
                    className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs cursor-pointer transition-all active:scale-95"
                  >
                    <Flame className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
                    <span className="max-w-[110px] truncate">{uTask.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tasks List with Visual Differentiation System */}
          <div className="space-y-2 pt-1 max-h-[380px] overflow-y-auto no-scrollbar">
            {(appData.tasks || [])
              .filter((task) => {
                if (taskFilter === 'todo') return task.status !== 'completed';
                if (taskFilter === 'completed') return task.status === 'completed';
                return true;
              })
              .map((task) => {
                const isCompleted = task.status === 'completed';
                const subjectInfo = BAC_SUBJECTS.find((s) => s.name === task.subject);
                const typeVisual = TASK_TYPES_VISUAL[task.type || 'revision'] || TASK_TYPES_VISUAL.revision;
                const TypeIcon = typeVisual.icon;
                const urgency = evaluateTaskUrgency(task.dueDate, task.dueTime, task.priority, language);

                return (
                  <div
                    key={task.id}
                    className={`group p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${isCompleted
                      ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 opacity-80'
                      : `${urgency.cardBgClass} ${urgency.borderLeftClass} hover:border-teal-500/60 hover:shadow-md`
                      }`}
                  >
                    {/* Confirmation Button & Task Visual Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (isCompleted) {
                            chimePlayer.playChime('uncheck');
                          } else {
                            chimePlayer.playChime('complete');
                          }
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
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${isCompleted
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

                      {/* Clickable Card Body: Navigates to Tasks Tab */}
                      <div
                        onClick={() => {
                          chimePlayer.playChime('click');
                          onNavigateTab('tasks');
                        }}
                        className="min-w-0 flex-1 cursor-pointer"
                        title={isAr ? 'انقر للانتقال وتفاصيل المهمة' : 'Cliquez pour ouvrir la tâche'}
                      >
                        {/* Top Meta Row: Type Badge + Subject + Urgency Tag + Priority */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {/* 1. Distinct Task Type Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${typeVisual.badgeClass}`}
                          >
                            <TypeIcon className="w-2.5 h-2.5" />
                            <span>{isAr ? typeVisual.labelAr : typeVisual.labelFr}</span>
                          </span>

                          {/* 2. Subject Badge with Subject Dot */}
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            <span
                              className={`w-2 h-2 rounded-full ${subjectInfo?.dotColor || 'bg-teal-500'}`}
                            />
                            <span>{task.subject}</span>
                          </span>

                          {/* 3. Urgency Tag (Overdue, Due Today, Soon) */}
                          {!isCompleted && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${urgency.badgeClass}`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>{urgency.label}</span>
                            </span>
                          )}

                          {/* 4. Urgent Priority Tag */}
                          {(task.priority === 'urgent' || task.priority === 'high') && !isCompleted && (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                                task.priority === 'urgent'
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              }`}
                            >
                              <Flame className="w-2.5 h-2.5 fill-current" />
                              <span>
                                {task.priority === 'urgent'
                                  ? (isAr ? 'عاجلة جداً' : 'Urgente')
                                  : (isAr ? 'أولوية قصوى' : 'Haute')}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Task Title with Conditional Strikethrough & Hover Transition */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                              }`}
                          >
                            {task.title}
                          </span>
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black shrink-0">
                              <Flame className="w-3 h-3 fill-emerald-500 text-emerald-500 shrink-0" />
                              <span>{isAr ? 'تم التأكيد' : 'Validée'}</span>
                            </span>
                          )}
                        </div>

                        {/* Subtasks Progress mini-bar if checklist exists */}
                        {task.checklist && task.checklist.length > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full transition-all"
                                style={{
                                  width: `${
                                    (task.checklist.filter((c) => c.completed).length /
                                      task.checklist.length) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">
                              {task.checklist.filter((c) => c.completed).length}/{task.checklist.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Actions (Direct Open + Delete) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Direct Open Button */}
                      <button
                        type="button"
                        onClick={() => {
                          chimePlayer.playChime('click');
                          onNavigateTab('tasks');
                        }}
                        title={isAr ? 'فتح تفاصيل المهمة' : 'Ouvrir les détails'}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 dark:bg-slate-800/80 dark:hover:bg-teal-950/40 text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-300 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isAr ? 'فتح' : 'Ouvrir'}</span>
                        <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                      </button>

                      {/* Delete button */}
                      {onDeleteTask && (
                        <button
                          type="button"
                          onClick={() => {
                            chimePlayer.playChime('delete');
                            onDeleteTask(task.id);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                          title={isAr ? 'حذف' : 'Supprimer'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
                <div className="text-center py-8 text-slate-400 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <Sparkles className="w-6 h-6 mx-auto text-teal-500/60" />
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
        <div className="lg:col-span-4 bento-card relative overflow-hidden rounded-3xl bg-white dark:bg-[#111726]/95 border border-slate-200/80 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-400 to-amber-500" />
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
                <Award className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isAr ? 'أقرب الفروض' : 'Prochaines Épreuves'}</span>
              </div>
              {upcomingExams.slice(0, 2).map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => onNavigateTab('quizzes')}
                  className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between gap-2.5 cursor-pointer hover:border-indigo-400/60 hover:shadow-xs transition-all duration-200 group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:underline">
                      {exam.title}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {exam.subject} • {exam.date}
                    </div>
                  </div>
                  <span className="text-[11px] font-black font-['Outfit'] text-indigo-600 dark:text-indigo-400 shrink-0 bg-white dark:bg-indigo-900/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-700/60">
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
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>{isAr ? 'أقرب الواجبات' : 'Devoirs Urgents'}</span>
              </div>
              {pendingHw.slice(0, 2).map((hw) => (
                <div
                  key={hw.id}
                  className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => {
                        if (hw.status === 'submitted') {
                          chimePlayer.playChime('uncheck');
                        } else {
                          chimePlayer.playChime('complete');
                        }
                        onToggleHomework(hw.id);
                      }}
                      className="w-7 h-7 rounded-lg border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 hover:border-amber-500 transition-colors cursor-pointer"
                    >
                      {hw.status === 'submitted' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
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
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
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
              className="text-teal-600 dark:text-teal-400 font-bold hover:text-teal-500 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{isAr ? 'فتح المخطط' : 'Ouvrir'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
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
          className="bento-card p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-white via-white to-teal-50/30 dark:from-[#0E1726]/95 dark:via-[#10192A]/95 dark:to-[#122432]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-teal-500/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarClock className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-teal-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </div>
          <div className="mt-3.5">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'جدول الحصص والتخطيط' : 'Time Blocking Planner'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isAr ? 'تنظيم الوقت ومخطط الحصص' : 'Glisser-déposer stickers & blocs'}
            </div>
          </div>
        </div>

        {/* Launchpad 2: Leitner Smart Revision */}
        <div
          onClick={() => onNavigateTab('revision')}
          className="bento-card p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-white via-white to-purple-50/30 dark:from-[#0E1726]/95 dark:via-[#10192A]/95 dark:to-[#1f1936]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-purple-500/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Brain className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </div>
          <div className="mt-3.5">
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
          className="bento-card p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-white via-white to-amber-50/30 dark:from-[#0E1726]/95 dark:via-[#10192A]/95 dark:to-[#261e1b]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-amber-500/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </div>
          <div className="mt-3.5">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'عادات الانضباط' : 'Rituels & Habitudes'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {appData.habits?.length || 0} {isAr ? 'عادات يومية مبرمجة' : 'habitudes actives'}
            </div>
          </div>
        </div>

        {/* Launchpad 4: Motivational Quote Bento Tile */}
        <div className="bento-card p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-teal-500/10 via-indigo-500/10 to-purple-500/10 dark:from-teal-950/40 dark:via-indigo-950/35 dark:to-purple-950/35 border border-teal-500/30 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Quote className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span>{isAr ? 'جرعة تحفيز' : 'Inspiration'}</span>
            </div>
            <button
              onClick={() => setQuoteIndex((prev) => prev + 1)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title={isAr ? 'تغيير الحكمة' : 'Changer'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white dark:bg-[#111726] text-slate-900 dark:text-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold font-['Outfit']">
                {isAr ? 'تعديل موعد الامتحان' : 'Modifier la date de l\'examen'}
              </h3>
              <button
                onClick={() => setIsEditDateOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditDateOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold shadow-md shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
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
