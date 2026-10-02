import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Save,
  CheckCircle,
  BookOpen,
  Trophy,
  Flame,
  PieChart,
  Info,
  CheckSquare,
  BarChart3,
  Clock,
  Target,
  Zap,
  Layers,
  HelpCircle,
  ListOrdered,
  CalendarDays,
  CalendarRange,
  Plus,
  Play,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  AppLanguage,
  FullAppData,
  MonthlyReviewData,
  TimeBlock,
  WeeklyReviewData,
  MainTabType,
} from '../../types';
import { BAC_SUBJECTS } from '../../utils/constants';
import { chimePlayer } from '../../utils/audio';
import { getT } from '../../utils/i18n';
import {
  calculateBestStreak,
  calculateDailyStreak,
  getAllStreakDates,
  getLocalDateStr,
  getTimeBlockCompletionOccurrences,
} from '../../utils/streak';

interface WeeklyReviewTabProps {
  appData: FullAppData;
  language: AppLanguage;
  onSaveWeeklyReview: (weekMondayKey: string, review: WeeklyReviewData) => void;
  onSaveMonthlyReview?: (monthKey: string, review: MonthlyReviewData) => void;
  onAddTimeBlock?: (newBlock: Omit<TimeBlock, 'id'>) => void;
  onStartFocusMode?: (subjectName?: string) => void;
  onNavigateTab?: (tab: MainTabType) => void;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// Get the Monday date for a given date
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

// Format date to YYYY-MM-DD
function formatMondayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Calculate block duration in hours
function getBlockDurationHours(b: TimeBlock): number {
  if (!b.startTime || !b.endTime) return 1;
  const [sh, sm] = b.startTime.split(':').map(Number);
  const [eh, em] = b.endTime.split(':').map(Number);
  const startM = (sh || 0) * 60 + (sm || 0);
  const endM = (eh || 0) * 60 + (em || 0);
  const rawDiff = endM > startM ? endM - startM : (endM + 1440 - startM);
  const diffMins = Math.max(1, rawDiff);
  return diffMins / 60;
}

// Resolve the date string (YYYY-MM-DD) for a timeblock
function getBlockDateStr(b: TimeBlock): string {
  if (b.isCompleted && b.completedAt) {
    const completedDate = new Date(b.completedAt);
    if (!Number.isNaN(completedDate.getTime())) return getLocalDateStr(completedDate);
  }
  if (b.dateKey && b.dateKey.length === 10) return b.dateKey;
  if (b.completedAt && b.completedAt.length >= 10) return b.completedAt.slice(0, 10);
  if (b.createdAt && b.createdAt.length >= 10) return b.createdAt.slice(0, 10);

  // Fallback: derive from current week's dayOfWeek
  const now = new Date();
  const currentDay = now.getDay();
  const currentMondayOffset = currentDay === 0 ? 6 : currentDay - 1;
  const targetMondayOffset = b.dayOfWeek === 0 ? 6 : b.dayOfWeek - 1;
  const diffDays = targetMondayOffset - currentMondayOffset;
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diffDays);
  return `${targetDate.getFullYear()}-${pad2(targetDate.getMonth() + 1)}-${pad2(targetDate.getDate())}`;
}

interface CompletedPlannerOccurrence {
  block: TimeBlock;
  date: string;
  completedAt?: string;
}

function getCompletedPlannerOccurrences(block: TimeBlock): CompletedPlannerOccurrence[] {
  return getTimeBlockCompletionOccurrences(block).map((occurrence) => ({
    block,
    date: occurrence.dateKey,
    completedAt: occurrence.completedAt,
  }));
}

function getBlockScheduledDateInWeek(block: TimeBlock, monday: Date): string {
  if (block.dateKey) return block.dateKey;
  const offset = block.dayOfWeek === 0 ? 6 : block.dayOfWeek - 1;
  const scheduledDate = new Date(monday);
  scheduledDate.setDate(monday.getDate() + offset);
  return formatMondayKey(scheduledDate);
}

function getBlockScheduledDatesInMonth(block: TimeBlock, year: number, monthIndex: number): string[] {
  if (block.dateKey) return block.dateKey.startsWith(`${year}-${pad2(monthIndex + 1)}`) ? [block.dateKey] : [];
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    if (date.getDay() === block.dayOfWeek) dates.push(formatMondayKey(date));
  }
  return dates;
}

// Dynamic Achievements calculation
function calculateAchievements(appData: FullAppData) {
  const completedTasks = (appData.tasks || []).filter((t) => t.status === 'completed');
  const completedHabits = (appData.habits || []).filter((h) => h.history && h.history.length > 0);
  const allStreakDates = getAllStreakDates(appData.tasks || [], appData.habitLogs || {}, appData.habits || [], appData.timeBlocks || []);
  const currentStreak = calculateDailyStreak(appData.tasks || [], Array.from(allStreakDates), appData.timeBlocks || []).currentStreak;
  const bestStreak = calculateBestStreak(allStreakDates);
  const highScores = (appData.quizzes || []).filter((q) => q.actualScore !== undefined && q.actualScore >= 18);
  const notesCount = (appData.notes || []).length;
  const totalStudyHours = (appData.timeBlocks || [])
    .filter((b) => b.type === 'study')
    .reduce((acc, b) => acc + getTimeBlockCompletionOccurrences(b).length * getBlockDurationHours(b), 0);

  return [
    {
      id: 'ach-1',
      icon: '⚡',
      title: { fr: 'Premier Pas', ar: 'الخطوة الأولى', en: 'First Step' },
      desc: { fr: 'Compléter une première tâche ou session d\'étude', ar: 'إكمال أول مهمة أو جلسة دراسية', en: 'Complete your first task or study session' },
      progress: completedTasks.length > 0 || totalStudyHours > 0 ? 100 : 0,
      unlocked: completedTasks.length > 0 || totalStudyHours > 0,
    },
    {
      id: 'ach-2',
      icon: '🔥',
      title: { fr: 'Flamme Ardente', ar: 'الشعلة المتوقدة', en: 'Burning Streak' },
      desc: { fr: 'Atteindre une série de 7 jours consécutifs', ar: 'الوصول إلى سلسلة 7 أيام متواصلة', en: 'Reach a 7-day streak' },
      progress: Math.min(100, Math.round((Math.max(currentStreak, bestStreak) / 7) * 100)),
      unlocked: Math.max(currentStreak, bestStreak) >= 7,
    },
    {
      id: 'ach-3',
      icon: '📚',
      title: { fr: 'Marathonien du Bac', ar: 'ماراثون الباك', en: 'Bac Marathoner' },
      desc: { fr: 'Étudier plus de 20h au total', ar: 'الدراسة أكثر من 20 ساعة في المجموع', en: 'Study >20h in total' },
      progress: Math.min(100, Math.round((totalStudyHours / 20) * 100)),
      unlocked: totalStudyHours >= 20,
    },
    {
      id: 'ach-4',
      icon: '🧠',
      title: { fr: 'Mémoire d\'Éléphant', ar: 'ذاكرة حديدية', en: 'Master of Memory' },
      desc: { fr: 'Compléter 10 tâches de révision', ar: 'إكمال 10 مهام للمراجعة', en: 'Complete 10 revision tasks' },
      progress: Math.min(100, Math.round((completedTasks.length / 10) * 100)),
      unlocked: completedTasks.length >= 10,
    },
    {
      id: 'ach-5',
      icon: '🎯',
      title: { fr: 'Perfectionniste', ar: 'قمة الدقة', en: 'Perfectionist' },
      desc: { fr: 'Obtenir une note de 18/20 ou plus à un quiz', ar: 'الحصول على نقطة 18 أو أعلى في اختبار', en: 'Score 18/20 or higher on a quiz' },
      progress: highScores.length > 0 ? 100 : (appData.quizzes && appData.quizzes.length > 0 ? 50 : 0),
      unlocked: highScores.length > 0,
    },
    {
      id: 'ach-6',
      icon: '🏆',
      title: { fr: 'Mention Très Bien', ar: 'حسن جداً', en: 'Top Honors' },
      desc: { fr: 'Compléter 25 tâches avec succès', ar: 'إكمال 25 مهمة بنجاح', en: 'Complete 25 tasks successfully' },
      progress: Math.min(100, Math.round((completedTasks.length / 25) * 100)),
      unlocked: completedTasks.length >= 25,
    },
    {
      id: 'ach-7',
      icon: '🌅',
      title: { fr: 'Habitudes Gagnantes', ar: 'العادات الرابحة', en: 'Winning Habits' },
      desc: { fr: 'Valider 5 habitudes quotidiennes', ar: 'تثبيت وتأكيد 5 عادات يومية', en: 'Validate 5 daily habits' },
      progress: Math.min(100, Math.round((completedHabits.length / 5) * 100)),
      unlocked: completedHabits.length >= 5,
    },
    {
      id: 'ach-8',
      icon: '📝',
      title: { fr: 'Rédacteur Assidu', ar: 'الكاتب الملتزم', en: 'Diligent Writer' },
      desc: { fr: 'Créer 5 fiches de cours avec résumés détaillés', ar: 'إنشاء 5 بطاقات تلخيص للمقرر', en: 'Create 5 course summary notes' },
      progress: Math.min(100, Math.round((notesCount / 5) * 100)),
      unlocked: notesCount >= 5,
    },
  ];
}

export const WeeklyReviewTab: React.FC<WeeklyReviewTabProps> = ({
  appData,
  language,
  onSaveWeeklyReview,
  onSaveMonthlyReview,
  onAddTimeBlock,
  onStartFocusMode,
  onNavigateTab,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  // Main Section Navigation Switcher: Weekly Review | Monthly Review | Trophies
  const [activeReviewView, setActiveReviewView] = useState<'weekly' | 'monthly' | 'trophies'>('weekly');

  // Weekly Navigation State
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Monthly Navigation State (0 = current month, -1 = last month, etc.)
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);

  // Heatmap click state
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{
    dateStr: string;
    count: number;
    studyHours: number;
    tasksCount: number;
    habitsCount: number;
    studySessionsCount: number;
  } | null>(null);

  // Interactive Drilldown & Action States
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [quickLogSubject, setQuickLogSubject] = useState<string>(BAC_SUBJECTS[0].name);
  const [quickLogDuration, setQuickLogDuration] = useState<number>(60);
  const [quickLogDate, setQuickLogDate] = useState<string>(() => getLocalDateStr(new Date()));
  const [quickLogType, setQuickLogType] = useState<'study' | 'exercises' | 'revision' | 'homework'>('study');
  const [quickLogTitle, setQuickLogTitle] = useState<string>('');

  // Selected Subject Detail modal
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<(typeof BAC_SUBJECTS)[0] | null>(null);

  // Selected Day in Bar chart (0..6, where 0=Monday)
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [subjectBreakdownPeriod, setSubjectBreakdownPeriod] = useState<'week' | 'month'>('week');
  const [expandedMonthlySubject, setExpandedMonthlySubject] = useState<string | null>(null);
  const [expandedMonthlyWeek, setExpandedMonthlyWeek] = useState<number | null>(null);

  // Show More / Show Less for Subject Breakdown Tables (default 3 subjects visible)
  const [isMonthlySubjectsExpanded, setIsMonthlySubjectsExpanded] = useState<boolean>(false);
  const DEFAULT_VISIBLE_SUBJECTS = 3;

  // Dynamic achievements
  const achievements = useMemo(() => calculateAchievements(appData), [appData]);

  // ==========================================
  // 1. WEEKLY REVIEW CALCULATIONS & DATES
  // ==========================================
  const selectedMonday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + currentWeekOffset * 7);
    return getMonday(d);
  }, [currentWeekOffset]);

  const weekMondayKey = useMemo(() => formatMondayKey(selectedMonday), [selectedMonday]);
  const weekSundayDate = useMemo(() => {
    const d = new Date(selectedMonday);
    d.setDate(selectedMonday.getDate() + 6);
    return d;
  }, [selectedMonday]);
  const weekSundayKey = useMemo(() => formatMondayKey(weekSundayDate), [weekSundayDate]);
  const weekRangeDisplay = useMemo(() => {
    const locale = isAr ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR';
    const start = selectedMonday.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const end = weekSundayDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} – ${end}`;
  }, [selectedMonday, weekSundayDate, isAr, language]);

  React.useEffect(() => {
    setSelectedDayIdx(null);
  }, [weekMondayKey]);

  // Weekly stats aggregated strictly from completed Planner tasks / TimeBlocks
  const weeklyStats = useMemo(() => {
    const allStudyBlocks = (appData.timeBlocks || []).filter((b) => b.type === 'study');

    // Planned blocks are weekly occurrences. Completed occurrences are separate
    // records, so a recurring block can contribute once in every week it was done.
    const weekBlocks = allStudyBlocks.filter((b) => {
      const bDate = getBlockScheduledDateInWeek(b, selectedMonday);
      return bDate >= weekMondayKey && bDate <= weekSundayKey;
    });

    const completedBlocks = allStudyBlocks
      .flatMap(getCompletedPlannerOccurrences)
      .filter((occurrence) => occurrence.date >= weekMondayKey && occurrence.date <= weekSundayKey);

    // Sum hours across all subjects
    let totalCompletedHours = 0;
    let totalPlannedHours = 0;
    const subjectHoursMap: Record<string, number> = {};
    const subjectSessionsMap: Record<string, number> = {};
    const subjectPlannedMap: Record<string, number> = {};

    // Initialize all known BAC subjects with 0
    BAC_SUBJECTS.forEach((s) => {
      subjectHoursMap[s.name] = 0;
      subjectSessionsMap[s.name] = 0;
      subjectPlannedMap[s.name] = 0;
    });

    // Planned hours
    weekBlocks.forEach((b) => {
      const dur = getBlockDurationHours(b);
      totalPlannedHours += dur;
      subjectPlannedMap[b.subject] = (subjectPlannedMap[b.subject] || 0) + dur;
    });

    // Completed hours (every hour completed in Planner logs here!)
    completedBlocks.forEach(({ block }) => {
      const dur = getBlockDurationHours(block);
      totalCompletedHours += dur;
      subjectHoursMap[block.subject] = (subjectHoursMap[block.subject] || 0) + dur;
      subjectSessionsMap[block.subject] = (subjectSessionsMap[block.subject] || 0) + 1;
    });

    const totalSessions = weekBlocks.length;
    const completedSessions = completedBlocks.length;
    const sessionRate = totalSessions > 0 ? Math.min(100, Math.round((completedSessions / totalSessions) * 100)) : 0;

    // Determine top subject studied
    let topSubj = BAC_SUBJECTS[0].name;
    let maxHours = -1;
    Object.entries(subjectHoursMap).forEach(([subj, hrs]) => {
      if (hrs > maxHours && hrs > 0) {
        maxHours = hrs;
        topSubj = subj;
      }
    });

    // Day by day distribution (Monday to Sunday)
    const dayNames = isAr
      ? ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
      : language === 'en'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    const dayHours = [0, 0, 0, 0, 0, 0, 0];
    completedBlocks.forEach(({ date, block }) => {
      const bObj = new Date(date + 'T12:00:00');
      const jsDay = bObj.getDay(); // 0 is Sun, 1 is Mon
      const monIdx = jsDay === 0 ? 6 : jsDay - 1;
      if (monIdx >= 0 && monIdx < 7) {
        dayHours[monIdx] += getBlockDurationHours(block);
      }
    });

    return {
      totalCompletedHours,
      totalPlannedHours,
      completedSessions,
      totalSessions,
      sessionRate,
      topSubject: maxHours > 0 ? topSubj : (isAr ? 'لم تُحدد بعد' : 'En attente'),
      subjectHoursMap,
      subjectSessionsMap,
      subjectPlannedMap,
      dayNames,
      dayHours,
    };
  }, [appData.timeBlocks, weekMondayKey, weekSundayKey, selectedMonday, isAr, language]);

  const weeklyHomeworkStats = useMemo(() => {
    const dueThisWeek = (appData.homework || []).filter((item) => item.dueDate >= weekMondayKey && item.dueDate <= weekSundayKey);
    const completed = dueThisWeek.filter((item) => item.status === 'submitted').length;
    return {
      total: dueThisWeek.length,
      completed,
      completionRate: dueThisWeek.length > 0 ? Math.round((completed / dueThisWeek.length) * 100) : 0,
    };
  }, [appData.homework, weekMondayKey, weekSundayKey]);

  // Donut chart segments calculation for Weekly Review
  const weeklyDonutSegments = useMemo(() => {
    const entries = (Object.entries(weeklyStats.subjectHoursMap) as [string, number][]).filter(
      ([_, hrs]) => hrs > 0
    );
    const total = weeklyStats.totalCompletedHours;
    if (total === 0 || entries.length === 0) return [];

    let currentAngle = 0;
    return entries.map(([subj, hrs]) => {
      const subjectInfo = BAC_SUBJECTS.find((s) => s.name === subj);
      const pct = (hrs / total) * 100;
      const angle = (hrs / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        subject: subj,
        hours: hrs.toFixed(1),
        percentage: Math.round(pct),
        color: subjectInfo?.hexColor || '#14B8A6',
        startAngle,
        angle,
      };
    });
  }, [weeklyStats]);

  const weeklyConicGradientStr = useMemo(() => {
    if (weeklyDonutSegments.length === 0) {
      return 'conic-gradient(#334155 0deg 360deg)';
    }
    let str = 'conic-gradient(';
    weeklyDonutSegments.forEach((seg, idx) => {
      const isLast = idx === weeklyDonutSegments.length - 1;
      str += `${seg.color} ${seg.startAngle}deg ${seg.startAngle + seg.angle}deg${isLast ? '' : ', '}`;
    });
    str += ')';
    return str;
  }, [weeklyDonutSegments]);

  // Exact dates for the 7 days of the selected week (Monday to Sunday)
  const weekDates = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = new Date(selectedMonday);
      d.setDate(selectedMonday.getDate() + i);
      return formatMondayKey(d);
    });
  }, [selectedMonday]);

  // BAC Subject Balance Metrics
  const bacBalanceMetrics = useMemo(() => {
    const scienceSubjs = ['Mathématiques', 'Physique-Chimie', 'SVT', 'Sciences'];
    let scienceHrs = 0;
    let literaryHrs = 0;

    (Object.entries(weeklyStats.subjectHoursMap) as [string, number][]).forEach(([subj, hrs]) => {
      if (scienceSubjs.some((s) => subj.toLowerCase().includes(s.toLowerCase()))) {
        scienceHrs += hrs;
      } else {
        literaryHrs += hrs;
      }
    });

    const total = weeklyStats.totalCompletedHours;
    const sciencePct = total > 0 ? Math.round((scienceHrs / total) * 100) : 0;
    const literaryPct = total > 0 ? Math.round((literaryHrs / total) * 100) : 0;

    let balanceBadge = isAr ? 'متوازن وممتاز' : 'Équilibré';
    let balanceColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    if (total === 0) {
      balanceBadge = isAr ? 'في انتظار التسجيل' : 'En attente';
      balanceColor = 'text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    } else if (sciencePct > 80) {
      balanceBadge = isAr ? 'تركيز علمي مكثف' : 'Dominante scientifique';
      balanceColor = 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20';
    } else if (literaryPct > 80) {
      balanceBadge = isAr ? 'تركيز أدبي ولغوي' : 'Dominante littéraire';
      balanceColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    }

    return { scienceHrs, literaryHrs, sciencePct, literaryPct, balanceBadge, balanceColor };
  }, [weeklyStats, isAr]);

  // Handler: Quick Log Study Session
  const handleQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddTimeBlock) return;

    const [year, month, day] = quickLogDate.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day, 12, 0, 0);
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    const endH = now.getHours();
    const endM = now.getMinutes();
    const totalMins = endH * 60 + endM;
    const startTotalMins = Math.max(0, totalMins - quickLogDuration);
    const startH = Math.floor(startTotalMins / 60);
    const startM = startTotalMins % 60;

    const defaultTitles: Record<string, string> = {
      study: isAr ? `حصة دراسة — ${quickLogSubject}` : `Session de cours — ${quickLogSubject}`,
      exercises: isAr ? `حل تمارين — ${quickLogSubject}` : `Exercices & Problèmes — ${quickLogSubject}`,
      revision: isAr ? `مراجعة مكثفة — ${quickLogSubject}` : `Révision Bac — ${quickLogSubject}`,
      homework: isAr ? `إنجاز واجب — ${quickLogSubject}` : `Devoir & Exercices — ${quickLogSubject}`,
    };

    onAddTimeBlock({
      title: quickLogTitle.trim() || defaultTitles[quickLogType] || `Session — ${quickLogSubject}`,
      subject: quickLogSubject,
      type: 'study',
      startTime: `${pad(startH)}:${pad(startM)}`,
      endTime: `${pad(endH)}:${pad(endM)}`,
      dayOfWeek: targetDate.getDay(),
      dateKey: quickLogDate,
      isCompleted: true,
      completedAt: `${quickLogDate}T${pad(endH)}:${pad(endM)}:00`,
      createdAt: new Date().toISOString(),
    });

    setIsQuickLogOpen(false);
    setQuickLogTitle('');
  };

  // Handler: Add 1h directly to a subject
  const handleAddOneHourToSubject = (subjName: string) => {
    if (!onAddTimeBlock) return;
    const todayStr = getLocalDateStr(new Date());
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const endH = now.getHours();
    const endM = now.getMinutes();
    const startTotalMins = Math.max(0, endH * 60 + endM - 60);
    const startH = Math.floor(startTotalMins / 60);
    const startM = startTotalMins % 60;

    onAddTimeBlock({
      title: isAr ? `مراجعة إضافية (1 س) — ${subjName}` : `Révision 1h — ${subjName}`,
      subject: subjName,
      type: 'study',
      startTime: `${pad(startH)}:${pad(startM)}`,
      endTime: `${pad(endH)}:${pad(endM)}`,
      dayOfWeek: now.getDay(),
      dateKey: todayStr,
      isCompleted: true,
      completedAt: now.toISOString(),
      createdAt: now.toISOString(),
    });

  };

  // Form states for the weekly review reflection
  const existingWeeklyReview = appData.weeklyReviews?.[weekMondayKey];
  const [wentWell, setWentWell] = useState(existingWeeklyReview?.wentWell || '');
  const [wentBad, setWentBad] = useState(existingWeeklyReview?.wentBad || '');
  const [improve, setImprove] = useState(existingWeeklyReview?.improve || '');
  const [targetHours, setTargetHours] = useState(existingWeeklyReview?.targetHours?.toString() || '4.0');
  const [prioritySubj, setPrioritySubj] = useState(existingWeeklyReview?.prioritySubj || BAC_SUBJECTS[0].name);

  // Sync weekly form when changing week
  React.useEffect(() => {
    const rev = appData.weeklyReviews?.[weekMondayKey];
    setWentWell(rev?.wentWell || '');
    setWentBad(rev?.wentBad || '');
    setImprove(rev?.improve || '');
    setTargetHours(rev?.targetHours?.toString() || '4.0');
    setPrioritySubj(rev?.prioritySubj || BAC_SUBJECTS[0].name);
  }, [weekMondayKey, appData.weeklyReviews]);

  // ==========================================
  // 2. MONTHLY REVIEW CALCULATIONS & DATES
  // ==========================================
  const selectedMonthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + currentMonthOffset);
    return d;
  }, [currentMonthOffset]);

  const selectedMonthKey = useMemo(() => {
    return `${selectedMonthDate.getFullYear()}-${pad2(selectedMonthDate.getMonth() + 1)}`;
  }, [selectedMonthDate]);

  const monthDisplayName = useMemo(() => {
    return selectedMonthDate.toLocaleDateString(
      isAr ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR',
      { month: 'long', year: 'numeric' }
    );
  }, [selectedMonthDate, isAr, language]);

  // Monthly stats aggregated strictly from completed Planner tasks / TimeBlocks
  const monthlyStats = useMemo(() => {
    const allStudyBlocks = (appData.timeBlocks || []).filter((b) => b.type === 'study');

    const monthBlocks = allStudyBlocks.flatMap((block) =>
      getBlockScheduledDatesInMonth(block, selectedMonthDate.getFullYear(), selectedMonthDate.getMonth())
        .map((date) => ({ block, date }))
    );
    const completedBlocks = allStudyBlocks
      .flatMap(getCompletedPlannerOccurrences)
      .filter((occurrence) => occurrence.date.startsWith(selectedMonthKey));

    let totalMonthlyHours = 0;
    let totalMonthlyPlanned = 0;
    const subjectHoursMap: Record<string, number> = {};
    const subjectSessionsMap: Record<string, number> = {};
    const subjectPlannedMap: Record<string, number> = {};

    BAC_SUBJECTS.forEach((s) => {
      subjectHoursMap[s.name] = 0;
      subjectSessionsMap[s.name] = 0;
      subjectPlannedMap[s.name] = 0;
    });

    monthBlocks.forEach(({ block }) => {
      const dur = getBlockDurationHours(block);
      totalMonthlyPlanned += dur;
      subjectPlannedMap[block.subject] = (subjectPlannedMap[block.subject] || 0) + dur;
    });

    completedBlocks.forEach(({ block }) => {
      const dur = getBlockDurationHours(block);
      totalMonthlyHours += dur;
      subjectHoursMap[block.subject] = (subjectHoursMap[block.subject] || 0) + dur;
      subjectSessionsMap[block.subject] = (subjectSessionsMap[block.subject] || 0) + 1;
    });

    const totalSessions = monthBlocks.length;
    const completedSessions = completedBlocks.length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // Days in this month
    const daysInMonth = new Date(
      selectedMonthDate.getFullYear(),
      selectedMonthDate.getMonth() + 1,
      0
    ).getDate();

    const dailyAverage = totalMonthlyHours > 0 ? (totalMonthlyHours / daysInMonth).toFixed(1) : '0.0';

    // Top subject studied in the month
    let topSubj = BAC_SUBJECTS[0].name;
    let maxHours = -1;
    Object.entries(subjectHoursMap).forEach(([subj, hrs]) => {
      if (hrs > maxHours && hrs > 0) {
        maxHours = hrs;
        topSubj = subj;
      }
    });

    // Week by week trajectory inside the month (W1: 1-7, W2: 8-14, W3: 15-21, W4: 22-28, W5: 29+)
    const weekBuckets = [
      { label: isAr ? 'الأسبوع 1' : 'Sem 1', range: '1-7', hours: 0 },
      { label: isAr ? 'الأسبوع 2' : 'Sem 2', range: '8-14', hours: 0 },
      { label: isAr ? 'الأسبوع 3' : 'Sem 3', range: '15-21', hours: 0 },
      { label: isAr ? 'الأسبوع 4' : 'Sem 4', range: '22-28', hours: 0 },
      { label: isAr ? 'الأسبوع 5' : 'Sem 5', range: '29+', hours: 0 },
    ];

    completedBlocks.forEach(({ block, date }) => {
      const dayNum = parseInt(date.slice(8, 10), 10);
      const dur = getBlockDurationHours(block);
      if (dayNum <= 7) weekBuckets[0].hours += dur;
      else if (dayNum <= 14) weekBuckets[1].hours += dur;
      else if (dayNum <= 21) weekBuckets[2].hours += dur;
      else if (dayNum <= 28) weekBuckets[3].hours += dur;
      else weekBuckets[4].hours += dur;
    });

    return {
      totalMonthlyHours,
      totalMonthlyPlanned,
      completedSessions,
      totalSessions,
      completionRate,
      dailyAverage,
      topSubject: maxHours > 0 ? topSubj : (isAr ? 'لم تُحدد بعد' : 'En attente'),
      subjectHoursMap,
      subjectSessionsMap,
      subjectPlannedMap,
      weekBuckets,
      daysInMonth,
    };
  }, [appData.timeBlocks, selectedMonthKey, selectedMonthDate, isAr]);

  // Completed sessions for the reference-style monthly drilldown. Completed work
  // is attributed to the actual completion date, matching the review totals above.
  const monthlyCompletedBlocks = useMemo(() => {
    return (appData.timeBlocks || [])
      .filter((block) => block.type === 'study')
      .flatMap((block) => getCompletedPlannerOccurrences(block)
        .filter((occurrence) => occurrence.date.startsWith(selectedMonthKey))
        .map((occurrence) => ({
          ...block,
          id: `${block.id}-${occurrence.date}`,
          dateKey: occurrence.date,
          completedAt: occurrence.completedAt,
          isCompleted: true,
          completedOccurrences: undefined,
        })))
      .sort((a, b) => {
        const dateOrder = getBlockDateStr(a).localeCompare(getBlockDateStr(b));
        return dateOrder || a.startTime.localeCompare(b.startTime);
      });
  }, [appData.timeBlocks, selectedMonthKey]);

  const monthlySubjectEntries = useMemo(() => {
    return (Object.entries(monthlyStats.subjectHoursMap) as [string, number][])
      .filter(([, hours]) => hours > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [monthlyStats]);

  const monthlyWeekDetails = useMemo(() => {
    const ranges: [number, number][] = [[1, 7], [8, 14], [15, 21], [22, 28], [29, monthlyStats.daysInMonth]];
    return monthlyStats.weekBuckets.map((bucket, index) => {
      const [startDay, endDay] = ranges[index];
      const blocks = monthlyCompletedBlocks.filter((block) => {
        const day = Number(getBlockDateStr(block).slice(8, 10));
        return day >= startDay && day <= endDay;
      });
      return { ...bucket, startDay, endDay, blocks };
    });
  }, [monthlyStats.weekBuckets, monthlyStats.daysInMonth, monthlyCompletedBlocks]);

  const gradeProgress = useMemo(() => {
    const gradesBySubject = new Map<string, typeof appData.grades>();
    (appData.grades || []).forEach((grade) => {
      const subjectGrades = gradesBySubject.get(grade.subject) || [];
      subjectGrades.push(grade);
      gradesBySubject.set(grade.subject, subjectGrades);
    });

    return Array.from(gradesBySubject.entries())
      .map(([subject, grades]) => {
        const orderedGrades = [...grades].sort((a, b) => a.date.localeCompare(b.date));
        const coefficientTotal = orderedGrades.reduce((sum, grade) => sum + (grade.coeff || 1), 0);
        const average = coefficientTotal > 0
          ? orderedGrades.reduce((sum, grade) => sum + grade.grade * (grade.coeff || 1), 0) / coefficientTotal
          : 0;
        const previous = orderedGrades[orderedGrades.length - 2];
        const latest = orderedGrades[orderedGrades.length - 1];
        const delta = latest && previous ? latest.grade - previous.grade : null;
        return {
          subject,
          average,
          delta,
          count: orderedGrades.length,
          color: BAC_SUBJECTS.find((item) => item.name === subject)?.hexColor || '#14B8A6',
        };
      })
      .sort((a, b) => {
        const aIndex = BAC_SUBJECTS.findIndex((subject) => subject.name === a.subject);
        const bIndex = BAC_SUBJECTS.findIndex((subject) => subject.name === b.subject);
        return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
      });
  }, [appData.grades]);

  const weeklyReviewArchive = useMemo(() => {
    return Object.entries(appData.weeklyReviews || {}).sort(([a], [b]) => b.localeCompare(a));
  }, [appData.weeklyReviews]);

  const jumpToArchivedWeek = (weekKey: string) => {
    const targetMonday = new Date(`${weekKey}T12:00:00`);
    const currentMonday = getMonday(new Date());
    const dayDifference = Math.round((targetMonday.getTime() - currentMonday.getTime()) / 86400000);
    setCurrentWeekOffset(Math.round(dayDifference / 7));
    setActiveReviewView('weekly');
  };

  // Donut chart segments for Monthly Review
  const monthlyDonutSegments = useMemo(() => {
    const entries = (Object.entries(monthlyStats.subjectHoursMap) as [string, number][]).filter(
      ([_, hrs]) => hrs > 0
    );
    const total = monthlyStats.totalMonthlyHours;
    if (total === 0 || entries.length === 0) return [];

    let currentAngle = 0;
    return entries.map(([subj, hrs]) => {
      const subjectInfo = BAC_SUBJECTS.find((s) => s.name === subj);
      const pct = (hrs / total) * 100;
      const angle = (hrs / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        subject: subj,
        hours: hrs.toFixed(1),
        percentage: Math.round(pct),
        color: subjectInfo?.hexColor || '#14B8A6',
        startAngle,
        angle,
      };
    });
  }, [monthlyStats]);

  const monthlyConicGradientStr = useMemo(() => {
    if (monthlyDonutSegments.length === 0) {
      return 'conic-gradient(#334155 0deg 360deg)';
    }
    let str = 'conic-gradient(';
    monthlyDonutSegments.forEach((seg, idx) => {
      const isLast = idx === monthlyDonutSegments.length - 1;
      str += `${seg.color} ${seg.startAngle}deg ${seg.startAngle + seg.angle}deg${isLast ? '' : ', '}`;
    });
    str += ')';
    return str;
  }, [monthlyDonutSegments]);

  const subjectBreakdown = subjectBreakdownPeriod === 'week'
    ? {
      subjectHoursMap: weeklyStats.subjectHoursMap,
      subjectPlannedMap: weeklyStats.subjectPlannedMap,
      totalHours: weeklyStats.totalCompletedHours,
      conicGradient: weeklyConicGradientStr,
    }
    : {
      subjectHoursMap: monthlyStats.subjectHoursMap,
      subjectPlannedMap: monthlyStats.subjectPlannedMap,
      totalHours: monthlyStats.totalMonthlyHours,
      conicGradient: monthlyConicGradientStr,
    };

  React.useEffect(() => {
    setExpandedMonthlySubject(null);
    setExpandedMonthlyWeek(null);
  }, [selectedMonthKey]);

  // Form states for the monthly review reflection
  const existingMonthlyReview = appData.monthlyReviews?.[selectedMonthKey];
  const [monthlyWentWell, setMonthlyWentWell] = useState(existingMonthlyReview?.wentWell || '');
  const [monthlyChallenges, setMonthlyChallenges] = useState(existingMonthlyReview?.challenges || '');
  const [monthlyNextGoals, setMonthlyNextGoals] = useState(existingMonthlyReview?.nextGoals || '');
  const [monthlyTargetHours, setMonthlyTargetHours] = useState(existingMonthlyReview?.targetHours?.toString() || '5.0');
  const [monthlyPrioritySubj, setMonthlyPrioritySubj] = useState(existingMonthlyReview?.prioritySubj || BAC_SUBJECTS[0].name);

  // Sync monthly form when changing month
  React.useEffect(() => {
    const rev = appData.monthlyReviews?.[selectedMonthKey];
    setMonthlyWentWell(rev?.wentWell || '');
    setMonthlyChallenges(rev?.challenges || '');
    setMonthlyNextGoals(rev?.nextGoals || '');
    setMonthlyTargetHours(rev?.targetHours?.toString() || '5.0');
    setMonthlyPrioritySubj(rev?.prioritySubj || BAC_SUBJECTS[0].name);
  }, [selectedMonthKey, appData.monthlyReviews]);

  // 13-Week Activity Heatmap Data
  const heatmapData = useMemo(() => {
    const weeks: {
      dateStr: string;
      count: number;
      studyHours: number;
      tasksCount: number;
      habitsCount: number;
      studySessionsCount: number;
    }[][] = [];
    const today = new Date();
    const todayMonday = getMonday(today);

    // Build map of activity and study hours by date
    const activityMap: Record<
      string,
      { tasks: number; habits: number; studySessions: number; studyHours: number }
    > = {};

    (appData.tasks || []).forEach((t) => {
      if (t.status === 'completed') {
        const completedAt = t.completedAt ? new Date(t.completedAt) : null;
        const dateStr = completedAt && !Number.isNaN(completedAt.getTime())
          ? getLocalDateStr(completedAt)
          : t.dueDate;
        if (dateStr) {
          if (!activityMap[dateStr]) {
            activityMap[dateStr] = { tasks: 0, habits: 0, studySessions: 0, studyHours: 0 };
          }
          activityMap[dateStr].tasks++;
        }
      }
    });

    if (appData.habitLogs) {
      Object.entries(appData.habitLogs).forEach(([dKey, valMap]) => {
        const trueCount = Object.values(valMap).filter(Boolean).length;
        if (trueCount > 0) {
          if (!activityMap[dKey]) {
            activityMap[dKey] = { tasks: 0, habits: 0, studySessions: 0, studyHours: 0 };
          }
          activityMap[dKey].habits += trueCount;
        }
      });
    }

    (appData.timeBlocks || []).forEach((b) => {
      if (b.type === 'study') {
        getCompletedPlannerOccurrences(b).forEach(({ date: dKey }) => {
          if (!activityMap[dKey]) {
            activityMap[dKey] = { tasks: 0, habits: 0, studySessions: 0, studyHours: 0 };
          }
          activityMap[dKey].studySessions++;
          activityMap[dKey].studyHours += getBlockDurationHours(b);
        });
      }
    });

    for (let w = 12; w >= 0; w--) {
      const weekDays = [];
      const mondayOfThisWeek = new Date(todayMonday);
      mondayOfThisWeek.setDate(todayMonday.getDate() - w * 7);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = new Date(mondayOfThisWeek);
        dayDate.setDate(mondayOfThisWeek.getDate() + dayOffset);
        const dateStr = formatMondayKey(dayDate);
        const info = activityMap[dateStr] || { tasks: 0, habits: 0, studySessions: 0, studyHours: 0 };
        const totalActivity = info.tasks + info.habits + info.studySessions;
        weekDays.push({
          dateStr,
          count: totalActivity,
          studyHours: info.studyHours,
          tasksCount: info.tasks,
          habitsCount: info.habits,
          studySessionsCount: info.studySessions,
        });
      }
      weeks.push(weekDays);
    }
    return weeks;
  }, [appData.tasks, appData.habitLogs, appData.timeBlocks]);

  // Color intensities for heatmap: Progressively darker as study hours (and activity) increase
  const getHeatmapColor = (studyHours: number, count: number = 0) => {
    // 0 hours and 0 activities: clean inactive background
    if (studyHours <= 0 && count <= 0) {
      return 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60';
    }

    // Tier 1: Light (≤ 1.0h or 1 task/habit)
    if ((studyHours > 0 && studyHours <= 1.0) || (studyHours === 0 && count === 1)) {
      return 'bg-emerald-200 text-emerald-950 dark:bg-emerald-950/90 dark:border-emerald-900/80 border border-emerald-300 dark:text-emerald-300';
    }

    // Tier 2: Medium-Light (1.0h < studyHours ≤ 2.5h or 2 activities)
    if ((studyHours > 1.0 && studyHours <= 2.5) || (studyHours === 0 && count === 2)) {
      return 'bg-emerald-300 text-emerald-950 dark:bg-emerald-900 dark:border-emerald-800 border border-emerald-400 dark:text-emerald-200';
    }

    // Tier 3: Medium (2.5h < studyHours ≤ 4.0h or 3-4 activities)
    if ((studyHours > 2.5 && studyHours <= 4.0) || (studyHours === 0 && count <= 4)) {
      return 'bg-emerald-500 text-white dark:bg-emerald-700 dark:border-emerald-600 border border-emerald-600';
    }

    // Tier 4: Dark (4.0h < studyHours ≤ 6.0h or 5-6 activities)
    if ((studyHours > 4.0 && studyHours <= 6.0) || (studyHours === 0 && count <= 6)) {
      return 'bg-emerald-700 text-white dark:bg-emerald-600 dark:border-emerald-500 border border-emerald-800 shadow-xs font-bold';
    }

    // Tier 5: Deepest Darkest Forest Green (> 6.0h or 7+ activities)
    return 'bg-emerald-950 text-emerald-100 dark:bg-emerald-400 dark:border-emerald-300 dark:text-emerald-950 border border-emerald-950 font-black shadow-sm ring-1 ring-emerald-900 dark:ring-emerald-300';
  };

  // Handle Save Weekly Review
  const handleSaveWeekly = (e: React.FormEvent) => {
    e.preventDefault();
    const data: WeeklyReviewData = {
      wentWell,
      wentBad,
      improve,
      targetHours: parseFloat(targetHours) || 4.0,
      prioritySubj,
      savedAt: Date.now(),
    };
    chimePlayer.playChime('complete');
    onSaveWeeklyReview(weekMondayKey, data);
  };

  // Handle Save Monthly Review
  const handleSaveMonthly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveMonthlyReview) return;
    const data: MonthlyReviewData = {
      wentWell: monthlyWentWell,
      challenges: monthlyChallenges,
      nextGoals: monthlyNextGoals,
      targetHours: parseFloat(monthlyTargetHours) || 5.0,
      prioritySubj: monthlyPrioritySubj,
      savedAt: Date.now(),
    };
    chimePlayer.playChime('complete');
    onSaveMonthlyReview(selectedMonthKey, data);
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* 1. TOP HEADER & MAIN VIEW SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit']">
              {t('stats_title') || (isAr ? 'الإحصائيات والمراجعة' : 'Statistiques & Bilans')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('stats_subtitle') || (isAr ? 'تتبع فوري لساعات الدراسة لكل مادة، المراجعة الأسبوعية والشهرية' : 'Suivi en temps réel des heures d\'étude par matière, bilans hebdomadaires et mensuels')}
          </p>
        </div>

        {/* View Switcher Pills & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveReviewView('weekly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeReviewView === 'weekly'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{t('wr_weekly_tab') || (isAr ? 'المراجعة الأسبوعية' : 'Bilan Hebdomadaire')}</span>
            </button>

            <button
              onClick={() => setActiveReviewView('monthly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeReviewView === 'monthly'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>{t('wr_monthly_tab') || (isAr ? 'المراجعة الشهرية' : 'Bilan Mensuel')}</span>
            </button>

            <button
              onClick={() => setActiveReviewView('trophies')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeReviewView === 'trophies'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{t('wr_achievements') || (isAr ? 'الأوسمة' : 'Trophées')}</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          {onAddTimeBlock && (
            <button
              type="button"
              onClick={() => {
                setQuickLogDate(getLocalDateStr(new Date()));
                setIsQuickLogOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm shadow-teal-500/20 transition-transform active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? '+ تسجيل ساعات' : '+ Enregistrer des heures'}</span>
            </button>
          )}

          {onStartFocusMode && (
            <button
              type="button"
              onClick={() =>
                onStartFocusMode(
                  weeklyStats.topSubject !== 'En attente' && weeklyStats.topSubject !== 'لم تُحدد بعد'
                    ? weeklyStats.topSubject
                    : undefined
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-teal-400 border border-teal-500/40 text-xs font-bold transition-all active:scale-95"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? '⚡ مؤقت تركيز' : '⚡ Focus Timer'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Planner Sync Banner */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/20 text-xs text-teal-800 dark:text-teal-300">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-semibold">
            {t('wr_planner_linked') || (isAr ? 'متصل بالمخطط الزمني تلقائياً' : 'Synchronisé avec le Planning en temps réel')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            — {t('wr_planner_tooltip') || (isAr ? 'كل حصة يتم إكمالها في المخطط تُسجل تلقائياً في مجموع ساعات تلك المادة لذلك الأسبوع والشهر.' : 'Chaque tâche complétée dans le Planning enregistre automatiquement vos heures par matière.')}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VIEW 1: WEEKLY REVIEW (BILAN HEBDOMADAIRE) */}
      {/* ========================================================================= */}
      {activeReviewView === 'weekly' && (
        <div className="flex flex-col gap-5">
          {/* Week Selector Bar */}
          <div className="order-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1A2535] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'الفترة المعروضة:' : 'Période analysée :'}
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {isAr
                ? `أسبوع ${weekRangeDisplay}`
                  : language === 'en' ? `Week of ${weekRangeDisplay}` : `Semaine du ${weekRangeDisplay}`}
              </span>
              {currentWeekOffset === 0 && (
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                  {isAr ? 'هذا الأسبوع' : language === 'en' ? 'This week' : 'Actuelle'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-[11px] font-bold"
                aria-label={isAr ? 'الأسبوع السابق' : language === 'en' ? 'Previous week' : 'Semaine précédente'}
                title={isAr ? 'الأسبوع السابق' : language === 'en' ? 'Previous week' : 'Semaine précédente'}
              >
                {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{isAr ? 'الأسبوع السابق' : language === 'en' ? 'Previous week' : 'Semaine précédente'}</span>
              </button>

              {currentWeekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentWeekOffset(0)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-500/10 hover:text-teal-600 text-xs font-bold transition-colors"
                  aria-label={isAr ? 'العودة إلى هذا الأسبوع' : language === 'en' ? 'Return to this week' : 'Revenir à cette semaine'}
                >
                  {isAr ? 'هذا الأسبوع' : language === 'en' ? 'This week' : 'Cette semaine'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-[11px] font-bold"
                aria-label={isAr ? 'الأسبوع التالي' : language === 'en' ? 'Next week' : 'Semaine suivante'}
                title={isAr ? 'الأسبوع التالي' : language === 'en' ? 'Next week' : 'Semaine suivante'}
              >
                <span>{isAr ? 'الأسبوع التالي' : language === 'en' ? 'Next week' : 'Semaine suivante'}</span>
                {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 4 Weekly Stat KPI Tiles */}
          <div className="order-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Hours across all subjects */}
            <div className="relative overflow-hidden bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">
                {t('wr_total_hours_all') || (isAr ? 'مجموع الساعات (كافة المواد)' : 'Heures totales')}
              </span>
              <div className="my-2">
                <span className="text-3xl font-black font-['Outfit'] text-slate-900 dark:text-white">
                  {weeklyStats.totalCompletedHours.toFixed(1)}h
                </span>
                {weeklyStats.totalPlannedHours > 0 && (
                  <span className="text-xs text-slate-400 ml-1">
                    / {weeklyStats.totalPlannedHours.toFixed(1)}h planifiées
                  </span>
                )}
              </div>
              <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {weeklyStats.totalCompletedHours > 0
                    ? isAr
                      ? `${weeklyStats.totalCompletedHours.toFixed(1)} ساعة مسجلة`
                      : `${weeklyStats.totalCompletedHours.toFixed(1)}h enregistrées`
                    : isAr
                      ? 'أكمل حصص في المخطط لتسجيلها'
                      : 'Complétez des blocs pour enregistrer'}
                </span>
              </span>
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-teal-500/10" aria-hidden="true"><div className="h-full bg-teal-500/70" style={{ width: `${Math.min(100, weeklyStats.totalCompletedHours / 25 * 100)}%` }} /></div>
            </div>

            {/* Completed Sessions Rate */}
            <div className="relative overflow-hidden bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">{t('wr_sessions_done')}</span>
              <div className="my-2">
                <span className="text-3xl font-black font-['Outfit'] text-teal-600 dark:text-teal-400">
                  {weeklyStats.completedSessions}
                </span>
                <span className="text-xs text-slate-400"> / {weeklyStats.totalSessions}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {weeklyStats.sessionRate}% {isAr ? 'نسبة الإنجاز' : 'taux de complétion'}
              </span>
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-teal-500/10" aria-hidden="true"><div className="h-full bg-teal-500/70" style={{ width: `${weeklyStats.sessionRate}%` }} /></div>
            </div>

            {/* Completed Tasks & HW */}
            <div className="relative overflow-hidden bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">{t('wr_hw_done')}</span>
              <div className="my-2">
                <span className="text-3xl font-black font-['Outfit'] text-indigo-600 dark:text-indigo-400">
                  {weeklyHomeworkStats.completed}
                </span>
                <span className="text-xs text-slate-400"> / {weeklyHomeworkStats.total}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'واجبات مستحقة هذا الأسبوع' : language === 'en' ? 'Homework due this week' : 'Devoirs dus cette semaine'} · {weeklyHomeworkStats.completionRate}%
              </span>
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-indigo-500/10" aria-hidden="true"><div className="h-full bg-indigo-500/70" style={{ width: `${weeklyHomeworkStats.completionRate}%` }} /></div>
            </div>

            {/* Top Studied Subject */}
            <div className="relative overflow-hidden bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">{t('wr_top_subj')}</span>
              <div className="my-2 truncate">
                <span className="text-lg font-black font-['Outfit'] text-amber-600 dark:text-amber-400 truncate block">
                  {weeklyStats.topSubject}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'المادة الأكثر تركيزاً هذا الأسبوع' : 'Focus majeur de la semaine'}
              </span>
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-amber-500/10" aria-hidden="true"><div className="h-full bg-amber-500/70" style={{ width: `${weeklyStats.totalCompletedHours > 0 ? 100 : 0}%` }} /></div>
            </div>
          </div>

          {/* Weekly Target Goal Pace & BAC Balance Bar */}
          <div className="order-3 bg-gradient-to-br from-slate-900 via-slate-900 to-[#12232B] text-white p-5 rounded-xl border border-teal-500/30 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                  <Target className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-teal-300">
                    {isAr ? 'الهدف الأسبوعي وتوازن مواد البكالوريا' : 'Objectif Hebdomadaire & Équilibre BAC'}
                  </h3>
                  <span className="text-[11px] text-slate-300">
                    {isAr
                      ? `تم إنجاز ${weeklyStats.totalCompletedHours.toFixed(1)} من أصل ${parseFloat(targetHours) || 12} ساعات مستهدفة`
                      : `${weeklyStats.totalCompletedHours.toFixed(1)}h réalisées sur l'objectif de ${parseFloat(targetHours) || 12}h`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${bacBalanceMetrics.balanceColor}`}>
                  {bacBalanceMetrics.balanceBadge}
                </span>
                <span className="text-xs font-black font-['Outfit'] text-teal-400">
                  {Math.min(100, Math.round((weeklyStats.totalCompletedHours / (parseFloat(targetHours) || 12)) * 100))}%
                </span>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400 rounded-full transition-all duration-700 shadow-sm"
                  style={{
                    width: `${Math.min(100, Math.max(4, Math.round((weeklyStats.totalCompletedHours / (parseFloat(targetHours) || 12)) * 100)))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>
                  {weeklyStats.totalCompletedHours >= (parseFloat(targetHours) || 12)
                    ? (isAr ? '🎉 مبروك! حققت الهدف الأسبوعي بالكامل' : '🎉 Félicitations ! Objectif atteint avec succès')
                    : (isAr
                      ? `باقي ${Math.max(0, (parseFloat(targetHours) || 12) - weeklyStats.totalCompletedHours).toFixed(1)} ساعة لإكمال الهدف`
                      : `Plus que ${Math.max(0, (parseFloat(targetHours) || 12) - weeklyStats.totalCompletedHours).toFixed(1)}h pour valider la semaine`)}
                </span>
                <span>
                  {bacBalanceMetrics.scienceHrs.toFixed(1)}h sciences ({bacBalanceMetrics.sciencePct}%) • {bacBalanceMetrics.literaryHrs.toFixed(1)}h litt/langues ({bacBalanceMetrics.literaryPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Subject-by-Subject Hours Breakdown and Grade Progression */}
          <div className="order-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Conic Donut Chart + Subject List */}
            <div className="lg:col-span-5 bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-teal-500" />
                  <span>
                    {subjectBreakdownPeriod === 'week'
                      ? (isAr ? 'ساعات الأسبوع حسب المادة' : language === 'en' ? 'Weekly hours by subject' : 'Heures par matière cette semaine')
                      : (isAr ? 'ساعات الشهر حسب المادة' : language === 'en' ? 'Monthly hours by subject' : 'Heures par matière ce mois')}
                  </span>
                </h3>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1" role="group" aria-label={isAr ? 'فترة توزيع الساعات' : 'Study hours period'}>
                  <button
                    type="button"
                    onClick={() => setSubjectBreakdownPeriod('week')}
                    aria-pressed={subjectBreakdownPeriod === 'week'}
                    className={`min-h-8 px-3 rounded-md text-[11px] font-bold transition-colors ${subjectBreakdownPeriod === 'week' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'}`}
                  >
                    {isAr ? 'أسبوعي' : language === 'en' ? 'Week' : 'Semaine'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectBreakdownPeriod('month')}
                    aria-pressed={subjectBreakdownPeriod === 'month'}
                    className={`min-h-8 px-3 rounded-md text-[11px] font-bold transition-colors ${subjectBreakdownPeriod === 'month' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'}`}
                  >
                    {isAr ? 'شهري' : language === 'en' ? 'Month' : 'Mois'}
                  </button>
                </div>
              </div>
              <div className="text-right text-xs font-black text-slate-900 dark:text-white" aria-live="polite">
                {subjectBreakdown.totalHours.toFixed(1)}h {subjectBreakdownPeriod === 'month' ? `· ${monthDisplayName}` : (isAr ? 'هذا الأسبوع' : language === 'en' ? 'this week' : 'cette semaine')}
              </div>

              {/* Donut graphic */}
              <div className="flex flex-col items-center justify-center py-3">
                <div
                  className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner transition-transform hover:scale-105"
                  style={{ background: subjectBreakdown.conicGradient }}
                >
                  <div className="w-24 h-24 rounded-full bg-white dark:bg-[#1A2535] flex flex-col items-center justify-center text-center p-2 shadow-sm">
                    <span className="text-xs font-bold text-slate-400">{isAr ? 'المجموع' : 'Total'}</span>
                    <span className="text-xl font-black font-['Outfit'] text-slate-900 dark:text-white">
                      {subjectBreakdown.totalHours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              </div>

              {/* List of active subjects */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {BAC_SUBJECTS.map((subj) => {
                  const hrs = subjectBreakdown.subjectHoursMap[subj.name] || 0;
                  const planned = subjectBreakdown.subjectPlannedMap[subj.name] || 0;
                  const pct = subjectBreakdown.totalHours > 0 ? Math.round((hrs / subjectBreakdown.totalHours) * 100) : 0;
                  if (hrs === 0 && planned === 0) return null;

                  return (
                    <button
                      type="button"
                      key={subj.id}
                      onClick={() => setSelectedSubjectDetail(subj)}
                      aria-label={`${isAr ? 'تفاصيل مادة' : language === 'en' ? 'Subject details' : 'Détails de la matière'} ${subj.name}`}
                      className="w-full text-left flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-teal-500/10 dark:hover:bg-teal-500/10 border border-slate-200/60 dark:border-slate-800 cursor-pointer transition-all text-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subj.hexColor }} />
                        <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate">
                          {subj.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold shrink-0">
                          Coef {subj.coefficient}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-teal-600 dark:text-teal-400">{hrs.toFixed(1)}h</span>
                        <span className="text-[10px] text-slate-400">({pct}%)</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
                {subjectBreakdown.totalHours === 0 && (
                  <p className="text-center text-xs text-slate-400 py-3">
                    {subjectBreakdownPeriod === 'week'
                      ? (isAr ? 'لم تُسجّل ساعات مكتملة لهذا الأسبوع بعد.' : language === 'en' ? 'No completed study hours for this week yet.' : 'Aucune heure enregistrée pour cette semaine.')
                      : (isAr ? 'لم تُسجّل ساعات مكتملة لهذا الشهر بعد.' : language === 'en' ? 'No completed study hours for this month yet.' : 'Aucune heure enregistrée pour ce mois.')}
                  </p>
                )}
              </div>
            </div>

            {/* Grade progression */}
            <div className="lg:col-span-7 bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-500" />
                  <span>{isAr ? 'تطور العلامات حسب المادة' : language === 'en' ? 'Grade progression by subject' : 'Évolution des notes par matière'}</span>
                </h3>
                <span className="text-[10px] text-slate-400">{isAr ? 'المعدل الموزون وآخر تغير' : language === 'en' ? 'Weighted average and latest change' : 'Moyenne pondérée et dernière évolution'}</span>
              </div>
              {gradeProgress.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <BarChart3 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  {isAr ? 'أضف علامات لعرض تطورها هنا.' : language === 'en' ? 'Add grades to see their progression here.' : 'Ajoutez des notes pour voir leur évolution ici.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {gradeProgress.map((item) => (
                    <div key={item.subject} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.subject}</span>
                          <span className="text-[10px] text-slate-400">{item.count} {isAr ? 'علامات' : language === 'en' ? 'grades' : 'notes'}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" aria-label={`${item.average.toFixed(1)} / 20`}>
                          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, item.average * 5))}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-black" style={{ color: item.color }}>{item.average.toFixed(1)}<span className="text-[10px] text-slate-400">/20</span></span>
                        <span className={`min-w-12 text-right text-[11px] font-bold ${item.delta === null ? 'text-slate-400' : item.delta >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {item.delta === null ? '—' : `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>


          </div>

          {/* 13-Week Activity Heatmap */}
          <div className="order-4 bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>{t('wr_heatmap') || (isAr ? 'نشاط الدراسة — 13 أسبوعاً' : 'Activité d\'étude — 13 semaines')}</span>
                  <span className="text-[10px] font-normal text-slate-400 hidden md:inline">
                    ({isAr ? 'تزداد درجة دكنة اللون تدريجياً مع زيادة مجموع ساعات الدراسة' : 'La couleur devient progressivement plus foncée avec l\'augmentation des heures d\'étude'})
                  </span>
                </h3>
              </div>

              {/* Progressive Study Hours Color Legend */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold shrink-0 flex-wrap">
                <span>{isAr ? '0 س' : '0h'}</span>
                <div className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60" title="0h" />
                <div className="w-3 h-3 rounded-xs bg-emerald-200 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-900" title="≤ 1h" />
                <div className="w-3 h-3 rounded-xs bg-emerald-300 dark:bg-emerald-900 border border-emerald-400 dark:border-emerald-800" title="1 - 2.5h" />
                <div className="w-3 h-3 rounded-xs bg-emerald-500 dark:bg-emerald-700 border border-emerald-600 dark:border-emerald-600" title="2.5 - 4h" />
                <div className="w-3 h-3 rounded-xs bg-emerald-700 dark:bg-emerald-600 border border-emerald-800 dark:border-emerald-500" title="4 - 6h" />
                <div className="w-3 h-3 rounded-xs bg-emerald-950 dark:bg-emerald-400 border border-emerald-950 dark:border-emerald-300 ring-1 ring-emerald-900/50 dark:ring-emerald-300/50" title="> 6h" />
                <span>{isAr ? '+ 6 س' : '> 6h'}</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="flex gap-1.5 min-w-[500px]">
                {heatmapData.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1.5">
                    {week.map((day) => (
                      <button
                        type="button"
                        key={day.dateStr}
                        onClick={() => setSelectedHeatmapDay(day)}
                        title={`${day.dateStr}: ${day.studyHours > 0 ? `${day.studyHours.toFixed(1)}h d'étude` : '0h'} (${day.studySessionsCount} sessions, ${day.tasksCount} tâches, ${day.habitsCount} habitudes)`}
                        aria-label={`${day.dateStr}: ${day.studyHours.toFixed(1)}h, ${day.studySessionsCount} ${isAr ? 'حصص' : 'sessions'}`}
                        className={`w-3.5 h-3.5 rounded-xs transition-transform hover:scale-125 focus:outline-none ${getHeatmapColor(
                          day.studyHours,
                          day.count
                        )}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {selectedHeatmapDay && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-fadeIn">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-black text-slate-900 dark:text-white font-['Outfit']">{selectedHeatmapDay.dateStr}</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>{selectedHeatmapDay.studyHours.toFixed(1)}h {isAr ? 'ساعات دراسة مسجلة' : 'heures d\'étude validées'}</span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    ({selectedHeatmapDay.studySessionsCount} {isAr ? 'حصص' : 'sessions'}, {selectedHeatmapDay.tasksCount} {isAr ? 'مهام' : 'tâches'}, {selectedHeatmapDay.habitsCount} {isAr ? 'عادات' : 'habitudes'})
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق تفاصيل اليوم' : language === 'en' ? 'Close day details' : 'Fermer le détail du jour'}
                  onClick={() => setSelectedHeatmapDay(null)}
                  className="self-end sm:self-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-2 py-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Weekly Reflection Journal Form */}
          <div className="order-6 bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-500" />
              <span>{isAr ? 'التأمل الأسبوعي' : language === 'en' ? 'Weekly reflection' : 'Réflexion hebdomadaire'}</span>
            </h3>

            <form onSubmit={handleSaveWeekly} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                    ✓ {t('wr_went_well')}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      isAr
                        ? 'مثال: إكمال جميع تمارين الرياضيات، الاستيقاظ باكراً 5 أيام متتالية...'
                        : 'Ex: 100% des exercices de maths faits, bon rythme de révision le matin...'
                    }
                    value={wentWell}
                    onChange={(e) => setWentWell(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500 resize-none text-xs"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                    ⚠️ {t('wr_went_bad')}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      isAr
                        ? 'مثال: التشتت بالهاتف في المساء، تأجيل مراجعة الفلسفة...'
                        : 'Ex: Trop de distractions sur le téléphone le soir, retard en philo...'
                    }
                    value={wentBad}
                    onChange={(e) => setWentBad(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500 resize-none text-xs"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
                  🎯 {t('wr_improve')}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isAr
                      ? 'مثال: تطبيق تقنية البومودورو 45 دقيقة والتركيز على تمارين الفيزياء...'
                      : 'Ex: Utiliser le mode focus 45min et réviser les fiches de SVT chaque matin...'
                  }
                  value={improve}
                  onChange={(e) => setImprove(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500 resize-none text-xs"
                />
              </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isAr ? 'أهداف الأسبوع القادم' : language === 'en' ? 'Goals for next week' : 'Objectifs pour la semaine prochaine'}
                </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_220px] gap-4 pt-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('wr_target_hrs')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="14"
                    value={targetHours}
                    onChange={(e) => setTargetHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('wr_priority_subj')}
                  </label>
                  <select
                    value={prioritySubj}
                    onChange={(e) => setPrioritySubj(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium text-xs"
                  >
                    {BAC_SUBJECTS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full min-h-11 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t('wr_save')}</span>
                  </button>
                </div>
              </div>
              </div>
            </form>
          </div>

          {/* Weekly activity heatmap and study-hours chart */}
          <div className="order-7 bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-teal-500" />
                <span>{isAr ? 'نشاط الدراسة خلال الأسبوع' : language === 'en' ? 'Weekly study activity' : 'Activité hebdomadaire'}</span>
              </h3>
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">{weeklyStats.totalCompletedHours.toFixed(1)}h {isAr ? 'مكتملة' : language === 'en' ? 'completed' : 'terminées'}</span>
            </div>

            <div className="grid grid-cols-7 gap-2" aria-label={isAr ? 'ساعات الدراسة لكل يوم' : 'Study hours by day'}>
              {weeklyStats.dayNames.map((dayName, index) => {
                const hours = weeklyStats.dayHours[index];
                const isSelected = selectedDayIdx === index;
                return (
                  <button
                    key={`week-heat-${weekDates[index]}`}
                    type="button"
                    onClick={() => setSelectedDayIdx(isSelected ? null : index)}
                    aria-pressed={isSelected}
                    aria-label={`${dayName} ${weekDates[index]}, ${hours.toFixed(1)}h`}
                    className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${getHeatmapColor(hours, 0)} ${isSelected ? 'ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-slate-900' : 'hover:border-teal-400'}`}
                  >
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{hours > 0 ? `${hours.toFixed(1)}h` : '—'}</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300">{dayName}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-500" />
                  <span>{isAr ? 'ساعات الدراسة لكل يوم' : language === 'en' ? 'Study hours per day' : 'Heures d’étude par jour'}</span>
                </h4>
                <span className="text-[10px] text-slate-400">{isAr ? 'اضغط على يوم لرؤية حصصه' : language === 'en' ? 'Select a day to see its sessions' : 'Choisissez un jour pour voir ses sessions'}</span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-40 border-b border-slate-200 dark:border-slate-800 pb-2">
                {weeklyStats.dayNames.map((dayName, index) => {
                  const hours = weeklyStats.dayHours[index];
                  const maxHours = Math.max(...weeklyStats.dayHours, 1);
                  const height = Math.max(4, Math.round((hours / maxHours) * 100));
                  const isSelected = selectedDayIdx === index;
                  return (
                    <button
                      key={`week-bars-${weekDates[index]}`}
                      type="button"
                      onClick={() => setSelectedDayIdx(isSelected ? null : index)}
                      aria-pressed={isSelected}
                      aria-label={`${dayName}: ${hours.toFixed(1)}h`}
                      className="group flex min-w-0 h-full flex-col items-center justify-end gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{hours > 0 ? `${hours.toFixed(1)}h` : '—'}</span>
                      <span className={`flex h-24 w-full max-w-8 items-end overflow-hidden rounded-t-md ${isSelected ? 'bg-teal-500/20 ring-1 ring-teal-500' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <span className="w-full rounded-t-md bg-teal-500 transition-[height] duration-500 group-hover:bg-teal-400" style={{ height: `${height}%` }} />
                      </span>
                      <span className={`text-[9px] font-bold ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>{dayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDayIdx !== null && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4" aria-live="polite">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{weeklyStats.dayNames[selectedDayIdx]}</h4>
                    <p className="text-[10px] text-slate-400">{weekDates[selectedDayIdx]} · {weeklyStats.dayHours[selectedDayIdx].toFixed(1)}h</p>
                  </div>
                  <button type="button" onClick={() => setSelectedDayIdx(null)} aria-label={isAr ? 'إغلاق تفاصيل اليوم' : language === 'en' ? 'Close day details' : 'Fermer le détail du jour'} className="min-h-10 min-w-10 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                    <X className="w-4 h-4 mx-auto" />
                  </button>
                </div>
                {(() => {
                  const selectedDate = weekDates[selectedDayIdx];
                  const blocks = (appData.timeBlocks || [])
                    .filter((block) => block.type === 'study')
                    .flatMap((block) => getCompletedPlannerOccurrences(block)
                      .filter((occurrence) => occurrence.date === selectedDate)
                      .map((occurrence) => ({ ...block, id: `${block.id}-${occurrence.date}` })));
                  return blocks.length === 0 ? (
                    <p className="text-xs text-slate-400">{isAr ? 'لا توجد حصص مسجلة لهذا اليوم.' : language === 'en' ? 'No study sessions recorded for this day.' : 'Aucune session enregistrée ce jour-là.'}</p>
                  ) : (
                    <div className="space-y-2">
                      {blocks.map((block) => (
                        <div key={block.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-md bg-white dark:bg-[#1A2535] border border-slate-200 dark:border-slate-800 px-3 py-2 text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{block.title || block.subject}</span>
                          <span className="text-slate-400 shrink-0">{block.startTime}–{block.endTime} · {block.subject} · {getBlockDurationHours(block).toFixed(1)}h</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="order-8 bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>{isAr ? 'الإنجازات' : language === 'en' ? 'Achievements' : 'Succès'}</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">
                {achievements.filter((item) => item.unlocked).length} / {achievements.length} {isAr ? 'مفتوحة' : language === 'en' ? 'unlocked' : 'débloqués'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
              {achievements.map((achievement) => (
                <div key={achievement.id} className={`min-w-0 rounded-lg border p-3 ${achievement.unlocked ? 'border-teal-500/30 bg-teal-500/5' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 text-lg ${achievement.unlocked ? 'bg-teal-500/10' : 'bg-slate-200 dark:bg-slate-800 grayscale opacity-60'}`} aria-hidden="true">{achievement.icon}</div>
                  <h4 className="min-h-8 text-[10px] leading-4 font-bold text-slate-800 dark:text-slate-200 line-clamp-2">{achievement.title[language]}</h4>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
                    <div className={`h-full rounded-full ${achievement.unlocked ? 'bg-teal-500' : 'bg-slate-400'}`} style={{ width: `${achievement.progress}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] font-semibold text-slate-400">
                    <span>{achievement.unlocked ? (isAr ? 'مكتمل' : language === 'en' ? 'Complete' : 'Débloqué') : (isAr ? 'التقدم' : language === 'en' ? 'Progress' : 'En cours')}</span>
                    <span>{achievement.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Previous weekly reviews */}
          <div className="order-9 bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-teal-500" />
              <span>{isAr ? 'المراجعات الأسبوعية السابقة' : language === 'en' ? 'Previous weekly reviews' : 'Bilans précédents'}</span>
            </h3>
            {weeklyReviewArchive.length === 0 ? (
              <div className="py-7 text-center text-xs text-slate-400">
                <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-50" />
                {isAr ? 'احفظ أول مراجعة أسبوعية لتظهر هنا.' : language === 'en' ? 'Save a weekly review and it will appear here.' : 'Enregistrez un premier bilan pour le retrouver ici.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {weeklyReviewArchive.slice(0, 12).map(([weekKey, review]) => {
                  const monday = new Date(`${weekKey}T12:00:00`);
                  const sunday = new Date(monday);
                  sunday.setDate(monday.getDate() + 6);
                  const locale = isAr ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR';
                  const range = `${monday.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
                  return (
                    <button
                      key={weekKey}
                      type="button"
                      onClick={() => jumpToArchivedWeek(weekKey)}
                      aria-label={`${isAr ? 'عرض مراجعة الأسبوع' : language === 'en' ? 'Open review for week' : 'Ouvrir le bilan de la semaine'} ${range}`}
                      className="w-full min-h-14 flex items-center justify-between gap-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 rounded-md transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{range}</span>
                        <span className="block mt-1 text-[10px] text-slate-400 truncate">
                          {review.prioritySubj ? `${isAr ? 'الأولوية' : language === 'en' ? 'Priority' : 'Priorité'}: ${review.prioritySubj} · ` : ''}
                          {review.targetHours}h {isAr ? 'يوميًا' : language === 'en' ? 'per day' : '/ jour'}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                        {review.wentWell && <CheckCircle className="w-3.5 h-3.5 text-teal-500" aria-label={isAr ? 'إنجازات محفوظة' : 'Saved successes'} />}
                        {review.improve && <Target className="w-3.5 h-3.5 text-amber-500" aria-label={isAr ? 'أهداف محفوظة' : 'Saved goals'} />}
                        <span>{isAr ? 'عرض' : language === 'en' ? 'View' : 'Voir'}</span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly history and drilldown */}
          <div className="order-10 bg-white dark:bg-[#1A2535] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-teal-500" />
                  <span>{isAr ? 'إحصاءات الدراسة الشهرية' : language === 'en' ? 'Monthly study statistics' : 'Statistiques mensuelles'}</span>
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white capitalize" aria-live="polite">{monthDisplayName}</p>
              </div>
              <div className="flex items-center gap-2">
                {currentMonthOffset !== 0 && (
                  <button type="button" onClick={() => setCurrentMonthOffset(0)} className="min-h-10 px-3 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[11px] font-bold hover:bg-teal-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                    {isAr ? 'هذا الشهر' : language === 'en' ? 'This month' : 'Ce mois'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentMonthOffset((offset) => offset - 1)}
                  aria-label={isAr ? 'الشهر السابق' : language === 'en' ? 'Previous month' : 'Mois précédent'}
                  title={isAr ? 'الشهر السابق' : language === 'en' ? 'Previous month' : 'Mois précédent'}
                  className="min-h-10 min-w-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  {isAr ? <ChevronRight className="w-4 h-4 mx-auto" /> : <ChevronLeft className="w-4 h-4 mx-auto" />}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonthOffset((offset) => Math.min(0, offset + 1))}
                  disabled={currentMonthOffset >= 0}
                  aria-label={isAr ? 'الشهر التالي' : language === 'en' ? 'Next month' : 'Mois suivant'}
                  title={isAr ? 'الشهر التالي' : language === 'en' ? 'Next month' : 'Mois suivant'}
                  className="min-h-10 min-w-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  {isAr ? <ChevronLeft className="w-4 h-4 mx-auto" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{isAr ? 'إجمالي الدراسة' : language === 'en' ? 'Study time' : 'Temps d’étude total'}</span>
                <span className="block mt-1 text-xl font-black text-teal-600 dark:text-teal-400">{monthlyStats.totalMonthlyHours.toFixed(1)}h</span>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{isAr ? 'الحصص المكتملة' : language === 'en' ? 'Completed sessions' : 'Sessions terminées'}</span>
                <span className="block mt-1 text-xl font-black text-slate-900 dark:text-white">{monthlyStats.completedSessions}</span>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{isAr ? 'المواد المدروسة' : language === 'en' ? 'Subjects studied' : 'Matières étudiées'}</span>
                <span className="block mt-1 text-xl font-black text-slate-900 dark:text-white">{monthlySubjectEntries.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <section aria-label={isAr ? 'تفصيل ساعات الشهر حسب المادة' : 'Monthly study hours by subject'}>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">{isAr ? 'حسب المادة' : language === 'en' ? 'By subject' : 'Par matière'}</h4>
                {monthlySubjectEntries.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">{isAr ? 'لا توجد حصص مكتملة في هذا الشهر.' : language === 'en' ? 'No completed study sessions for this month.' : 'Aucune session terminée pour ce mois.'}</p>
                ) : (
                  <div className="space-y-2">
                    {monthlySubjectEntries.map(([subject, hours], index) => {
                      const color = BAC_SUBJECTS.find((item) => item.name === subject)?.hexColor || '#14B8A6';
                      const percentage = monthlyStats.totalMonthlyHours > 0 ? Math.round((hours / monthlyStats.totalMonthlyHours) * 100) : 0;
                      const subjectBlocks = monthlyCompletedBlocks.filter((block) => block.subject === subject);
                      const isExpanded = expandedMonthlySubject === subject;
                      return (
                        <div key={subject} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 pb-2">
                          <button
                            type="button"
                            onClick={() => setExpandedMonthlySubject(isExpanded ? null : subject)}
                            aria-expanded={isExpanded}
                            aria-controls={`monthly-subject-${index}`}
                            className="w-full min-h-11 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-md px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{subject}</span>
                            </span>
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{hours.toFixed(1)}h</span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span>{percentage}%</span><ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></span>
                          </button>
                          <div className="h-1.5 mx-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
                            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percentage}%`, backgroundColor: color }} />
                          </div>
                          {isExpanded && (
                            <div id={`monthly-subject-${index}`} className="mt-2 ml-4 pl-3 border-l-2 border-teal-500/30 space-y-2">
                              {subjectBlocks.map((block) => {
                                const date = new Date(`${getBlockDateStr(block)}T12:00:00`);
                                const locale = isAr ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR';
                                return (
                                  <div key={block.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-md bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-[10px]">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{block.title || subject}</span>
                                    <span className="text-slate-400 shrink-0">{date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} · {block.startTime}–{block.endTime} · {getBlockDurationHours(block).toFixed(1)}h</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section aria-label={isAr ? 'تفصيل ساعات الشهر حسب الأسبوع' : 'Monthly study hours by week'}>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">{isAr ? 'التوزيع حسب أسابيع الشهر' : language === 'en' ? 'Week-by-week' : 'Évolution par semaine'}</h4>
                <div className="grid grid-cols-5 gap-2 items-end min-h-40 border-b border-slate-200 dark:border-slate-800 pb-3">
                  {monthlyWeekDetails.map((bucket, index) => {
                    const maxHours = Math.max(...monthlyWeekDetails.map((item) => item.hours), 1);
                    const height = Math.max(4, Math.round((bucket.hours / maxHours) * 100));
                    const isExpanded = expandedMonthlyWeek === index;
                    return (
                      <button
                        key={bucket.range}
                        type="button"
                        onClick={() => setExpandedMonthlyWeek(isExpanded ? null : index)}
                        aria-expanded={isExpanded}
                        aria-label={`${bucket.label}: ${bucket.hours.toFixed(1)} ${isAr ? 'ساعة' : 'hours'}`}
                        className="group flex min-h-32 flex-col items-center justify-end gap-2 rounded-md px-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                      >
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{bucket.hours > 0 ? `${bucket.hours.toFixed(1)}h` : '—'}</span>
                        <span className="flex h-20 w-full max-w-10 items-end overflow-hidden rounded-t-md bg-slate-100 dark:bg-slate-800">
                          <span className="w-full rounded-t-md bg-teal-500 transition-[height] duration-500 group-hover:bg-teal-400" style={{ height: `${height}%` }} />
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">{bucket.label}</span>
                        <span className="text-[9px] text-slate-400">{bucket.range}</span>
                      </button>
                    );
                  })}
                </div>
                {expandedMonthlyWeek !== null && (
                  <div className="mt-3 space-y-2" aria-live="polite">
                    {monthlyWeekDetails[expandedMonthlyWeek]?.blocks.length ? monthlyWeekDetails[expandedMonthlyWeek].blocks.map((block) => {
                      const date = new Date(`${getBlockDateStr(block)}T12:00:00`);
                      const locale = isAr ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR';
                      return (
                        <div key={block.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-md bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-[10px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{block.title || block.subject}</span>
                          <span className="text-slate-400 shrink-0">{date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} · {block.startTime}–{block.endTime} · {getBlockDurationHours(block).toFixed(1)}h</span>
                        </div>
                      );
                    }) : (
                      <p className="py-3 text-center text-[10px] text-slate-400">{isAr ? 'لا توجد حصص مكتملة في هذا الأسبوع.' : language === 'en' ? 'No completed sessions in this week.' : 'Aucune session terminée cette semaine.'}</p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW 2: MONTHLY REVIEW (BILAN MENSUEL) */}
      {/* ========================================================================= */}
      {activeReviewView === 'monthly' && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1A2535] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'الشهر المختار:' : 'Mois analysé :'}
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white capitalize">
                {monthDisplayName}
              </span>
              {currentMonthOffset === 0 && (
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                  {isAr ? 'الشهر الحالي' : language === 'en' ? 'This month' : 'En cours'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonthOffset((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-[11px] font-bold"
                aria-label={isAr ? 'الشهر السابق' : language === 'en' ? 'Previous month' : 'Mois précédent'}
                title={isAr ? 'الشهر السابق' : language === 'en' ? 'Previous month' : 'Mois précédent'}
              >
                {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{isAr ? 'الشهر السابق' : language === 'en' ? 'Previous month' : 'Mois précédent'}</span>
              </button>

              {currentMonthOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentMonthOffset(0)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-500/10 hover:text-teal-600 text-xs font-bold transition-colors"
                  aria-label={isAr ? 'العودة إلى هذا الشهر' : language === 'en' ? 'Return to this month' : 'Revenir à ce mois'}
                >
                  {isAr ? 'هذا الشهر' : language === 'en' ? 'This month' : 'Ce mois'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setCurrentMonthOffset((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-[11px] font-bold"
                aria-label={isAr ? 'الشهر التالي' : language === 'en' ? 'Next month' : 'Mois suivant'}
                title={isAr ? 'الشهر التالي' : language === 'en' ? 'Next month' : 'Mois suivant'}
              >
                <span>{isAr ? 'الشهر التالي' : language === 'en' ? 'Next month' : 'Mois suivant'}</span>
                {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 4 Monthly KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Monthly Hours */}
            <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">
                {t('wr_monthly_hours') || (isAr ? 'ساعات الدراسة هذا الشهر' : 'Heures d\'étude ce mois')}
              </span>
              <div className="my-2">
                <span className="text-3xl font-black font-['Outfit'] text-slate-900 dark:text-white">
                  {monthlyStats.totalMonthlyHours.toFixed(1)}h
                </span>
                {monthlyStats.totalMonthlyPlanned > 0 && (
                  <span className="text-xs text-slate-400 ml-1">
                    / {monthlyStats.totalMonthlyPlanned.toFixed(1)}h planifiées
                  </span>
                )}
              </div>
              <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {monthlyStats.totalMonthlyHours > 0
                    ? isAr
                      ? `${monthlyStats.totalMonthlyHours.toFixed(1)} ساعة مسجلة`
                      : `${monthlyStats.totalMonthlyHours.toFixed(1)}h d'effort cumulé`
                    : isAr
                      ? 'في انتظار تسجيل الحصص'
                      : 'En attente de sessions'}
                </span>
              </span>
            </div>

            {/* Daily Average */}
            <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">
                {t('wr_monthly_avg') || (isAr ? 'المعدل اليومي' : 'Moyenne quotidienne')}
              </span>
              <div className="my-2">
                <span className="text-3xl font-black font-['Outfit'] text-teal-600 dark:text-teal-400">
                  {monthlyStats.dailyAverage}h
                </span>
                <span className="text-xs text-slate-400"> / {isAr ? 'يوم' : 'jour'}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'على مدار أيام الشهر' : 'Sur le mois complet'}
              </span>
            </div>

            {/* Completed Sessions */}
            <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">
                {t('wr_monthly_sessions') || (isAr ? 'الحصص المكتملة' : 'Sessions terminées')}
              </span>
              <div className="my-2">
                <span className="text-3xl font-black font-['Outfit'] text-indigo-600 dark:text-indigo-400">
                  {monthlyStats.completedSessions}
                </span>
                <span className="text-xs text-slate-400"> / {monthlyStats.totalSessions}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {monthlyStats.completionRate}% {isAr ? 'نسبة الالتزام' : 'de réalisation'}
              </span>
            </div>

            {/* Top Studied Subject in Month */}
            <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">{t('wr_top_subj')}</span>
              <div className="my-2 truncate">
                <span className="text-lg font-black font-['Outfit'] text-amber-600 dark:text-amber-400 truncate block">
                  {monthlyStats.topSubject}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'أعلى مادة في الساعات الشهرية' : 'Matière la plus travaillée'}
              </span>
            </div>
          </div>

          {/* Monthly Charts & Subject Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Conic Donut Chart + Subject List */}
            <div className="lg:col-span-5 bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-teal-500" />
                  <span>{t('wr_hours_by_subject') || (isAr ? 'توزيع ساعات المواد هذا الشهر' : 'Heures par matière ce mois')}</span>
                </h3>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {monthlyStats.totalMonthlyHours.toFixed(1)}h total
                </span>
              </div>

              {/* Monthly Donut Graphic */}
              <div className="flex flex-col items-center justify-center py-3">
                <div
                  className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner transition-transform hover:scale-105"
                  style={{ background: monthlyConicGradientStr }}
                >
                  <div className="w-24 h-24 rounded-full bg-white dark:bg-[#1A2535] flex flex-col items-center justify-center text-center p-2 shadow-sm">
                    <span className="text-xs font-bold text-slate-400">{isAr ? 'الشهر' : 'Mois'}</span>
                    <span className="text-xl font-black font-['Outfit'] text-slate-900 dark:text-white">
                      {monthlyStats.totalMonthlyHours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {BAC_SUBJECTS.map((subj) => {
                  const hrs = monthlyStats.subjectHoursMap[subj.name] || 0;
                  const planned = monthlyStats.subjectPlannedMap[subj.name] || 0;
                  const pct = monthlyStats.totalMonthlyHours > 0 ? Math.round((hrs / monthlyStats.totalMonthlyHours) * 100) : 0;
                  if (hrs === 0 && planned === 0) return null;

                  return (
                    <div
                      key={subj.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subj.hexColor }} />
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{subj.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-teal-600 dark:text-teal-400">{hrs.toFixed(1)}h</span>
                        <span className="text-[10px] text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
                {monthlyStats.totalMonthlyHours === 0 && (
                  <p className="text-center text-xs text-slate-400 py-3">
                    {isAr ? 'لا توجد ساعات دراسية مسجلة لهذا الشهر بعد.' : 'Aucune heure enregistrée pour ce mois.'}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Week-by-Week Trajectory in Month */}
            <div className="lg:col-span-7 bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-500" />
                  <span>{t('wr_weekly_breakdown') || (isAr ? 'تطور الساعات حسب أسابيع الشهر' : 'Évolution par semaine dans le mois')}</span>
                </h3>
              </div>

              {/* Trajectory Bar Chart */}
              <div className="grid grid-cols-5 gap-3 pt-6 items-end h-44 border-b border-slate-200 dark:border-slate-800 pb-3">
                {monthlyStats.weekBuckets.map((bucket) => {
                  const maxW = Math.max(...monthlyStats.weekBuckets.map((b) => b.hours), 8);
                  const heightPct = Math.min(100, Math.round((bucket.hours / maxW) * 100));

                  return (
                    <div key={bucket.label} className="flex flex-col items-center gap-2 h-full justify-end">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {bucket.hours > 0 ? `${bucket.hours.toFixed(1)}h` : '-'}
                      </span>
                      <div className="w-full max-w-[40px] bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden flex items-end h-28">
                        <div
                          className="w-full bg-teal-500 dark:bg-teal-400 rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.max(4, heightPct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{bucket.label}</span>
                      <span className="text-[9px] text-slate-400 font-medium">({bucket.range})</span>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Monthly Subject Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-teal-500" />
                    <span>{isAr ? 'تفاصيل كل مادة على حدة خلال الشهر' : 'Récapitulatif mensuel par matière'}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      {isMonthlySubjectsExpanded ? BAC_SUBJECTS.length : Math.min(DEFAULT_VISIBLE_SUBJECTS, BAC_SUBJECTS.length)} / {BAC_SUBJECTS.length}
                    </span>
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                        <th className="py-2 px-2">{isAr ? 'المادة' : 'Matière'}</th>
                        <th className="py-2 px-2 text-center">{isAr ? 'الساعات' : 'Heures'}</th>
                        <th className="py-2 px-2 text-center">{isAr ? 'الحصص' : 'Sessions'}</th>
                        <th className="py-2 px-2 text-center">{isAr ? 'النسبة' : 'Part'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isMonthlySubjectsExpanded ? BAC_SUBJECTS : BAC_SUBJECTS.slice(0, DEFAULT_VISIBLE_SUBJECTS)).map((s) => {
                        const hrs = monthlyStats.subjectHoursMap[s.name] || 0;
                        const sess = monthlyStats.subjectSessionsMap[s.name] || 0;
                        const pct = monthlyStats.totalMonthlyHours > 0 ? Math.round((hrs / monthlyStats.totalMonthlyHours) * 100) : 0;
                        return (
                          <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/30">
                            <td className="py-2 px-2 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.hexColor }} />
                              <span>{s.name}</span>
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-teal-600 dark:text-teal-400">
                              {hrs.toFixed(1)}h
                            </td>
                            <td className="py-2 px-2 text-center text-slate-500">{sess}</td>
                            <td className="py-2 px-2 text-center font-semibold text-slate-400">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {BAC_SUBJECTS.length > DEFAULT_VISIBLE_SUBJECTS && (
                  <button
                    type="button"
                    onClick={() => setIsMonthlySubjectsExpanded(!isMonthlySubjectsExpanded)}
                    className="w-full mt-2 py-2 px-4 rounded-xl border border-dashed border-teal-500/30 hover:border-teal-500/60 bg-teal-500/5 hover:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 group cursor-pointer shadow-xs"
                  >
                    {isMonthlySubjectsExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                        <span>{isAr ? 'عرض أقل — Show Less' : 'Afficher moins — Show Less'}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                        <span>
                          {isAr
                            ? `عرض المزيد (+${BAC_SUBJECTS.length - DEFAULT_VISIBLE_SUBJECTS} مواد متبقية) — Show More`
                            : `Afficher plus (+${BAC_SUBJECTS.length - DEFAULT_VISIBLE_SUBJECTS} autres) — Show More`}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Reflection Journal Form */}
          <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-500" />
              <span>{t('wr_monthly_journal') || (isAr ? 'دفتر التقييم والتخطيط الشهري' : 'Journal de Réflexion Mensuel')}</span>
            </h3>

            <form onSubmit={handleSaveMonthly} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                    🏆 {t('wr_monthly_went_well') || (isAr ? 'أهم الإنجازات والنجاحات خلال هذا الشهر' : 'Principales réussites du mois')}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      isAr
                        ? 'مثال: إتمام البرنامج الدراسي لثلاث مواد رئيسية، زيادة ساعات التركيز اليومية...'
                        : 'Ex: Avancée majeure en Mathématiques et Physique, 40h d\'étude validées...'
                    }
                    value={monthlyWentWell}
                    onChange={(e) => setMonthlyWentWell(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500 resize-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                    ⚠️ {t('wr_monthly_challenges') || (isAr ? 'أبرز التحديات ونقاط التحسين' : 'Défis rencontrés et leçons apprises')}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      isAr
                        ? 'مثال: صعوبة الحفاظ على نفس الوتيرة في نهاية الأسبوع، إهمال مادة اللغات...'
                        : 'Ex: Baisse de régime en semaine 3, besoin d\'accélérer les fiches de SVT...'
                    }
                    value={monthlyChallenges}
                    onChange={(e) => setMonthlyChallenges(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500 resize-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
                  🎯 {t('wr_monthly_goals') || (isAr ? 'الأهداف الاستراتيجية للشهر القادم' : 'Objectifs clés pour le mois prochain')}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isAr
                      ? 'مثال: استكمال التمارين التجريبية، رفع المعدل اليومي إلى 5 ساعات...'
                      : 'Ex: Terminer les annales du Bac 2020-2025 et consolider les dissertations de philo...'
                  }
                  value={monthlyNextGoals}
                  onChange={(e) => setMonthlyNextGoals(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500 resize-none text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {isAr ? 'الهدف اليومي للشهر القادم (ساعات/يوم)' : 'Objectif d\'heures / jour pour le mois prochain'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="14"
                    value={monthlyTargetHours}
                    onChange={(e) => setMonthlyTargetHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {isAr ? 'المادة ذات الأولوية للشهر القادم' : 'Matière prioritaire pour le mois prochain'}
                  </label>
                  <select
                    value={monthlyPrioritySubj}
                    onChange={(e) => setMonthlyPrioritySubj(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium text-xs"
                  >
                    {BAC_SUBJECTS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>{t('wr_save_monthly') || (isAr ? '💾 حفظ التقرير الشهري' : '💾 Enregistrer le bilan mensuel')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW 3: ACHIEVEMENTS & TROPHIES GALLERY */}
      {/* ========================================================================= */}
      {activeReviewView === 'trophies' && (
        <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>{t('wr_achievements')}</span>
            </h3>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {achievements.filter((a) => a.unlocked).length} / {achievements.length} {isAr ? 'تم فتحها' : 'débloqués'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {achievements.map((ach) => {
              const title = ach.title[language] || ach.title.fr;
              const desc = ach.desc[language] || ach.desc.fr;
              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${ach.unlocked
                    ? 'bg-gradient-to-br from-amber-500/10 via-teal-500/10 to-indigo-500/10 dark:from-amber-950/30 dark:via-teal-950/30 dark:to-indigo-950/30 border-amber-500/30 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                      {ach.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {title}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {desc}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ach.unlocked ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                        style={{ width: `${ach.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>{ach.unlocked ? (isAr ? 'مكتمل ✓' : 'Débloqué ✓') : (isAr ? 'قيد الإنجاز' : 'En cours')}</span>
                      <span>{ach.progress}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: QUICK LOG STUDY HOURS (ENREGISTRER DES HEURES) */}
      {/* ========================================================================= */}
      {isQuickLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#1A2535] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-['Outfit']">
                    {isAr ? 'تسجيل ساعات دراسة' : 'Enregistrer une session d\'étude'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'تُسجل هذه الساعات مباشرة في الإحصائيات الأسبوعية والشهرية' : 'Vos heures seront directement synchronisées avec vos bilans'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickLogOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickLogSubmit} className="space-y-4">
              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'المادة الدراسية' : 'Matière'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                  {BAC_SUBJECTS.map((s) => {
                    const isSelected = quickLogSubject === s.name;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setQuickLogSubject(s.name)}
                        className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${isSelected
                          ? 'bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.hexColor }} />
                        <span className="truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'المدة' : 'Durée de la session'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[25, 45, 60, 90, 120, 180].map((mins) => {
                    const isSelected = quickLogDuration === mins;
                    const displayLabel = mins < 60 ? `${mins}m` : `${mins / 60}h`;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setQuickLogDuration(mins)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-500/50'
                          }`}
                      >
                        {displayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? 'تاريخ الحصة' : 'Date de la session'}
                  </label>
                  <input
                    type="date"
                    value={quickLogDate}
                    onChange={(e) => setQuickLogDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? 'نوع النشاط' : 'Type d\'activité'}
                  </label>
                  <select
                    value={quickLogType}
                    onChange={(e) => setQuickLogType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="study">{isAr ? 'درس نظري' : 'Cours & Théorie'}</option>
                    <option value="exercises">{isAr ? 'تمارين ومسائل' : 'Exercices & Problèmes'}</option>
                    <option value="revision">{isAr ? 'مراجعة وتلخيص' : 'Fiches & Révisions Bac'}</option>
                    <option value="homework">{isAr ? 'واجب منزلي' : 'Devoir surveillé/Maison'}</option>
                  </select>
                </div>
              </div>

              {/* Optional Title / Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'عنوان الحصة أو موضوع الدرس (اختياري)' : 'Titre / Chapitre révisé (Optionnel)'}
                </label>
                <input
                  type="text"
                  placeholder={
                    isAr
                      ? 'مثال: المتتاليات العددية، دراسة الدوال، قوانين نيوتن...'
                      : 'Ex: Les suites numériques, Mécanique de Newton, Synthèse...'
                  }
                  value={quickLogTitle}
                  onChange={(e) => setQuickLogTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Submit & Cancel */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickLogOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isAr ? 'تأكيد وحفظ الحصة' : 'Valider & Enregistrer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: SUBJECT DEEP DIVE & QUICK ACTIONS */}
      {/* ========================================================================= */}
      {selectedSubjectDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#1A2535] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: selectedSubjectDetail.hexColor }}
                />
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-['Outfit']">
                    {selectedSubjectDetail.name}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {isAr
                      ? `معامل البكالوريا: ${selectedSubjectDetail.coefficient}`
                      : `Coefficient Bac : ${selectedSubjectDetail.coefficient}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubjectDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subject Stats Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {isAr ? 'ساعات هذا الأسبوع' : 'Heures cette semaine'}
                </span>
                <div className="text-xl font-black font-['Outfit'] text-teal-600 dark:text-teal-400 mt-1">
                  {(weeklyStats.subjectHoursMap[selectedSubjectDetail.name] || 0).toFixed(1)}h
                </div>
                <span className="text-[10px] text-slate-400">
                  {weeklyStats.subjectSessionsMap[selectedSubjectDetail.name] || 0} {isAr ? 'حصص منجزة' : 'sessions faites'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {isAr ? 'ساعات هذا الشهر' : 'Heures ce mois'}
                </span>
                <div className="text-xl font-black font-['Outfit'] text-indigo-600 dark:text-indigo-400 mt-1">
                  {(monthlyStats.subjectHoursMap[selectedSubjectDetail.name] || 0).toFixed(1)}h
                </div>
                <span className="text-[10px] text-slate-400">
                  {monthlyStats.subjectSessionsMap[selectedSubjectDetail.name] || 0} {isAr ? 'حصص منجزة' : 'sessions faites'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {isAr ? 'إجراءات سريعة للمادة' : 'Actions rapides'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onStartFocusMode && (
                  <button
                    type="button"
                    onClick={() => {
                      const sName = selectedSubjectDetail.name;
                      setSelectedSubjectDetail(null);
                      onStartFocusMode(sName);
                    }}
                    className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/30 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isAr ? '⚡ مؤقت تركيز (25 د)' : '⚡ Focus Timer (25 min)'}</span>
                  </button>
                )}

                {onAddTimeBlock && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAddOneHourToSubject(selectedSubjectDetail.name);
                      setSelectedSubjectDetail(null);
                    }}
                    className="p-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isAr ? '+ إضافة 1 ساعة دراسة' : '+ Ajouter 1h d\'étude'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Pending Homework & Tasks */}
            {(() => {
              const pendingHW = (appData.homework || []).filter(
                (h) => h.subject === selectedSubjectDetail.name && h.status !== 'submitted'
              );
              const pendingTasks = (appData.tasks || []).filter(
                (t) => t.subject === selectedSubjectDetail.name && t.status !== 'completed'
              );

              return (
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'الواجبات والمهام المتبقية' : 'Devoirs & Tâches en attente'}
                  </span>
                  {pendingHW.length === 0 && pendingTasks.length === 0 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 py-1">
                      ✓ {isAr ? 'لا توجد واجبات أو مهام متأخرة لهذه المادة' : 'Aucun devoir ou tâche en retard pour cette matière'}
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {pendingHW.map((h) => (
                        <div
                          key={h.id}
                          className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between"
                        >
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 truncate">{h.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{h.dueDate}</span>
                        </div>
                      ))}
                      {pendingTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs flex items-center justify-between"
                        >
                          <span className="font-bold text-teal-700 dark:text-teal-300 truncate">{t.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{t.dueDate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setQuickLogSubject(selectedSubjectDetail.name);
                  setSelectedSubjectDetail(null);
                  setIsQuickLogOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors text-center"
              >
                {isAr ? 'تسجيل حصة مخصصة لهذه المادة' : 'Enregistrer une session détaillée'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
