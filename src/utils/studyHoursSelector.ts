import { AppLanguage, TimeBlock, WeeklyReviewData } from '../types';

export type ZoomLevel = 'days' | 'weeks' | 'months';

export interface ChartDataPoint {
  id: string;
  dateKey: string; // YYYY-MM-DD (or start date of bucket)
  label: string; // e.g. "Lun", "20/10", "Sep"
  fullLabel: string; // e.g. "Lundi 27 Octobre 2026"
  hours: number | null; // null for future periods!
  totalHoursInBucket?: number; // Total hours in this bucket (for weeks and months)
  elapsedDaysInBucket?: number; // Days elapsed so far in this bucket
  isFuture: boolean;
  isToday?: boolean;
}

export interface StudyHoursChartData {
  zoom: ZoomLevel;
  points: ChartDataPoint[];
  maxY: number;
  totalStudyHours: number;
  averageStudyHours: number;
  referenceTargetHours?: number;
  hasAnyData: boolean;
  periodLabel: string;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Parses "HH:mm" into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calculates duration in minutes between startTime and endTime.
 * Robustly handles blocks crossing midnight (e.g. 23:00 to 01:00 -> 120 min).
 */
export function calculateTimeBlockDurationMinutes(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  const startM = parseTimeToMinutes(startTime);
  const endM = parseTimeToMinutes(endTime);
  if (startM === endM) return 0;
  const rawDiff = endM - startM;
  return rawDiff < 0 ? rawDiff + 1440 : rawDiff;
}

/**
 * Formats a Date object as local YYYY-MM-DD avoiding UTC off-by-one errors.
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD into a local Date object set to noon (12:00) to avoid DST boundary jumps.
 */
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

/**
 * Formats duration in hours into localized string, e.g. "2 h 30 min" or "2 س 30 د".
 */
export function formatDurationLocalized(hours: number, language: AppLanguage): string {
  const totalMins = Math.round(hours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;

  if (language === 'ar') {
    if (h === 0) return `${m} د`;
    if (m === 0) return `${h} س`;
    return `${h} س ${m} د`;
  }
  if (language === 'en') {
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  // Default French
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/**
 * Aggregates all completed study time blocks into a map of dateKey -> total study hours.
 * - EXCLUDES 'sticker_activity' blocks.
 * - Reads `completedOccurrences` when present (handling recurring blocks without double-counting).
 * - Fallbacks to `dateKey` or `completedAt` or `createdAt` for single completed blocks.
 * - FocusModeModal sessions logged through `onLogCustomSession` are standard TimeBlocks with `dateKey: today`
 *   and `type: 'study'`, so they are included naturally with NO double counting.
 */
export function buildDailyStudyHoursMap(timeBlocks: TimeBlock[] = []): Record<string, number> {
  const map: Record<string, number> = {};

  timeBlocks.forEach((block) => {
    // Exclude non-study items
    if (block.type === 'sticker_activity') return;
    if (block.type && block.type !== 'study') return;

    const durationMins = calculateTimeBlockDurationMinutes(block.startTime, block.endTime);
    if (durationMins <= 0) return;
    const durationHours = durationMins / 60;

    // 1. Recurring block with explicit occurrences
    if (block.completedOccurrences && block.completedOccurrences.length > 0) {
      block.completedOccurrences.forEach((occurrence) => {
        if (occurrence.dateKey) {
          map[occurrence.dateKey] = (map[occurrence.dateKey] || 0) + durationHours;
        }
      });
      return;
    }

    // 2. Non-recurring or legacy single block
    if (block.isCompleted) {
      let targetDateKey = block.dateKey;
      if (!targetDateKey && block.completedAt) {
        const completedDate = new Date(block.completedAt);
        if (!Number.isNaN(completedDate.getTime())) {
          targetDateKey = formatDateKey(completedDate);
        }
      }
      if (!targetDateKey && block.createdAt) {
        const createdDate = new Date(block.createdAt);
        if (!Number.isNaN(createdDate.getTime())) {
          targetDateKey = formatDateKey(createdDate);
        }
      }

      if (targetDateKey) {
        map[targetDateKey] = (map[targetDateKey] || 0) + durationHours;
      }
    }
  });

  return map;
}

/**
 * Returns Monday (12:00) of the calendar week containing referenceDate.
 * Week starts on Monday (index 1).
 */
export function getMondayOfWeek(referenceDate: Date): Date {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 is Sun, 1 is Mon...
  const offsetFromMonday = (day + 6) % 7;
  d.setDate(d.getDate() - offsetFromMonday);
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * Calculates a "nice" maximum Y value (default 10) so the graph has clean 2h/4h steps.
 */
export function computeNiceMaxY(maxDataValue: number): number {
  if (maxDataValue <= 10) return 10;
  if (maxDataValue <= 12) return 12;
  if (maxDataValue <= 14) return 14;
  if (maxDataValue <= 16) return 16;
  if (maxDataValue <= 20) return 20;
  return Math.ceil(maxDataValue / 4) * 4;
}

const AR_WEEKDAYS_SHORT = ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'];

/**
 * Generates DAYS data: One calendar week (Monday to Sunday).
 */
export function getDaysZoomData(
  dailyHoursMap: Record<string, number>,
  weekOffset = 0,
  now = new Date(),
  language: AppLanguage = 'fr'
): { points: ChartDataPoint[]; periodLabel: string } {
  const todayKey = formatDateKey(now);
  const baseMonday = getMondayOfWeek(now);
  const targetMonday = new Date(baseMonday);
  targetMonday.setDate(targetMonday.getDate() + weekOffset * 7);

  const points: ChartDataPoint[] = [];
  const weekdayFormatter = new Intl.DateTimeFormat(
    language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR',
    { weekday: 'short' }
  );
  const fullDateFormatter = new Intl.DateTimeFormat(
    language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(targetMonday);
    currentDay.setDate(targetMonday.getDate() + i);
    const dateKey = formatDateKey(currentDay);
    const isFuture = dateKey > todayKey;
    const isToday = dateKey === todayKey;

    let rawLabel = language === 'ar' ? AR_WEEKDAYS_SHORT[i] : weekdayFormatter.format(currentDay);
    // Capitalize first letter
    rawLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1).replace('.', '');

    points.push({
      id: `day-${dateKey}`,
      dateKey,
      label: rawLabel,
      fullLabel: fullDateFormatter.format(currentDay),
      hours: isFuture ? null : (dailyHoursMap[dateKey] || 0),
      isFuture,
      isToday,
    });
  }

  // Week period label
  const sunday = new Date(targetMonday);
  sunday.setDate(targetMonday.getDate() + 6);
  const shortRangeFormatter = new Intl.DateTimeFormat(
    language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR',
    { day: 'numeric', month: 'short' }
  );
  const periodLabel = `${shortRangeFormatter.format(targetMonday)} – ${shortRangeFormatter.format(sunday)}`;

  return { points, periodLabel };
}

/**
 * Generates WEEKS data: The recent ~10 weeks ending with current week.
 * Plots the AVERAGE study hours per day in that bucket, with bucket TOTAL in tooltip.
 */
export function getWeeksZoomData(
  dailyHoursMap: Record<string, number>,
  numWeeks = 10,
  now = new Date(),
  language: AppLanguage = 'fr'
): { points: ChartDataPoint[]; periodLabel: string } {
  const todayKey = formatDateKey(now);
  const currentWeekMonday = getMondayOfWeek(now);
  const points: ChartDataPoint[] = [];

  const shortDateFormatter = new Intl.DateTimeFormat(
    language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR',
    { day: 'numeric', month: 'numeric' }
  );
  const fullRangeFormatter = new Intl.DateTimeFormat(
    language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR',
    { day: 'numeric', month: 'short' }
  );

  // We generate numWeeks ending with the current week (offset -(numWeeks - 1) to 0)
  for (let i = numWeeks - 1; i >= 0; i--) {
    const monday = new Date(currentWeekMonday);
    monday.setDate(currentWeekMonday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayKey = formatDateKey(monday);
    const sundayKey = formatDateKey(sunday);
    const isCompletelyFuture = mondayKey > todayKey;

    let totalHoursInWeek = 0;
    let elapsedDaysInWeek = 0;

    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + d);
      const dayKey = formatDateKey(day);
      if (dayKey <= todayKey) {
        elapsedDaysInWeek++;
        totalHoursInWeek += dailyHoursMap[dayKey] || 0;
      }
    }

    const avgHoursPerDay = elapsedDaysInWeek > 0 ? totalHoursInWeek / elapsedDaysInWeek : 0;
    const isCurrentWeek = i === 0;

    points.push({
      id: `week-${mondayKey}`,
      dateKey: mondayKey,
      label: shortDateFormatter.format(monday),
      fullLabel: `${fullRangeFormatter.format(monday)} – ${fullRangeFormatter.format(sunday)}`,
      hours: isCompletelyFuture ? null : avgHoursPerDay,
      totalHoursInBucket: totalHoursInWeek,
      elapsedDaysInBucket: elapsedDaysInWeek,
      isFuture: isCompletelyFuture,
      isToday: isCurrentWeek,
    });
  }

  const oldestMonday = new Date(currentWeekMonday);
  oldestMonday.setDate(currentWeekMonday.getDate() - (numWeeks - 1) * 7);
  const periodLabel = `${fullRangeFormatter.format(oldestMonday)} – ${fullRangeFormatter.format(new Date())}`;

  return { points, periodLabel };
}

/**
 * Generates MONTHS data: The academic year from academicYearStartDate to baccalaureateDate.
 * Plots the AVERAGE study hours per day in that bucket, with bucket TOTAL in tooltip.
 */
export function getMonthsZoomData(
  dailyHoursMap: Record<string, number>,
  academicYearStartDate?: string,
  baccalaureateDate?: string,
  now = new Date(),
  language: AppLanguage = 'fr'
): { points: ChartDataPoint[]; periodLabel: string } {
  const todayKey = formatDateKey(now);

  // Parse start date: default to September 1 of current academic cycle
  let startYear = now.getFullYear();
  let startMonth = 8; // September (0-indexed)
  if (academicYearStartDate) {
    const d = new Date(academicYearStartDate);
    if (!Number.isNaN(d.getTime())) {
      startYear = d.getFullYear();
      startMonth = d.getMonth();
    }
  } else if (now.getMonth() < 8) {
    // If before September, academic year started previous calendar year
    startYear -= 1;
  }

  // Parse Bac date: default to June of the following year
  let endYear = startYear + 1;
  let endMonth = 5; // June (0-indexed)
  if (baccalaureateDate) {
    const d = new Date(baccalaureateDate);
    if (!Number.isNaN(d.getTime())) {
      endYear = d.getFullYear();
      endMonth = d.getMonth();
    }
  }

  // Guard against invalid ranges
  if (endYear < startYear || (endYear === startYear && endMonth < startMonth)) {
    endYear = startYear + 1;
    endMonth = 5;
  }

  const points: ChartDataPoint[] = [];
  const monthFormatter = new Intl.DateTimeFormat(
    language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR',
    { month: 'short' }
  );
  const fullMonthFormatter = new Intl.DateTimeFormat(
    language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR',
    { month: 'long', year: 'numeric' }
  );

  let curY = startYear;
  let curM = startMonth;

  while (curY < endYear || (curY === endYear && curM <= endMonth)) {
    const firstDay = new Date(curY, curM, 1, 12, 0, 0);
    const lastDay = new Date(curY, curM + 1, 0, 12, 0, 0);
    const firstDayKey = formatDateKey(firstDay);
    const isFutureMonth = firstDayKey > todayKey;

    const daysInMonth = lastDay.getDate();
    let totalHoursInMonth = 0;
    let elapsedDaysInMonth = 0;

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(curY, curM, dayNum, 12, 0, 0);
      const dKey = formatDateKey(d);
      if (dKey <= todayKey) {
        elapsedDaysInMonth++;
        totalHoursInMonth += dailyHoursMap[dKey] || 0;
      }
    }

    const avgHoursPerDay = elapsedDaysInMonth > 0 ? totalHoursInMonth / elapsedDaysInMonth : 0;
    const isCurrentMonth = curY === now.getFullYear() && curM === now.getMonth();

    let rawLabel = monthFormatter.format(firstDay);
    rawLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1).replace('.', '');

    points.push({
      id: `month-${curY}-${String(curM + 1).padStart(2, '0')}`,
      dateKey: firstDayKey,
      label: rawLabel,
      fullLabel: fullMonthFormatter.format(firstDay),
      hours: isFutureMonth ? null : avgHoursPerDay,
      totalHoursInBucket: totalHoursInMonth,
      elapsedDaysInBucket: elapsedDaysInMonth,
      isFuture: isFutureMonth,
      isToday: isCurrentMonth,
    });

    curM++;
    if (curM > 11) {
      curM = 0;
      curY++;
    }
  }

  const periodLabel = `${startYear} – ${endYear}`;
  return { points, periodLabel };
}

/**
 * Monotone Cubic Spline (Fritsch-Carlson algorithm).
 * Produces smooth SVG cubic Bézier curves through points without any overshoot below 0 or above data.
 */
export function computeMonotoneCubicSplinePath(
  points: Point2D[],
  bottomY: number
): { linePath: string; areaPath: string } {
  const n = points.length;
  if (n === 0) return { linePath: '', areaPath: '' };

  if (n === 1) {
    const p = points[0];
    const linePath = `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} L ${(p.x + 0.1).toFixed(2)} ${p.y.toFixed(2)}`;
    const areaPath = `M ${p.x.toFixed(2)} ${bottomY.toFixed(2)} L ${p.x.toFixed(2)} ${p.y.toFixed(2)} L ${(p.x + 0.1).toFixed(2)} ${p.y.toFixed(2)} L ${(p.x + 0.1).toFixed(2)} ${bottomY.toFixed(2)} Z`;
    return { linePath, areaPath };
  }

  if (n === 2) {
    const p0 = points[0];
    const p1 = points[1];
    const linePath = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
    const areaPath = `${linePath} L ${p1.x.toFixed(2)} ${bottomY.toFixed(2)} L ${p0.x.toFixed(2)} ${bottomY.toFixed(2)} Z`;
    return { linePath, areaPath };
  }

  // 1. Calculate secant slopes
  const dx: number[] = [];
  const slopes: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const deltaX = points[i + 1].x - points[i].x;
    const deltaY = points[i + 1].y - points[i].y;
    dx.push(deltaX);
    slopes.push(deltaX === 0 ? 0 : deltaY / deltaX);
  }

  // 2. Initialize tangents
  const m: number[] = new Array(n).fill(0);
  m[0] = slopes[0];
  m[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  // 3. Fritsch-Carlson monotonicity condition
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / slopes[i];
      const beta = m[i + 1] / slopes[i];
      if (alpha < 0) m[i] = 0;
      if (beta < 0) m[i + 1] = 0;
      const mag = alpha * alpha + beta * beta;
      if (mag > 9) {
        const tau = 3 / Math.sqrt(mag);
        m[i] = tau * alpha * slopes[i];
        m[i + 1] = tau * beta * slopes[i];
      }
    }
  }

  // 4. Construct SVG Cubic Bézier commands
  let linePath = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    const cp1x = points[i].x + h;
    const cp1y = points[i].y + m[i] * h;
    const cp2x = points[i + 1].x - h;
    const cp2y = points[i + 1].y - m[i + 1] * h;
    const endX = points[i + 1].x;
    const endY = points[i + 1].y;

    linePath += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${endX.toFixed(2)} ${endY.toFixed(2)}`;
  }

  const lastP = points[n - 1];
  const firstP = points[0];
  const areaPath = `${linePath} L ${lastP.x.toFixed(2)} ${bottomY.toFixed(2)} L ${firstP.x.toFixed(2)} ${bottomY.toFixed(2)} Z`;

  return { linePath, areaPath };
}

/**
 * Top-level selector to compute chart data for the requested zoom level.
 */
export function selectStudyHoursChartData(
  timeBlocks: TimeBlock[] = [],
  zoom: ZoomLevel = 'days',
  options: {
    weekOffset?: number;
    weeklyReviews?: Record<string, WeeklyReviewData>;
    academicYearStartDate?: string;
    baccalaureateDate?: string;
    now?: Date;
    language?: AppLanguage;
  } = {}
): StudyHoursChartData {
  const {
    weekOffset = 0,
    weeklyReviews = {},
    academicYearStartDate,
    baccalaureateDate,
    now = new Date(),
    language = 'fr',
  } = options;

  const dailyMap = buildDailyStudyHoursMap(timeBlocks);

  let points: ChartDataPoint[] = [];
  let periodLabel = '';

  if (zoom === 'days') {
    const res = getDaysZoomData(dailyMap, weekOffset, now, language);
    points = res.points;
    periodLabel = res.periodLabel;
  } else if (zoom === 'weeks') {
    const res = getWeeksZoomData(dailyMap, 10, now, language);
    points = res.points;
    periodLabel = res.periodLabel;
  } else {
    const res = getMonthsZoomData(dailyMap, academicYearStartDate, baccalaureateDate, now, language);
    points = res.points;
    periodLabel = res.periodLabel;
  }

  // Calculate stats
  const validPoints = points.filter((p) => p.hours !== null);
  const maxHours = Math.max(0, ...validPoints.map((p) => p.hours || 0));
  const maxY = computeNiceMaxY(maxHours);

  const totalStudyHours = points.reduce((acc, p) => {
    if (zoom === 'days') return acc + (p.hours || 0);
    return acc + (p.totalHoursInBucket || 0);
  }, 0);

  const elapsedDaysTotal = points.reduce((acc, p) => {
    if (zoom === 'days') return acc + (p.isFuture ? 0 : 1);
    return acc + (p.elapsedDaysInBucket || 0);
  }, 0);

  const averageStudyHours = elapsedDaysTotal > 0 ? totalStudyHours / elapsedDaysTotal : 0;
  const hasAnyData = totalStudyHours > 0;

  // Optional weekly target reference line from weeklyReviews
  const currentMondayKey = formatDateKey(getMondayOfWeek(now));
  const activeWeeklyReview = weeklyReviews[currentMondayKey];
  const referenceTargetHours = activeWeeklyReview?.targetHours;

  return {
    zoom,
    points,
    maxY,
    totalStudyHours: Math.round(totalStudyHours * 100) / 100,
    averageStudyHours: Math.round(averageStudyHours * 100) / 100,
    referenceTargetHours,
    hasAnyData,
    periodLabel,
  };
}
