import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Flame,
  Trophy,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  Layers,
  History,
  TrendingUp,
  BookmarkCheck,
  CheckSquare,
  BookOpen,
} from 'lucide-react';
import { AppLanguage, FullAppData, TaskItem, TimeBlock } from '../../types';
import {
  calculateBestStreak,
  calculateDailyStreak,
  generateMonthCalendar,
  getAllStreakDates,
  getLocalDateStr,
  getTimeBlockCompletionOccurrences,
  syncAndGetPreservedStreaks,
  PreservedStreakRecord,
  CalendarDayInfo,
} from '../../utils/streak';
import { CalendarHeatmap } from './CalendarHeatmap';
import { DuolingoStreakFlame } from './DuolingoStreakFlame';

interface StreakHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: FullAppData;
  language: AppLanguage;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const WEEKDAY_NAMES_AR = ['إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'];
const WEEKDAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MILESTONES = [
  { days: 3, labelAr: 'شعلة البداية', labelFr: 'Premier éclat', labelEn: 'Spark', icon: '🔥' },
  { days: 7, labelAr: 'أسبوع ذهبي', labelFr: 'Semaine dorée', labelEn: 'Golden Week', icon: '⭐' },
  { days: 14, labelAr: 'الصمود الحديدي', labelFr: 'Persévérance', labelEn: 'Unstoppable', icon: '🛡️' },
  { days: 30, labelAr: 'سيد العادات', labelFr: 'Maître d’habitude', labelEn: 'Habit Master', icon: '🏆' },
  { days: 60, labelAr: 'أسطورة البكالوريا', labelFr: 'Légende du Bac', labelEn: 'Bac Legend', icon: '👑' },
  { days: 100, labelAr: 'المائوية الذهبية', labelFr: 'Club des 100', labelEn: 'Centurion', icon: '💎' },
];

export const StreakHistoryModal: React.FC<StreakHistoryModalProps> = ({
  isOpen,
  onClose,
  appData,
  language,
}) => {
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const todayStr = useMemo(() => getLocalDateStr(), []);
  const todayDate = useMemo(() => new Date(), []);

  // Tabs: 'calendar' | 'preserved' | 'heatmap'
  const [activeTab, setActiveTab] = useState<'calendar' | 'preserved' | 'heatmap'>('calendar');

  // Month navigation for calendar
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // 1. Gather all activity dates
  const allStreakDates = useMemo(() => {
    return getAllStreakDates(
      appData.tasks || [],
      appData.habitLogs || {},
      appData.habits || [],
      appData.timeBlocks || []
    );
  }, [appData.tasks, appData.habitLogs, appData.habits, appData.timeBlocks]);

  // 2. Strict daily streak data
  const streakData = useMemo(() => {
    return calculateDailyStreak(appData.tasks || [], Array.from(allStreakDates), appData.timeBlocks || []);
  }, [appData.tasks, allStreakDates, appData.timeBlocks]);

  // 3. Best streak ever
  const bestStreak = useMemo(() => {
    return calculateBestStreak(allStreakDates);
  }, [allStreakDates]);

  // 4. Preserved Historical Streaks
  const preservedStreaks = useMemo(() => {
    return syncAndGetPreservedStreaks(allStreakDates);
  }, [allStreakDates]);

  // 5. Calendar grid
  const calendarDays = useMemo(() => {
    return generateMonthCalendar(
      currentYear,
      currentMonth,
      allStreakDates,
      appData.tasks || [],
      appData.habitLogs || {},
      appData.timeBlocks || []
    );
  }, [currentYear, currentMonth, allStreakDates, appData.tasks, appData.habitLogs, appData.timeBlocks]);

  // Month stats
  const monthStats = useMemo(() => {
    const currentMonthDays = calendarDays.filter((d) => d.isCurrentMonth);
    const pastOrToday = currentMonthDays.filter((d) => d.dateStr <= todayStr);
    const maintainedCount = pastOrToday.filter((d) => d.isStreakMaintained).length;
    const rate = pastOrToday.length > 0 ? Math.round((maintainedCount / pastOrToday.length) * 100) : 0;
    return {
      totalInMonth: currentMonthDays.length,
      pastCount: pastOrToday.length,
      maintainedCount,
      rate,
    };
  }, [calendarDays, todayStr]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonth(todayDate.getMonth());
    setSelectedDateStr(todayStr);
  };

  // Inspect selected day activities
  const selectedDayActivities = useMemo(() => {
    const tasksOnDate = (appData.tasks || []).filter((t) => {
      if (t.status !== 'completed') return false;
      const completedStr = t.completedAt ? getLocalDateStr(new Date(t.completedAt)) : t.dueDate;
      return completedStr === selectedDateStr;
    });

    const blocksOnDate = (appData.timeBlocks || []).filter((b) => {
      return getTimeBlockCompletionOccurrences(b).some((occ) => occ.dateKey === selectedDateStr);
    });

    const isMaintained = allStreakDates.has(selectedDateStr);

    return {
      isMaintained,
      tasks: tasksOnDate,
      blocks: blocksOnDate,
      totalItems: tasksOnDate.length + blocksOnDate.length,
    };
  }, [appData.tasks, appData.timeBlocks, allStreakDates, selectedDateStr]);

  // Formatted selected date string
  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString(isAr ? 'ar-MA' : isFr ? 'fr-FR' : 'en-US', {
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
  }, [selectedDateStr, isAr, isFr]);

  const monthNames = isAr ? MONTH_NAMES_AR : isFr ? MONTH_NAMES_FR : MONTH_NAMES_EN;
  const weekdayNames = isAr ? WEEKDAY_NAMES_AR : isFr ? WEEKDAY_NAMES_FR : WEEKDAY_NAMES_EN;

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Bar */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-[#101a2e] to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <History className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white font-['Outfit'] tracking-tight">
                  {isAr ? 'سجل السلاسل والتقويم (Streak History)' : isFr ? 'Historique des séries & Calendrier' : 'Streak History & Calendar'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {streakData.currentStreak > 0 ? `${streakData.currentStreak} ${isAr ? 'يوم' : 'j'}` : '0 j'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'سجل كامل للأيام التي حافظت فيها على السلسلة اليومية، مع حفظ دائم لجميع السلاسل السابقة'
                  : isFr
                    ? 'Historique complet des jours validés avec préservation permanente de vos séries précédentes'
                    : 'Complete record of maintained daily streak days with permanent preservation of past streaks'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
          {/* 1. Four Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Current Streak */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">
                  {isAr ? 'السلسلة الحالية' : isFr ? 'Série Actuelle' : 'Current Streak'}
                </span>
                <Flame className={`w-4 h-4 ${streakData.isTodayCompleted ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-sky-400'}`} />
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-white">
                  {streakData.currentStreak} <span className="text-xs text-amber-400 font-bold">{isAr ? 'أيام' : 'jours'}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {streakData.isTodayCompleted
                    ? isAr ? '🔥 مشتعلة ونشطة اليوم!' : '🔥 Validée aujourd’hui !'
                    : isAr ? '❄️ في انتظار إنجاز اليوم' : '❄️ En attente aujourd’hui'}
                </div>
              </div>
            </div>

            {/* Card 2: All-Time Best Streak (Preserved Record) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/30 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider">
                  {isAr ? 'أفضل سلسلة محفوظة' : isFr ? 'Meilleur Record' : 'Best Streak'}
                </span>
                <Trophy className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-white">
                  {bestStreak} <span className="text-xs text-emerald-400 font-bold">{isAr ? 'أيام' : 'jours'}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isAr ? '🏆 رقم قياسي محفوظ دائمًا' : '🏆 Record historique préservé'}
                </div>
              </div>
            </div>

            {/* Card 3: Total Maintained Days */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/15 to-blue-500/5 border border-sky-500/30 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-sky-400 uppercase tracking-wider">
                  {isAr ? 'إجمالي أيام النشاط' : isFr ? 'Jours d’Étude Totaux' : 'Total Active Days'}
                </span>
                <CalendarIcon className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-white">
                  {allStreakDates.size} <span className="text-xs text-sky-400 font-bold">{isAr ? 'يوم' : 'jours'}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isAr ? '📅 أيام تم إنجاز مهام فيها' : '📅 Jours avec activité enregistrée'}
                </div>
              </div>
            </div>

            {/* Card 4: Preserved Streaks Count */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/5 border border-purple-500/30 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-purple-400 uppercase tracking-wider">
                  {isAr ? 'السلاسل المحفوظة' : isFr ? 'Séries Préservées' : 'Preserved Streaks'}
                </span>
                <BookmarkCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-white">
                  {preservedStreaks.length} <span className="text-xs text-purple-400 font-bold">{isAr ? 'سلسلة' : 'séries'}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isAr ? '📜 محفوظة في الأرشيف الدائم' : '📜 Archivées sans perte'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Tab Navigation Switcher */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'calendar'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{isAr ? 'تقويم السلسلة' : isFr ? 'Calendrier de la série' : 'Streak Calendar'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preserved')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preserved'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{isAr ? 'السلاسل السابقة المحفوظة' : isFr ? 'Séries précédentes sauvegardées' : 'Preserved Streaks'}</span>
                {preservedStreaks.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'preserved' ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-white'}`}>
                    {preservedStreaks.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('heatmap')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'heatmap'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{isAr ? 'خريطة النشاط السنوية' : isFr ? 'Heatmap Annuelle' : 'Yearly Heatmap'}</span>
              </button>
            </div>

            {activeTab === 'calendar' && (
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-2.5 py-1 text-xs font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 rounded-lg transition-colors cursor-pointer"
              >
                {isAr ? 'اليوم' : isFr ? "Aujourd'hui" : 'Today'}
              </button>
            )}
          </div>

          {/* 3. TAB 1: CALENDAR VIEW */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              {/* Month Navigation & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    aria-label="Mois précédent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="text-base font-black text-white font-['Outfit'] min-w-[140px] text-center">
                    {monthNames[currentMonth]} {currentYear}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    aria-label="Mois suivant"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Month Success Rate */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">
                    {isAr ? 'نسبة الانتظام هذا الشهر:' : isFr ? 'Assiduité du mois :' : 'Monthly consistency:'}
                  </span>
                  <span className="font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {monthStats.rate}% ({monthStats.maintainedCount}/{monthStats.pastCount || monthStats.totalInMonth} {isAr ? 'يوم' : 'j'})
                  </span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="bg-slate-950/40 rounded-2xl border border-slate-800 p-3 sm:p-4">
                {/* Weekday Header */}
                <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                  {weekdayNames.map((w, idx) => (
                    <div key={idx} className="text-[11px] font-black uppercase tracking-wider text-slate-400 py-1">
                      {w}
                    </div>
                  ))}
                </div>

                {/* Day Slots */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((day, idx) => {
                    const isSelected = day.dateStr === selectedDateStr;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDateStr(day.dateStr)}
                        className={`relative min-h-[58px] sm:min-h-[64px] p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer text-left rtl:text-right ${
                          isSelected
                            ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-500/10'
                            : day.isCurrentMonth
                              ? 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800'
                              : 'bg-slate-950/30 border-slate-800/40 opacity-40 hover:opacity-75'
                        }`}
                      >
                        {/* Day Number and Today Tag */}
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-xs font-bold ${
                              day.isToday
                                ? 'text-amber-400 font-black'
                                : day.isCurrentMonth
                                  ? 'text-slate-200'
                                  : 'text-slate-400'
                            }`}
                          >
                            {day.dayNumber}
                          </span>
                          {day.isToday && (
                            <span className="text-[8px] font-black uppercase px-1 rounded-sm bg-amber-500 text-slate-950 leading-tight">
                              {isAr ? 'اليوم' : 'Auj'}
                            </span>
                          )}
                        </div>

                        {/* Streak Flame or Check Icon */}
                        <div className="flex items-center justify-center my-0.5">
                          {day.isStreakMaintained ? (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-xs shadow-amber-500/30">
                              <Flame className="w-3.5 h-3.5 text-slate-950 fill-slate-950 stroke-[2.5]" />
                            </div>
                          ) : day.isFuture ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                          )}
                        </div>

                        {/* Completed tasks badge */}
                        <div className="text-[9px] text-center text-slate-400">
                          {day.completedTasksCount > 0 ? (
                            <span className="text-emerald-400 font-bold">
                              ✓ {day.completedTasksCount}
                            </span>
                          ) : (
                            <span className="opacity-0">-</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Details Inspector */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white capitalize">
                      {formattedSelectedDate}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                      selectedDayActivities.isMaintained
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {selectedDayActivities.isMaintained ? (
                      <>
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>{isAr ? 'السلسلة كانت نشطة ومشتعلة!' : 'Série maintenue avec succès !'}</span>
                      </>
                    ) : (
                      <span>{isAr ? 'لم تسجل أي مهمة في هذا اليوم' : 'Aucune tâche validée ce jour'}</span>
                    )}
                  </span>
                </div>

                {/* List of activities completed on selected day */}
                {selectedDayActivities.totalItems > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {isAr ? 'المهام والجلسات المنجزة:' : 'Activités validées :'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedDayActivities.tasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-white truncate">{t.title}</span>
                          {t.subject && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 shrink-0">
                              {t.subject}
                            </span>
                          )}
                        </div>
                      ))}

                      {selectedDayActivities.blocks.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-semibold text-white truncate">{b.title}</span>
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 shrink-0">
                            {b.startTime}-{b.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {isAr
                      ? 'يمكنك إنجاز المهام في جدول الـ Planner أو قائمة المهام لتوثيق نشاط هذا اليوم.'
                      : 'Validez vos tâches dans le Planner ou dans la liste pour enregistrer votre activité.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 4. TAB 2: PRESERVED HISTORICAL STREAKS ARCHIVE */}
          {activeTab === 'preserved' && (
            <div className="space-y-5">
              {/* Motivational Milestones */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    {isAr ? 'أوسمة وسجلات السلاسل المتتالية' : isFr ? 'Paliers & Badges de série' : 'Streak Milestones & Badges'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {MILESTONES.map((m) => {
                    const isUnlocked = bestStreak >= m.days;
                    return (
                      <div
                        key={m.days}
                        className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                          isUnlocked
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-xs'
                            : 'bg-slate-900/60 border-slate-800 opacity-50 text-slate-400'
                        }`}
                      >
                        <span className="text-2xl mb-1">{m.icon}</span>
                        <span className="text-xs font-black font-['Outfit']">
                          {m.days} {isAr ? 'أيام' : 'j'}
                        </span>
                        <span className="text-[10px] font-bold mt-0.5 line-clamp-1">
                          {isAr ? m.labelAr : isFr ? m.labelFr : m.labelEn}
                        </span>
                        <span className={`text-[9px] mt-1 font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                          isUnlocked ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isUnlocked ? (isAr ? 'مُنجز ✓' : 'Débloqué') : (isAr ? 'قيد القفل' : 'Verrouillé')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preserved Streaks Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isAr ? 'سجل السلاسل التاريخية المحفوظة' : isFr ? 'Historique chronologique des séries' : 'Chronological Streak Records'}</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {preservedStreaks.length} {isAr ? 'سلسلة مسجلة' : 'séries au total'}
                  </span>
                </div>

                {preservedStreaks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {preservedStreaks.map((streak, idx) => (
                      <div
                        key={streak.id || idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          streak.isActive
                            ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-slate-900 border-amber-500/50 shadow-md shadow-amber-500/10'
                            : streak.isRecord
                              ? 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-slate-900 border-emerald-500/40'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {streak.isActive ? (
                              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                                <Flame className="w-4 h-4 fill-current" />
                              </div>
                            ) : streak.isRecord ? (
                              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                                <Trophy className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-black">
                                <BookmarkCheck className="w-4 h-4" />
                              </div>
                            )}

                            <div>
                              <div className="text-base font-black text-white font-['Outfit']">
                                {streak.length} {isAr ? 'أيام متتالية' : streak.length > 1 ? 'jours consécutifs' : 'jour'}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {streak.startDate} ➔ {streak.endDate}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {streak.isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950 shadow-xs animate-pulse">
                                {isAr ? '🔥 جارية الآن' : '🔥 Active'}
                              </span>
                            )}
                            {streak.isRecord && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                {isAr ? '🏆 رقم قياسي' : '🏆 Record'}
                              </span>
                            )}
                            {!streak.isActive && !streak.isRecord && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                                {isAr ? '📜 محفوظة' : '📜 Préservée'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
                    <Flame className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">
                      {isAr ? 'لا توجد سلاسل محفوظة حتى الآن' : 'Aucune série enregistrée pour le moment'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {isAr
                        ? 'أكمل أول مهمة في الـ Planner أو قائمة المهام لبدء أول سلسلة متتالية وحفظها في سجلك الدائم.'
                        : 'Complétez une première tâche dans le Planner pour démarrer et préserver votre première série.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. TAB 3: ACTIVITY HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="space-y-4">
              <CalendarHeatmap
                appData={appData}
                language={language}
                title={isAr ? 'خريطة الاستمرارية السنوية' : isFr ? 'Heatmap d’Assiduité Annuelle' : 'Yearly Consistency Heatmap'}
                subtitle={isAr ? 'تدرج الألوان يوضح كثافة المهام وساعات الدراسة المنجزة لكل يوم' : isFr ? 'L’intensité des cases représente le volume de tâches et d’heures étudiées' : 'Tile intensity represents task completion and study volume'}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'كل يوم تنجز فيه مهمة يحفظ استمرارية شعلتك إلى الأبد' : 'Chaque jour validé perpétue votre flamme'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
          >
            {isAr ? 'إغلاق' : isFr ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
