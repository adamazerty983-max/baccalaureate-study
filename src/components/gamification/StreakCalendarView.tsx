import React, { useState, useMemo } from 'react';
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Trophy,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  CheckSquare,
  ListTodo,
  TrendingUp,
  X,
} from 'lucide-react';
import { AppLanguage, HabitItem, TaskItem, TimeBlock } from '../../types';
import {
  calculateBestStreak,
  calculateDailyStreak,
  generateMonthCalendar,
  getAllStreakDates,
  getLocalDateStr,
  CalendarDayInfo,
} from '../../utils/streak';
import { chimePlayer } from '../../utils/audio';
import { getT } from '../../utils/i18n';

interface StreakCalendarViewProps {
  tasks: TaskItem[];
  habits: HabitItem[];
  habitLogs?: Record<string, Record<string, boolean>>;
  timeBlocks?: TimeBlock[];
  language: AppLanguage;
}

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const MONTH_NAMES_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'ماي',
  'يونيو',
  'يوليوز',
  'غشت',
  'شتنبر',
  'أكتوبر',
  'نونبر',
  'دجنبر',
];

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const WEEKDAY_NAMES_AR = ['إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'];
const WEEKDAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const StreakCalendarView: React.FC<StreakCalendarViewProps> = ({
  tasks = [],
  habits = [],
  habitLogs = {},
  timeBlocks = [],
  language,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const todayStr = getLocalDateStr();
  const todayDate = new Date();

  // Current view Month & Year
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth());

  // Selected Day for Detailed Inspection
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Filter mode: 'all' | 'tasks' | 'habits'
  const [filterSource, setFilterSource] = useState<'all' | 'tasks' | 'habits'>('all');

  // Compute all streak dates
  const streakDates = useMemo(() => {
    if (filterSource === 'tasks') {
      return getAllStreakDates(tasks, {}, [], timeBlocks);
    }
    if (filterSource === 'habits') {
      return getAllStreakDates([], habitLogs, habits, []);
    }
    return getAllStreakDates(tasks, habitLogs, habits, timeBlocks);
  }, [tasks, habitLogs, habits, timeBlocks, filterSource]);

  // Daily Streak Engine calculation strictly with tasks and timeBlocks
  const dailyStreakData = useMemo(() => {
    return calculateDailyStreak(tasks, Array.from(streakDates), timeBlocks);
  }, [tasks, streakDates, timeBlocks]);

  // Best streak ever
  const bestStreak = useMemo(() => {
    return calculateBestStreak(streakDates);
  }, [streakDates]);

  // Calendar Grid Days
  const calendarDays = useMemo(() => {
    return generateMonthCalendar(currentYear, currentMonth, streakDates, tasks, habitLogs, timeBlocks);
  }, [currentYear, currentMonth, streakDates, tasks, habitLogs, timeBlocks]);

  // Month Statistics
  const monthStats = useMemo(() => {
    const currentMonthDays = calendarDays.filter((d) => d.isCurrentMonth);
    const totalDaysInMonth = currentMonthDays.length;

    // Past or today days in this month
    const pastOrTodayDays = currentMonthDays.filter((d) => d.dateStr <= todayStr);
    const maintainedDays = pastOrTodayDays.filter((d) => d.isStreakMaintained).length;

    const rate = pastOrTodayDays.length > 0
      ? Math.round((maintainedDays / pastOrTodayDays.length) * 100)
      : 0;

    return {
      totalDaysInMonth,
      maintainedDays,
      pastDaysCount: pastOrTodayDays.length,
      successRate: rate,
    };
  }, [calendarDays, todayStr]);

  // Month & Weekday localized names
  const monthNames = isAr ? MONTH_NAMES_AR : language === 'fr' ? MONTH_NAMES_FR : MONTH_NAMES_EN;
  const weekdayNames = isAr
    ? WEEKDAY_NAMES_AR
    : language === 'fr'
      ? WEEKDAY_NAMES_FR
      : WEEKDAY_NAMES_EN;

  // Handlers for month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonth(todayDate.getMonth());
    setSelectedDateStr(todayStr);
  };

  // Selected date details
  const selectedDayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status !== 'completed') return false;
      if (t.completedAt && getLocalDateStr(new Date(t.completedAt)) === selectedDateStr) return true;
      if (!t.completedAt && t.dueDate === selectedDateStr) return true;
      return false;
    });
  }, [tasks, selectedDateStr]);

  const selectedDayHabits = useMemo(() => {
    const log = habitLogs[selectedDateStr] || {};
    return habits.filter((h) => Boolean(log[h.id]) || (h.history && h.history.includes(selectedDateStr)));
  }, [habits, habitLogs, selectedDateStr]);

  const isSelectedDateMaintained = streakDates.has(selectedDateStr);

  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString(isAr ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return selectedDateStr;
  }, [selectedDateStr, isAr, language]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Current Streak */}
        <div
          onClick={() => {
          }}
          className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent dark:from-amber-950/40 dark:via-orange-950/20 dark:to-slate-900/40 p-4 sm:p-5 rounded-3xl border border-amber-500/30 dark:border-amber-500/20 shadow-xs flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.02] active:scale-98"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              {isAr ? 'الشعلة الحالية' : 'Série Actuelle'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-slate-900 dark:text-white">
              {dailyStreakData.currentStreak}{' '}
              <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
                {isAr ? 'أيام' : 'jours'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {dailyStreakData.isTodayCompleted
                ? isAr
                  ? '✓ تم تأكيد اليوم'
                  : '✓ Validé aujourd’hui'
                : isAr
                  ? '⚡ بانتظار إنجاز اليوم'
                  : '⚡ En attente de validation'}
            </p>
          </div>
        </div>

        {/* Card 2: Best Streak Record */}
        <div className="bg-white dark:bg-[#1A2535] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isAr ? 'أفضل رقم قياسي' : 'Record Historique'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-slate-900 dark:text-white">
              {Math.max(bestStreak, dailyStreakData.currentStreak)}{' '}
              <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400">
                {isAr ? 'أيام' : 'jours'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? 'أطول سلسلة متواصلة' : 'Plus longue série'}
            </p>
          </div>
        </div>

        {/* Card 3: Days Maintained This Month */}
        <div className="bg-white dark:bg-[#1A2535] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isAr ? 'أيام الشعلة هذا الشهر' : 'Jours actifs du mois'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-slate-900 dark:text-white">
              {monthStats.maintainedDays}{' '}
              <span className="text-xs sm:text-sm font-bold text-slate-400">
                / {monthStats.totalDaysInMonth}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {monthNames[currentMonth]} {currentYear}
            </p>
          </div>
        </div>

        {/* Card 4: Monthly Success Rate */}
        <div className="bg-white dark:bg-[#1A2535] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isAr ? 'نسبة الانضباط' : 'Taux de régularité'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400">
              {monthStats.successRate}%
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${monthStats.successRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="bg-white dark:bg-[#1A2535] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Navigation & Controls Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Month & Year Title with Next/Prev */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={isAr ? 'الشهر السابق' : 'Mois précédent'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={isAr ? 'الشهر التالي' : 'Mois suivant'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
                <span>{monthNames[currentMonth]}</span>
                <span className="text-teal-600 dark:text-teal-400 font-bold">{currentYear}</span>
              </h2>
            </div>
          </div>

          {/* Right Controls: Filters and Today Button */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterSource('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterSource === 'all'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {isAr ? 'الكل (مهام وعادات)' : 'Tout'}
              </button>
              <button
                type="button"
                onClick={() => setFilterSource('tasks')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterSource === 'tasks'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {isAr ? 'المهام' : 'Tâches'}
              </button>
              <button
                type="button"
                onClick={() => setFilterSource('habits')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterSource === 'habits'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {isAr ? 'العادات' : 'Habitudes'}
              </button>
            </div>

            {/* Jump to Today Button */}
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {isAr ? 'اليوم' : "Aujourd'hui"}
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4 sm:p-6">
          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
            {weekdayNames.map((name, idx) => (
              <div
                key={idx}
                className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 py-1"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((day, idx) => {
              const isSelected = day.dateStr === selectedDateStr;
              const isStreak = day.isStreakMaintained;
              const isCurrent = day.isCurrentMonth;
              const isToday = day.isToday;
              const isFuture = day.isFuture;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDateStr(day.dateStr);
                    if (isStreak) {
                    }
                  }}
                  className={`relative min-h-[64px] sm:min-h-[82px] p-1.5 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${isSelected
                      ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/40 dark:bg-teal-950/30'
                      : isStreak
                        ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-slate-900/40 border-amber-500/40 hover:border-amber-500 shadow-xs'
                        : isToday
                          ? 'bg-slate-50 dark:bg-slate-800/80 border-dashed border-teal-500/50 hover:border-teal-500'
                          : !isCurrent
                            ? 'bg-slate-50/40 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/40 opacity-40 hover:opacity-70'
                            : 'bg-white dark:bg-[#1A2535] border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  {/* Top Day Number & Today Label */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-black ${isToday
                          ? 'text-teal-600 dark:text-teal-400'
                          : isStreak
                            ? 'text-amber-800 dark:text-amber-300'
                            : isCurrent
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-400 dark:text-slate-600'
                        }`}
                    >
                      {day.dayNumber}
                    </span>

                    {isToday && (
                      <span className="px-1.5 py-0.2 rounded-md bg-teal-600 text-white text-[9px] font-black uppercase tracking-tight">
                        {isAr ? 'اليوم' : 'Auj'}
                      </span>
                    )}
                  </div>

                  {/* Center / Bottom Streak Highlight Badge */}
                  <div className="mt-1 flex items-center justify-center min-h-[26px]">
                    {isStreak ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF9600] text-[#131F24] text-[11px] font-black shadow-sm animate-in zoom-in-50 duration-200">
                        <Flame className="w-3.5 h-3.5 fill-[#131F24] text-[#131F24]" />
                        <span className="hidden sm:inline">
                          {isAr ? 'شعلة' : 'Série'}
                        </span>
                      </div>
                    ) : isToday ? (
                      <div className="text-[10px] font-bold text-amber-500/90 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="hidden sm:inline">
                          {isAr ? 'في الانتظار' : 'En attente'}
                        </span>
                      </div>
                    ) : isFuture ? (
                      <span className="text-[10px] text-slate-300 dark:text-slate-700">•</span>
                    ) : isCurrent ? (
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">-</span>
                    ) : null}
                  </div>

                  {/* Micro activity indicators dots */}
                  {(day.completedTasksCount > 0 || day.completedHabitsCount > 0) && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {day.completedTasksCount > 0 && (
                        <span
                          title={`${day.completedTasksCount} tâche(s)`}
                          className="w-1.5 h-1.5 rounded-full bg-teal-500"
                        />
                      )}
                      {day.completedHabitsCount > 0 && (
                        <span
                          title={`${day.completedHabitsCount} habitude(s)`}
                          className="w-1.5 h-1.5 rounded-full bg-amber-500"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 font-semibold">
              <div className="w-4 h-4 rounded-md bg-amber-500 text-white flex items-center justify-center">
                <Flame className="w-3 h-3 fill-white" />
              </div>
              <span>{isAr ? 'يوم مكتمل بسلسلة متواصلة' : 'Jour de série maintenu (Validé)'}</span>
            </div>

            <div className="flex items-center gap-1.5 font-semibold">
              <div className="w-4 h-4 rounded-md border-2 border-dashed border-teal-500 flex items-center justify-center text-teal-600">
                <Clock className="w-2.5 h-2.5" />
              </div>
              <span>{isAr ? 'اليوم الحالي (في انتظار التأكيد)' : "Aujourd'hui (En attente)"}</span>
            </div>

            <div className="flex items-center gap-1.5 font-semibold">
              <div className="w-4 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
              <span>{isAr ? 'يوم بدون نشاط' : 'Jour inactif / Repos'}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            {isAr
              ? '💡 اضغط على أي يوم في التقويم لعرض تفاصيل الإنجازات'
              : '💡 Cliquez sur une date pour afficher le détail des tâches et habitudes accomplies'}
          </div>
        </div>
      </div>

      {/* Selected Day Activity Details Card */}
      <div className="bg-white dark:bg-[#1A2535] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isSelectedDateMaintained
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
            >
              {isSelectedDateMaintained ? (
                <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
              ) : (
                <CalendarIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white capitalize">
                {formattedSelectedDate}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {isSelectedDateMaintained ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    {isAr
                      ? '🔥 تم الحفاظ على الشعلة بنجاح في هذا اليوم!'
                      : '🔥 Série maintenue avec succès ce jour-là !'}
                  </span>
                ) : selectedDateStr === todayStr ? (
                  <span className="text-teal-600 dark:text-teal-400">
                    {isAr
                      ? '⚡ بانتظار تأكيد مهمة اليوم لإشعال الشعلة'
                      : '⚡ En attente d’une validation aujourd’hui'}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {isAr ? 'لم يتم تسجيل نشاط في هذا اليوم' : 'Aucune activité enregistrée ce jour-là'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
              {selectedDayTasks.length} {isAr ? 'مهام' : 'tâche(s)'}
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
              {selectedDayHabits.length} {isAr ? 'عادات' : 'habitude(s)'}
            </span>
          </div>
        </div>

        {/* Tasks and Habits lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Completed Tasks on this day */}
          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{isAr ? 'المهام المنجزة' : 'Tâches accomplies'}</span>
            </h4>

            {selectedDayTasks.length > 0 ? (
              <div className="space-y-1.5">
                {selectedDayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {task.title}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                      {task.subject}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                {isAr ? 'لا توجد مهام منجزة في هذا اليوم' : 'Aucune tâche validée sur cette date'}
              </p>
            )}
          </div>

          {/* Habits completed on this day */}
          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'العادات المنضبطة' : 'Habitudes validées'}</span>
            </h4>

            {selectedDayHabits.length > 0 ? (
              <div className="space-y-1.5">
                {selectedDayHabits.map((habit) => (
                  <div
                    key={habit.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{habit.icon || '📚'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {habit.name}
                      </span>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] shrink-0">
                      ✓ {isAr ? 'مكتملة' : 'Validée'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                {isAr ? 'لا توجد عادات مسجلة في هذا اليوم' : 'Aucune habitude validée sur cette date'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};