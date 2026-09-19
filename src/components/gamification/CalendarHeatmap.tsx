import React, { useState, useMemo } from 'react';
import { Flame, Calendar, Sparkles, Trophy, Award, Clock, ChevronRight } from 'lucide-react';
import { AppLanguage, FullAppData, HabitItem, TaskItem, TimeBlock, LessonItem } from '../../types';
import { getLocalDateStr, calculateDailyStreak } from '../../utils/streak';

interface CalendarHeatmapProps {
  appData?: FullAppData;
  tasks?: TaskItem[];
  timeBlocks?: TimeBlock[];
  habits?: HabitItem[];
  habitLogs?: Record<string, Record<string, boolean>>;
  lessons?: LessonItem[];
  language: AppLanguage;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

const MONTH_NAMES_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_LABELS_FR = ['', 'Lun', '', 'Mer', '', 'Ven', ''];
const DAY_LABELS_AR = ['', 'إثن', '', 'أرب', '', 'جمع', ''];
const DAY_LABELS_EN = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  appData,
  tasks: propTasks,
  timeBlocks: propTimeBlocks,
  habits: propHabits,
  habitLogs: propHabitLogs,
  lessons: propLessons,
  language,
  title,
  subtitle,
  compact = false,
}) => {
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  // Merge data from props or appData
  const tasks = propTasks || appData?.tasks || [];
  const timeBlocks = propTimeBlocks || appData?.timeBlocks || [];
  const habits = propHabits || appData?.habits || [];
  const habitLogs = propHabitLogs || appData?.habitLogs || {};
  const lessons = propLessons || appData?.lessons || [];

  // Range options: 13 weeks (3 months), 26 weeks (6 months), 52 weeks (1 year)
  const [rangeWeeks, setRangeWeeks] = useState<13 | 26 | 52>(compact ? 16 : 26);
  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    count: number;
    tasksCount: number;
    habitsCount: number;
    studySessionsCount: number;
    studyHours: number;
    x: number;
    y: number;
  } | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // 1. Build map of all activities per date
  const activityMap = useMemo(() => {
    const map: Record<
      string,
      { tasks: number; habits: number; studySessions: number; studyHours: number; total: number }
    > = {};

    const getEntry = (date: string) => {
      if (!map[date]) {
        map[date] = { tasks: 0, habits: 0, studySessions: 0, studyHours: 0, total: 0 };
      }
      return map[date];
    };

    // Tasks completed
    tasks.forEach((t) => {
      if (t.status === 'completed') {
        const d = t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate;
        if (d) {
          const entry = getEntry(d);
          entry.tasks += 1;
          entry.total += 1;
        }
      }
    });

    // Habit logs
    Object.entries(habitLogs).forEach(([dKey, valMap]) => {
      const doneCount = Object.values(valMap).filter(Boolean).length;
      if (doneCount > 0) {
        const entry = getEntry(dKey);
        entry.habits += doneCount;
        entry.total += doneCount;
      }
    });

    // Habits history array fallback
    habits.forEach((h) => {
      (h.history || []).forEach((dKey) => {
        const entry = getEntry(dKey);
        entry.habits += 1;
        entry.total += 1;
      });
    });

    // TimeBlocks completed
    timeBlocks.forEach((b) => {
      if (b.isCompleted) {
        const d = b.dateKey || (b.completedAt ? b.completedAt.slice(0, 10) : null);
        if (d) {
          const entry = getEntry(d);
          entry.studySessions += 1;
          entry.total += 1;
          // compute duration
          if (b.startTime && b.endTime) {
            const [sh, sm] = b.startTime.split(':').map(Number);
            const [eh, em] = b.endTime.split(':').map(Number);
            const rawMins = (eh * 60 + em) - (sh * 60 + sm);
            const diffMins = Math.max(1, rawMins > 0 ? rawMins : rawMins + 1440);
            const dur = diffMins / 60;
            entry.studyHours = Math.round((entry.studyHours + dur) * 10) / 10;
          } else {
            entry.studyHours = Math.round((entry.studyHours + 1) * 10) / 10;
          }
        }
      }
    });

    // Lessons reviewed
    lessons.forEach((l) => {
      if (l.lastReviewed) {
        const entry = getEntry(l.lastReviewed);
        entry.total += 1;
      }
    });

    return map;
  }, [tasks, habitLogs, habits, timeBlocks, lessons]);

  // 2. Generate matrix of weeks (Sunday to Saturday or Monday to Sunday)
  const { weeks, monthLabels, totalContributions, activeDaysCount, maxInSingleDay } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Align to Sunday of current week
    const currentDayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - currentDayOfWeek));

    const totalDays = rangeWeeks * 7;
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - totalDays + 1);

    const weeksList: {
      date: Date;
      dateStr: string;
      isFuture: boolean;
      isToday: boolean;
      count: number;
      tasksCount: number;
      habitsCount: number;
      studySessionsCount: number;
      studyHours: number;
      level: number; // 0, 1, 2, 3, 4
    }[][] = [];

    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    let totalContr = 0;
    let activeDays = 0;
    let maxDay = 0;

    const todayStr = getLocalDateStr(today);

    let currentDate = new Date(startDate);
    for (let w = 0; w < rangeWeeks; w++) {
      const currentWeekDays = [];
      for (let d = 0; d < 7; d++) {
        const dStr = `${currentDate.getFullYear()}-${pad2(currentDate.getMonth() + 1)}-${pad2(currentDate.getDate())}`;
        const isFuture = currentDate > today;
        const isToday = dStr === todayStr;

        const info = activityMap[dStr] || { tasks: 0, habits: 0, studySessions: 0, studyHours: 0, total: 0 };
        const count = isFuture ? 0 : info.total;

        if (!isFuture && count > 0) {
          totalContr += count;
          activeDays += 1;
          if (count > maxDay) maxDay = count;
        }

        // Intensity Level 0 - 4
        let level = 0;
        if (!isFuture && count > 0) {
          if (count >= 7 || info.studyHours >= 4) level = 4;
          else if (count >= 5 || info.studyHours >= 2.5) level = 3;
          else if (count >= 3 || info.studyHours >= 1) level = 2;
          else level = 1;
        }

        // Track month change on row 0
        if (d === 0) {
          const m = currentDate.getMonth();
          if (m !== lastMonth) {
            lastMonth = m;
            const mNames = isAr ? MONTH_NAMES_AR : isFr ? MONTH_NAMES_FR : MONTH_NAMES_EN;
            months.push({ label: mNames[m], weekIndex: w });
          }
        }

        currentWeekDays.push({
          date: new Date(currentDate),
          dateStr: dStr,
          isFuture,
          isToday,
          count,
          tasksCount: info.tasks,
          habitsCount: info.habits,
          studySessionsCount: info.studySessions,
          studyHours: info.studyHours,
          level,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeksList.push(currentWeekDays);
    }

    return {
      weeks: weeksList,
      monthLabels: months,
      totalContributions: totalContr,
      activeDaysCount: activeDays,
      maxInSingleDay: maxDay,
    };
  }, [rangeWeeks, activityMap, isAr, isFr]);

  // Streak data
  const streakData = useMemo(() => {
    return calculateDailyStreak(tasks, habits, timeBlocks);
  }, [tasks, habits, timeBlocks]);

  const dayLabels = isAr ? DAY_LABELS_AR : isFr ? DAY_LABELS_FR : DAY_LABELS_EN;

  // Selected Day Details
  const selectedDayDetails = useMemo(() => {
    if (!selectedDay) return null;
    const info = activityMap[selectedDay] || { tasks: 0, habits: 0, studySessions: 0, studyHours: 0, total: 0 };
    return {
      dateStr: selectedDay,
      ...info,
    };
  }, [selectedDay, activityMap]);

  return (
    <div className="bento-card p-5 sm:p-6 bg-white dark:bg-[#111726]/90 border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Calendar className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
              {title || (isAr ? 'خريطة النشاط والانضباط اليومي' : 'Carte d\'Activité Quotidienne (Heatmap)')}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {subtitle ||
              (isAr
                ? 'خريطة حرارية لتتبع وتيرة إنجازاتك اليومية على مدار العام مثل GitHub Contributions'
                : 'Suivez la régularité de vos révisions et de vos devoirs au fil des semaines')}
          </p>
        </div>

        {/* Range Selector Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRangeWeeks(13)}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${rangeWeeks === 13
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            {isAr ? '3 أشهر' : '3 Mois'}
          </button>
          <button
            type="button"
            onClick={() => setRangeWeeks(26)}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${rangeWeeks === 26
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            {isAr ? '6 أشهر' : '6 Mois'}
          </button>
          <button
            type="button"
            onClick={() => setRangeWeeks(52)}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${rangeWeeks === 52
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            {isAr ? 'السنة كاملة' : '1 An'}
          </button>
        </div>
      </div>

      {/* 4 Summary Micro-Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            {isAr ? 'إجمالي الأنشطة' : 'Total Activités'}
          </span>
          <div className="text-xl font-black font-['Outfit'] text-teal-600 dark:text-teal-400 mt-0.5">
            {totalContributions}
          </div>
          <span className="text-[10px] text-slate-400">
            {isAr ? `خلال ${rangeWeeks} أسبوعاً` : `sur ${rangeWeeks} sem.`}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            {isAr ? 'الأيام النشطة' : 'Jours Actifs'}
          </span>
          <div className="text-xl font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400 mt-0.5">
            {activeDaysCount}
          </div>
          <span className="text-[10px] text-slate-400">
            {isAr ? `من أصل ${rangeWeeks * 7} يوماً` : `sur ${rangeWeeks * 7} jours`}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            {isAr ? 'السلسلة الحالية' : 'Série Actuelle'}
          </span>
          <div className="text-xl font-black font-['Outfit'] text-[#FF9600] mt-0.5 flex items-center gap-1">
            <Flame className="w-4 h-4 fill-current" />
            <span>{streakData.currentStreak} {isAr ? 'يوم' : 'j'}</span>
          </div>
          <span className="text-[10px] text-slate-400">
            {streakData.isTodayCompleted ? (isAr ? 'مشتعلة اليوم 🔥' : 'Validée') : (isAr ? 'في انتظار مهمة' : 'En attente')}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            {isAr ? 'أعلى إنجاز يومي' : 'Record Journalier'}
          </span>
          <div className="text-xl font-black font-['Outfit'] text-indigo-600 dark:text-indigo-400 mt-0.5">
            {maxInSingleDay}
          </div>
          <span className="text-[10px] text-slate-400">
            {isAr ? 'أنشطة في يوم واحد' : 'actions en un jour'}
          </span>
        </div>
      </div>

      {/* GitHub Heatmap Grid Area */}
      <div className="relative overflow-x-auto pb-2 pt-1 no-scrollbar select-none">
        <div className="inline-block min-w-full">
          {/* Month Header Labels */}
          <div className="flex text-[10px] font-semibold text-slate-400 mb-1.5 pl-7 rtl:pr-7 rtl:pl-0">
            {weeks.map((_, wIdx) => {
              const monthLabel = monthLabels.find((m) => m.weekIndex === wIdx);
              return (
                <div
                  key={wIdx}
                  className="shrink-0 w-3 sm:w-3.5 mx-[1.5px] text-center overflow-visible"
                >
                  {monthLabel ? (
                    <span className="whitespace-nowrap font-bold text-slate-600 dark:text-slate-300">
                      {monthLabel.label}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Grid: 7 Rows (Sun to Sat) */}
          <div className="flex items-start">
            {/* Day of week labels on left */}
            <div className="flex flex-col gap-[3px] text-[9px] font-semibold text-slate-400 pr-2 rtl:pl-2 rtl:pr-0 shrink-0 select-none">
              {dayLabels.map((lbl, dIdx) => (
                <div
                  key={dIdx}
                  className="h-3 sm:h-3.5 flex items-center justify-end leading-none"
                >
                  {lbl}
                </div>
              ))}
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px] shrink-0">
                  {week.map((day, dIdx) => {
                    // Cell colors according to level
                    let cellColor = 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/[0.04]';
                    if (day.isFuture) {
                      cellColor = 'bg-slate-50/40 dark:bg-slate-900/20 border border-transparent opacity-40 cursor-default';
                    } else if (day.level === 1) {
                      cellColor = 'bg-teal-200 dark:bg-teal-900/70 border border-teal-300/60 dark:border-teal-700/60';
                    } else if (day.level === 2) {
                      cellColor = 'bg-teal-400 dark:bg-teal-700 border border-teal-500/60 dark:border-teal-600/70';
                    } else if (day.level === 3) {
                      cellColor = 'bg-teal-500 dark:bg-teal-500 border border-teal-600/60 dark:border-teal-400/70';
                    } else if (day.level === 4) {
                      cellColor = 'bg-emerald-500 dark:bg-emerald-400 border border-emerald-400 dark:border-emerald-300 shadow-xs shadow-emerald-500/40';
                    }

                    const isSelected = selectedDay === day.dateStr;

                    return (
                      <div
                        key={dIdx}
                        onClick={() => {
                          if (!day.isFuture) {
                            setSelectedDay(isSelected ? null : day.dateStr);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!day.isFuture) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredDay({
                              dateStr: day.dateStr,
                              count: day.count,
                              tasksCount: day.tasksCount,
                              habitsCount: day.habitsCount,
                              studySessionsCount: day.studySessionsCount,
                              studyHours: day.studyHours,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-pointer ${cellColor} ${day.isToday ? 'ring-1.5 ring-amber-400 dark:ring-amber-400' : ''
                          } ${isSelected ? 'ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-slate-900 scale-110' : ''}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDay && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredDay.x}px`,
            top: `${hoveredDay.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs shadow-2xl border border-slate-700/80 space-y-1 animate-fade-in whitespace-nowrap"
        >
          <div className="font-bold flex items-center gap-1.5 text-teal-300">
            <span>📅</span>
            <span>
              {new Date(hoveredDay.dateStr + 'T12:00:00').toLocaleDateString(
                isAr ? 'ar-MA' : isFr ? 'fr-FR' : 'en-US',
                { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
              )}
            </span>
          </div>

          <div className="text-[11px] text-slate-200 font-semibold">
            {hoveredDay.count > 0 ? (
              <span>
                {hoveredDay.count} {isAr ? 'نشاط منجز' : 'activités complétées'}
              </span>
            ) : (
              <span className="text-slate-400">
                {isAr ? 'لا يوجد نشاط مسجل' : 'Aucune activité'}
              </span>
            )}
          </div>

          {hoveredDay.count > 0 && (
            <div className="pt-1 border-t border-slate-700/80 text-[10px] text-slate-300 space-y-0.5">
              {hoveredDay.tasksCount > 0 && (
                <div>• {hoveredDay.tasksCount} {isAr ? 'مهام مكتملة' : 'tâches faites'}</div>
              )}
              {hoveredDay.habitsCount > 0 && (
                <div>• {hoveredDay.habitsCount} {isAr ? 'عادات منجزة' : 'habitudes validées'}</div>
              )}
              {hoveredDay.studyHours > 0 && (
                <div>• {hoveredDay.studyHours}h {isAr ? 'ساعات دراسة' : 'heures d\'étude'}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Day Expanded Details Banner */}
      {selectedDayDetails && selectedDayDetails.total > 0 && (
        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'تفاصيل نشاط يوم ' : 'Détails du '}
              {new Date(selectedDayDetails.dateStr + 'T12:00:00').toLocaleDateString(
                isAr ? 'ar-MA' : isFr ? 'fr-FR' : 'en-US',
                { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
              )}:
            </span>
            <span className="font-black text-teal-600 dark:text-teal-400">
              {selectedDayDetails.total} {isAr ? 'إنجاز' : 'actions'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
            <span>✅ {selectedDayDetails.tasks} {isAr ? 'مهام' : 'tâches'}</span>
            <span>🌿 {selectedDayDetails.habits} {isAr ? 'عادات' : 'habitudes'}</span>
            <span>⏱️ {selectedDayDetails.studyHours}h {isAr ? 'دراسة' : 'heures'}</span>
          </div>
        </div>
      )}

      {/* Footer: Legend & Helper info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span>💡</span>
          <span>
            {isAr
              ? 'اضغط على أي مربع لرؤية تفاصيل نشاط ذلك اليوم'
              : 'Cliquez sur une case pour afficher le détail de la journée'}
          </span>
        </div>

        {/* GitHub-style Legend */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-[10px] font-semibold">
          <span>{isAr ? 'أقل' : 'Moins'}</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/[0.04]" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-teal-200 dark:bg-teal-900/70 border border-teal-300/60 dark:border-teal-700/60" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-teal-400 dark:bg-teal-700 border border-teal-500/60 dark:border-teal-600/70" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-teal-500 dark:bg-teal-500 border border-teal-600/60 dark:border-teal-400/70" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 dark:bg-emerald-400 border border-emerald-400 dark:border-emerald-300 shadow-xs" />
          <span>{isAr ? 'أكثر' : 'Plus'}</span>
        </div>
      </div>
    </div>
  );
};

