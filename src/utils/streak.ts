import { AppLanguage, TaskItem, TimeBlock } from '../types';

/**
 * Returns local YYYY-MM-DD string
 */
export function getLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calculates duration in hours of a time block
 */
export function getTimeBlockDurationHours(b: { startTime: string; endTime: string }): number {
  const startM = parseTimeToMinutes(b.startTime);
  const endM = parseTimeToMinutes(b.endTime);
  if (endM <= startM) return 1;
  return Math.round(((endM - startM) / 60) * 100) / 100;
}

/**
 * Extracts set of dates (YYYY-MM-DD) on which tasks or timeblocks were marked completed.
 * A day ONLY counts if at least one task or time block was explicitly marked completed.
 */
export function getCompletedActivityDates(
  tasks: TaskItem[] = [],
  timeBlocks: TimeBlock[] = [],
  extraDates: string[] | Set<string> = []
): Set<string> {
  const dates = new Set<string>();

  // 1. TimeBlocks from the Planner (the exact item list where user clicks [✓])
  timeBlocks.forEach((b) => {
    if (b.isCompleted) {
      if (b.completedAt) {
        const d = new Date(b.completedAt);
        if (!isNaN(d.getTime())) {
          dates.add(getLocalDateStr(d));
          return;
        }
      }
      if (b.dateKey) {
        dates.add(b.dateKey);
      }
    }
  });

  // 2. Task items
  tasks.forEach((t) => {
    if (t.status === 'completed') {
      if (t.completedAt) {
        const d = new Date(t.completedAt);
        if (!isNaN(d.getTime())) {
          dates.add(getLocalDateStr(d));
          return;
        }
      }
      if (t.dueDate) {
        dates.add(t.dueDate);
      }
    }
  });

  // 3. Extra dates
  if (extraDates instanceof Set) {
    extraDates.forEach((d) => dates.add(d));
  } else if (Array.isArray(extraDates)) {
    extraDates.forEach((d) => dates.add(d));
  }

  return dates;
}

/**
 * Backwards compatibility helper
 */
export function getCompletedTaskDates(tasks: TaskItem[] = []): Set<string> {
  return getCompletedActivityDates(tasks, []);
}

export interface DailyStreakCalculation {
  currentStreak: number;
  isTodayCompleted: boolean;
  hasActivityYesterday: boolean;
  completedDates: Set<string>;
  totalCompletedTasks: number;
  todayTasksCompletedCount: number;
  todayStudyHours: number;
  totalStudyHours: number;
  bestStreak: number;
}

/**
 * Computes the strict daily task streak:
 * - A day is counted IF AND ONLY IF at least one task or timeblock is marked completed.
 * - Simply visiting or opening the website does NOT count the day.
 * - If today has a completed task, the streak counts today and counts backwards consecutively.
 * - If today has NO completed task, but yesterday had a completed task, the streak is preserved (pending today's task).
 * - If yesterday had no completed task and today has no completed task, the streak is 0.
 */
export function calculateDailyStreak(
  tasks: TaskItem[] = [],
  extraCompletedDates: string[] | Set<string> = [],
  timeBlocks: TimeBlock[] = []
): DailyStreakCalculation {
  const completedDates = getCompletedActivityDates(tasks, timeBlocks, extraCompletedDates);

  const today = new Date();
  const todayStr = getLocalDateStr(today);
  const isTodayCompleted = completedDates.has(todayStr);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);
  const hasActivityYesterday = completedDates.has(yesterdayStr);

  let currentStreak = 0;

  if (isTodayCompleted) {
    // Today is completed -> streak starts at 1 and counts backwards
    currentStreak = 1;
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const dateKey = getLocalDateStr(checkDate);
      if (completedDates.has(dateKey)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else if (hasActivityYesterday) {
    // Yesterday was completed, today is still pending completion
    let checkDate = new Date(yesterday);
    while (true) {
      const dateKey = getLocalDateStr(checkDate);
      if (completedDates.has(dateKey)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  // Count completed tasks and timeblocks today
  const completedTasksToday = tasks.filter(
    (t) =>
      t.status === 'completed' &&
      ((t.completedAt && getLocalDateStr(new Date(t.completedAt)) === todayStr) ||
        (!t.completedAt && t.dueDate === todayStr))
  ).length;

  const completedBlocksToday = timeBlocks.filter(
    (b) =>
      b.isCompleted &&
      ((b.completedAt && getLocalDateStr(new Date(b.completedAt)) === todayStr) ||
        (!b.completedAt && b.dateKey === todayStr))
  ).length;

  const todayTasksCompletedCount = completedTasksToday + completedBlocksToday;
  const totalCompletedTasks =
    tasks.filter((t) => t.status === 'completed').length +
    timeBlocks.filter((b) => b.isCompleted).length;

  // Compute completed study hours
  const completedStudyBlocks = timeBlocks.filter((b) => b.isCompleted && b.type === 'study');
  const todayStudyHours = completedStudyBlocks
    .filter(
      (b) =>
        (b.completedAt && getLocalDateStr(new Date(b.completedAt)) === todayStr) ||
        (!b.completedAt && b.dateKey === todayStr)
    )
    .reduce((acc, b) => acc + getTimeBlockDurationHours(b), 0);

  const totalStudyHours = completedStudyBlocks.reduce(
    (acc, b) => acc + getTimeBlockDurationHours(b),
    0
  );

  const bestStreak = calculateBestStreak(completedDates);

  return {
    currentStreak,
    isTodayCompleted,
    hasActivityYesterday,
    completedDates,
    totalCompletedTasks,
    todayTasksCompletedCount,
    todayStudyHours: Math.round(todayStudyHours * 10) / 10,
    totalStudyHours: Math.round(totalStudyHours * 10) / 10,
    bestStreak,
  };
}

export interface WeekDayStreakStatus {
  name: string;
  dateStr: string;
  status: 'done' | 'flame' | 'empty' | 'future';
  isToday: boolean;
  isCompleted: boolean;
}

/**
 * Generates 7-day row representation for the Streak Flame Widget (Monday to Sunday)
 */
export function getWeekDaysStreakStatus(
  completedDates: Set<string>,
  language: AppLanguage = 'fr'
): WeekDayStreakStatus[] {
  const isAr = language === 'ar';
  const today = new Date();
  const todayStr = getLocalDateStr(today);

  // Monday = 0, Tuesday = 1, ..., Sunday = 6
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const mondayOffset = (dayOfWeek + 6) % 7;

  const dayNamesAr = ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'];
  const dayNamesFr = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
  const dayNamesEn = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const names = isAr ? dayNamesAr : language === 'fr' ? dayNamesFr : dayNamesEn;

  return names.map((name, idx) => {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - mondayOffset + idx);
    const dateKey = getLocalDateStr(targetDate);
    const isCompleted = completedDates.has(dateKey);
    const isToday = dateKey === todayStr;

    let status: 'done' | 'flame' | 'empty' | 'future' = 'empty';

    if (isToday) {
      status = isCompleted ? 'flame' : 'empty';
    } else if (idx < mondayOffset) {
      // Past days in the current week
      status = isCompleted ? 'done' : 'empty';
    } else {
      // Future days in the current week
      status = isCompleted ? 'done' : 'future';
    }

    return {
      name,
      dateStr: dateKey,
      status,
      isToday,
      isCompleted,
    };
  });
}

/**
 * Aggregates all streak activity dates from both tasks and habit logs
 */
export function getAllStreakDates(
  tasks: TaskItem[] = [],
  habitLogs: Record<string, Record<string, boolean>> = {},
  habits: { id: string; history?: string[] }[] = [],
  timeBlocks: TimeBlock[] = []
): Set<string> {
  const dates = getCompletedActivityDates(tasks, timeBlocks);

  // Add from habit logs
  Object.keys(habitLogs).forEach((dateKey) => {
    const dayLog = habitLogs[dateKey];
    if (dayLog && Object.values(dayLog).some((v) => Boolean(v))) {
      dates.add(dateKey);
    }
  });

  // Add from habit history arrays
  habits.forEach((h) => {
    if (h.history && Array.isArray(h.history)) {
      h.history.forEach((d) => dates.add(d));
    }
  });

  return dates;
}

/**
 * Calculates the longest streak ever achieved based on a set of completed dates
 */
export function calculateBestStreak(completedDates: Set<string>): number {
  if (completedDates.size === 0) return 0;

  const sortedDates = Array.from(completedDates).sort();
  let maxStreak = 0;
  let currentStreak = 0;
  let prevDate: Date | null = null;

  sortedDates.forEach((dateStr) => {
    const currentDate = new Date(dateStr);
    if (isNaN(currentDate.getTime())) return;

    if (!prevDate) {
      currentStreak = 1;
    } else {
      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    prevDate = currentDate;
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }
  });

  return maxStreak;
}

export interface CalendarDayInfo {
  dayNumber: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  isStreakMaintained: boolean;
  completedTasksCount: number;
  completedHabitsCount: number;
}

/**
 * Generates the full 35 or 42 grid slots for a given month
 */
export function generateMonthCalendar(
  year: number,
  monthIndex: number, // 0 = Jan, 11 = Dec
  completedDates: Set<string>,
  tasks: TaskItem[] = [],
  habitLogs: Record<string, Record<string, boolean>> = {},
  timeBlocks: TimeBlock[] = []
): CalendarDayInfo[] {
  const todayStr = getLocalDateStr();
  const todayDate = new Date();

  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  // Day of week for first day (0 = Sunday, 1 = Monday, ... 6 = Saturday)
  // Let's use Monday as first column (0 = Monday, ..., 6 = Sunday)
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

  const days: CalendarDayInfo[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dateObj = new Date(year, monthIndex - 1, d);
    const dateStr = getLocalDateStr(dateObj);
    const isFuture = dateObj > todayDate;
    const isStreakMaintained = completedDates.has(dateStr);

    days.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isFuture,
      isStreakMaintained,
      completedTasksCount: 0,
      completedHabitsCount: 0,
    });
  }

  // Current month days
  const totalDays = lastDayOfMonth.getDate();
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const dateStr = getLocalDateStr(dateObj);
    const isFuture = dateStr > todayStr;
    const isStreakMaintained = completedDates.has(dateStr);

    // Count tasks and time blocks completed on this date
    const tasksOnDate = tasks.filter((t) => {
      if (t.status !== 'completed') return false;
      if (t.completedAt && getLocalDateStr(new Date(t.completedAt)) === dateStr) return true;
      if (!t.completedAt && t.dueDate === dateStr) return true;
      return false;
    }).length;

    const blocksOnDate = timeBlocks.filter((b) => {
      if (!b.isCompleted) return false;
      if (b.completedAt && getLocalDateStr(new Date(b.completedAt)) === dateStr) return true;
      if (!b.completedAt && b.dateKey === dateStr) return true;
      return false;
    }).length;

    // Count habits completed on this date
    const habitsLog = habitLogs[dateStr] || {};
    const habitsOnDate = Object.values(habitsLog).filter(Boolean).length;

    days.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isFuture,
      isStreakMaintained,
      completedTasksCount: tasksOnDate + blocksOnDate,
      completedHabitsCount: habitsOnDate,
    });
  }

  // Next month padding to fill complete weeks (multiples of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const dateObj = new Date(year, monthIndex + 1, i);
    const dateStr = getLocalDateStr(dateObj);
    const isFuture = dateObj > todayDate;
    const isStreakMaintained = completedDates.has(dateStr);

    days.push({
      dayNumber: i,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isFuture,
      isStreakMaintained,
      completedTasksCount: 0,
      completedHabitsCount: 0,
    });
  }

  return days;
}
