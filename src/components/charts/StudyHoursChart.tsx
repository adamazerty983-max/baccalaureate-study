import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  Sparkles,
  Plus,
  Play,
  Flame,
} from 'lucide-react';
import { AppLanguage, TimeBlock, WeeklyReviewData } from '../../types';
import { getT } from '../../utils/i18n';
import {
  ZoomLevel,
  selectStudyHoursChartData,
  computeMonotoneCubicSplinePath,
  formatDurationLocalized,
  ChartDataPoint,
  Point2D,
} from '../../utils/studyHoursSelector';

export interface StudyHoursChartProps {
  timeBlocks: TimeBlock[];
  weeklyReviews?: Record<string, WeeklyReviewData>;
  academicYearStartDate?: string;
  baccalaureateDate?: string;
  language?: AppLanguage;
  onNavigateTab?: (tabId: string) => void;
  onOpenFocusMode?: () => void;
  className?: string;
}

const StudyHoursChartInner: React.FC<StudyHoursChartProps> = ({
  timeBlocks,
  weeklyReviews = {},
  academicYearStartDate,
  baccalaureateDate,
  language = 'fr',
  onNavigateTab,
  onOpenFocusMode,
  className = '',
}) => {
  const currentLang: AppLanguage = (language === 'ar' || language === 'en') ? language : 'fr';
  const t = getT(currentLang);
  const isAr = currentLang === 'ar';

  // Zoom control state: Days, Weeks, Months
  const [zoom, setZoom] = useState<ZoomLevel>('days');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Active hover/touch/keyboard point index
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Cross-fade opacity state (150ms max transition on zoom change)
  const [isFading, setIsFading] = useState<boolean>(false);

  // Responsive plot container dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(640);
  const chartHeight = 240;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setChartWidth(Math.floor(width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute chart data via memoized selector
  const chartData = useMemo(() => {
    return selectStudyHoursChartData(timeBlocks, zoom, {
      weekOffset,
      weeklyReviews,
      academicYearStartDate,
      baccalaureateDate,
      language: currentLang,
    });
  }, [timeBlocks, zoom, weekOffset, weeklyReviews, academicYearStartDate, baccalaureateDate, currentLang]);

  // Handle zoom change with short opacity cross-fade
  const handleZoomChange = useCallback((newZoom: ZoomLevel) => {
    if (newZoom === zoom) return;
    setIsFading(true);
    setActiveIndex(null);
    setTimeout(() => {
      setZoom(newZoom);
      if (newZoom !== 'days') {
        setWeekOffset(0);
      }
      setIsFading(false);
    }, 80);
  }, [zoom]);

  // SVG Geometry margins (Plot area stays strictly Left-To-Right)
  const margin = useMemo(() => {
    return {
      top: 20,
      right: 18,
      bottom: 36,
      left: 42,
    };
  }, []);

  const plotWidth = Math.max(100, chartWidth - margin.left - margin.right);
  const plotHeight = Math.max(80, chartHeight - margin.top - margin.bottom);
  const plotBottom = margin.top + plotHeight;
  const plotLeft = margin.left;
  const plotRight = margin.left + plotWidth;

  const pointsCount = chartData.points.length;

  // Compute 2D coordinates for each point along the X axis
  const pointCoordinates = useMemo(() => {
    if (pointsCount === 0) return [];
    const step = pointsCount > 1 ? plotWidth / (pointsCount - 1) : 0;

    return chartData.points.map((p, i) => {
      const x = plotLeft + i * step;
      let y = plotBottom;
      if (p.hours !== null) {
        const ratio = Math.min(1, Math.max(0, p.hours / chartData.maxY));
        y = plotBottom - ratio * plotHeight;
      }
      return {
        ...p,
        x,
        y,
        index: i,
      };
    });
  }, [chartData.points, chartData.maxY, pointsCount, plotWidth, plotHeight, plotBottom, plotLeft]);

  // Valid points for curve (only periods on or before today; never future)
  const validPlottedPoints: Point2D[] = useMemo(() => {
    return pointCoordinates
      .filter((p) => p.hours !== null)
      .map((p) => ({ x: p.x, y: p.y }));
  }, [pointCoordinates]);

  // Compute smooth curve paths via monotone cubic spline
  const { linePath, areaPath } = useMemo(() => {
    return computeMonotoneCubicSplinePath(validPlottedPoints, plotBottom);
  }, [validPlottedPoints, plotBottom]);

  // Y-axis ticks (e.g. 0, 2, 4, 6, 8, 10... up to maxY)
  const yTicks = useMemo(() => {
    const ticks: { value: number; y: number }[] = [];
    const step = chartData.maxY <= 14 ? 2 : 4;
    for (let v = 0; v <= chartData.maxY; v += step) {
      const ratio = v / chartData.maxY;
      const y = plotBottom - ratio * plotHeight;
      ticks.push({ value: v, y });
    }
    return ticks;
  }, [chartData.maxY, plotBottom, plotHeight]);

  // Target reference line Y coordinate
  const targetLineY = useMemo(() => {
    if (!chartData.referenceTargetHours || chartData.referenceTargetHours <= 0) return null;
    if (chartData.referenceTargetHours > chartData.maxY * 1.5) return null;
    const ratio = Math.min(1, chartData.referenceTargetHours / chartData.maxY);
    return plotBottom - ratio * plotHeight;
  }, [chartData.referenceTargetHours, chartData.maxY, plotBottom, plotHeight]);

  // Find nearest point from client X coordinate (Single pointer handler)
  const handlePointerInteraction = useCallback((clientX: number) => {
    if (!containerRef.current || pointCoordinates.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left;

    // Find nearest point by distance
    let nearestIdx = 0;
    let minDistance = Infinity;

    pointCoordinates.forEach((p, idx) => {
      const dist = Math.abs(p.x - rawX);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = idx;
      }
    });

    setActiveIndex(nearestIdx);
  }, [pointCoordinates]);

  // Active point details for highlight and tooltip
  const activePoint = useMemo(() => {
    if (activeIndex === null || activeIndex < 0 || activeIndex >= pointCoordinates.length) {
      return null;
    }
    return pointCoordinates[activeIndex];
  }, [activeIndex, pointCoordinates]);

  // Keyboard navigation on chart
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (pointCoordinates.length === 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex((prev) => (prev === null ? 0 : Math.min(pointCoordinates.length - 1, prev + 1)));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex((prev) => (prev === null ? 0 : Math.max(0, prev - 1)));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(pointCoordinates.length - 1);
    } else if (e.key === 'Escape') {
      setActiveIndex(null);
    }
  }, [pointCoordinates.length]);

  // Thin out horizontal tick labels on narrow widths so they never collide
  const shouldShowTickLabel = useCallback((index: number, total: number) => {
    if (total <= 7) {
      if (chartWidth < 340) return index % 2 === 0;
      return true;
    }
    if (chartWidth >= 560) return true;
    if (chartWidth >= 380) return index % 2 === 0;
    return index % 3 === 0;
  }, [chartWidth]);

  // Formatted summary strings
  const formattedTotalHours = formatDurationLocalized(chartData.totalStudyHours, currentLang);
  const formattedAvgHours = formatDurationLocalized(chartData.averageStudyHours, currentLang);
  const hourUnit = t('chart_unit_hours') || (isAr ? 'س' : 'h');

  return (
    <div
      className={`bento-card relative rounded-3xl bg-white/95 dark:bg-[#10192A]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs p-5 sm:p-6 transition-colors ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
      aria-label={t('chart_aria_summary').replace('{total}', formattedTotalHours)}
    >
      {/* Decorative Zellige Subtle Geometric Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 dark:bg-teal-500/[0.07] rounded-full blur-3xl pointer-events-none" />

      {/* HEADER: Title, Summary & Zoom Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('chart_study_hours_title')}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  {chartData.periodLabel}
                </span>
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('chart_study_hours_subtitle')}
          </p>
        </div>

        {/* Top-Right: Zoom Control (3-stop segmented control) & Week Nav */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Days week navigation (previous / next) */}
          {zoom === 'days' && (
            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-teal-600 transition-colors"
                aria-label={t('chart_prev_week')}
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="px-2 py-0.5 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {t('chart_current_week')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-teal-600 transition-colors"
                aria-label={t('chart_next_week')}
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          )}

          {/* 3-Stop Zoom Slider */}
          <div
            role="tablist"
            aria-label={t('chart_study_hours_title')}
            className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70"
          >
            {(['days', 'weeks', 'months'] as ZoomLevel[]).map((mode) => {
              const isSelected = zoom === mode;
              const labelKey = `chart_zoom_${mode}`;
              return (
                <button
                  key={mode}
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => handleZoomChange(mode)}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SUMMARY STATS BAR */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
          <span>{t('chart_total_period')}:</span>
          <strong className="text-slate-900 dark:text-white text-sm font-extrabold">
            {formattedTotalHours}
          </strong>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>{t('chart_avg_per_day')}:</span>
          <strong className="text-slate-900 dark:text-white text-sm font-extrabold">
            {formattedAvgHours}
          </strong>
        </div>

        {chartData.referenceTargetHours && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-0.5 border-t border-dashed border-teal-500 inline-block" />
            <span>{t('chart_target_reference')}:</span>
            <strong className="text-teal-600 dark:text-teal-400 font-bold">
              {chartData.referenceTargetHours}{hourUnit}
            </strong>
          </div>
        )}
      </div>

      {/* PLOT AREA CONTAINER (STRICTLY Left-to-Right in all languages) */}
      <div
        ref={containerRef}
        dir="ltr"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative w-full select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded-2xl"
        style={{ height: chartHeight }}
        aria-label={`${t('chart_study_hours_title')}. Utilisez les flèches du clavier pour naviguer.`}
      >
        {/* SVG Visualization (STRICTLY Left-to-Right in all languages) */}
        <svg
          width={chartWidth}
          height={chartHeight}
          className="w-full h-full overflow-visible"
          dir="ltr"
          onPointerMove={(e) => handlePointerInteraction(e.clientX)}
          onPointerDown={(e) => handlePointerInteraction(e.clientX)}
          onPointerLeave={() => setActiveIndex(null)}
          style={{
            opacity: isFading ? 0.35 : 1,
            transition: 'opacity 150ms ease-out',
          }}
        >
          <defs>
            {/* Subtle Zellige static gradient under the curve */}
            <linearGradient id="studyHoursAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 1. Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick) => (
            <g key={`ytick-${tick.value}`}>
              <line
                x1={plotLeft}
                y1={tick.y}
                x2={plotRight}
                y2={tick.y}
                className="stroke-slate-200/70 dark:stroke-slate-800/70"
                strokeDasharray={tick.value === 0 ? undefined : '3 3'}
                strokeWidth={1}
              />
              <text
                x={plotLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500 font-mono"
              >
                {tick.value}{hourUnit}
              </text>
            </g>
          ))}

          {/* 2. Optional Target Reference Line */}
          {targetLineY !== null && (
            <g>
              <line
                x1={plotLeft}
                y1={targetLineY}
                x2={plotRight}
                y2={targetLineY}
                stroke="#0d9488"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.65}
              />
              <text
                x={plotRight - 4}
                y={targetLineY - 5}
                textAnchor="end"
                className="text-[9px] font-bold fill-teal-600 dark:fill-teal-400"
              >
                {t('chart_target_reference')} ({chartData.referenceTargetHours}{hourUnit})
              </text>
            </g>
          )}

          {/* 3. Smooth Area & Curve Line (Past & Today only; Never Future) */}
          {validPlottedPoints.length > 0 && (
            <>
              {/* Filled Area with subtle gradient */}
              <path
                d={areaPath}
                fill="url(#studyHoursAreaGradient)"
                className="pointer-events-none"
              />

              {/* Monotone Cubic Curve Line */}
              <path
                d={linePath}
                fill="none"
                stroke="#0d9488"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dark:stroke-teal-400 pointer-events-none"
              />
            </>
          )}

          {/* 4. X-Axis Ticks & Labels */}
          {pointCoordinates.map((p, i) => {
            const showLabel = shouldShowTickLabel(i, pointsCount);

            return (
              <g key={p.id}>
                {/* Vertical tick indicator */}
                {p.isFuture ? (
                  /* Faint dotted tick mark for future period (NO data) */
                  <line
                    x1={p.x}
                    y1={plotBottom - 4}
                    x2={p.x}
                    y2={plotBottom + 4}
                    className="stroke-slate-300 dark:stroke-slate-700"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                ) : (
                  /* Solid subtle tick for past / today */
                  <line
                    x1={p.x}
                    y1={plotBottom}
                    x2={p.x}
                    y2={plotBottom + 5}
                    className="stroke-slate-300 dark:stroke-slate-700"
                    strokeWidth={1}
                  />
                )}

                {/* X-axis tick label */}
                {showLabel && (
                  <text
                    x={p.x}
                    y={plotBottom + 18}
                    textAnchor="middle"
                    className={`text-[10px] font-medium ${
                      p.isToday
                        ? 'fill-teal-600 dark:fill-teal-400 font-extrabold'
                        : p.isFuture
                        ? 'fill-slate-400/60 dark:fill-slate-600'
                        : 'fill-slate-500 dark:fill-slate-400'
                    }`}
                  >
                    {p.label}
                  </text>
                )}

                {/* Data point dot on curve (only if not future) */}
                {!p.isFuture && p.hours !== null && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.isToday ? 3.5 : 2.5}
                    className={
                      p.isToday
                        ? 'fill-teal-600 stroke-white dark:stroke-[#10192A] stroke-2'
                        : 'fill-white dark:fill-[#10192A] stroke-teal-600 dark:stroke-teal-400 stroke-2'
                    }
                  />
                )}
              </g>
            );
          })}

          {/* 5. Active Hover / Touch Guide Lines (Tracked INSTANTLY with NO CSS transition) */}
          {activePoint && !activePoint.isFuture && activePoint.hours !== null && (
            <g className="pointer-events-none">
              {/* Horizontal dashed guide line to Y-axis */}
              <line
                x1={plotLeft}
                y1={activePoint.y}
                x2={activePoint.x}
                y2={activePoint.y}
                stroke="#0d9488"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                opacity={0.8}
              />

              {/* Vertical dashed guide line to X-axis */}
              <line
                x1={activePoint.x}
                y1={activePoint.y}
                x2={activePoint.x}
                y2={plotBottom}
                stroke="#0d9488"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                opacity={0.8}
              />

              {/* Highlight point outer glow ring */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={7}
                className="fill-teal-500/20 stroke-teal-500 stroke-2"
              />

              {/* Highlight point inner dot */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={3.5}
                className="fill-white dark:fill-slate-900 stroke-teal-600 dark:stroke-teal-400 stroke-2"
              />
            </g>
          )}

          {/* 6. Transparent Pointer Capture Area */}
          <rect
            x={plotLeft}
            y={margin.top}
            width={plotWidth}
            height={plotHeight + margin.bottom}
            fill="transparent"
            className="cursor-crosshair"
          />
        </svg>

        {/* 7. Compact Floating Tooltip (Moved via transform with NO transition for instant tracking) */}
        {activePoint && (
          <div
            className="absolute pointer-events-none z-30 px-3 py-2 rounded-xl bg-slate-900/95 text-white dark:bg-slate-800/95 dark:text-slate-100 shadow-xl border border-slate-700/60 text-xs"
            style={{
              // Position tooltip near active point with safety clamping inside container
              left: `${Math.min(chartWidth - 140, Math.max(8, activePoint.x - 70))}px`,
              top: `${Math.max(10, activePoint.y - 68)}px`,
              transform: 'translate3d(0, 0, 0)', // Hardware accelerated without transition lag
            }}
          >
            <div className="font-bold text-[11px] text-slate-300 border-b border-slate-700/60 pb-1 mb-1">
              {activePoint.fullLabel}
            </div>

            {activePoint.isFuture ? (
              <div className="text-[11px] text-slate-400 italic">
                {t('chart_future_period')}
              </div>
            ) : zoom === 'days' ? (
              <div className="flex items-center gap-1.5 font-extrabold text-teal-400 text-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDurationLocalized(activePoint.hours || 0, currentLang)}</span>
              </div>
            ) : (
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between gap-3 text-teal-400 font-bold">
                  <span>{t('chart_avg_per_day')}:</span>
                  <span>{formatDurationLocalized(activePoint.hours || 0, currentLang)}</span>
                </div>
                {activePoint.totalHoursInBucket !== undefined && (
                  <div className="flex justify-between gap-3 text-slate-300">
                    <span>{t('chart_total_period')}:</span>
                    <span>{formatDurationLocalized(activePoint.totalHoursInBucket, currentLang)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 8. Empty State Overlay (Friendly message + actions) */}
        {!chartData.hasAnyData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white/75 dark:bg-[#10192A]/75 rounded-2xl pointer-events-auto text-center">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
              {t('chart_empty_title')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-0.5 mb-3 leading-relaxed">
              {t('chart_empty_desc')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('timeblocking')}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('chart_add_block_btn')}</span>
                </button>
              )}
              {onOpenFocusMode && (
                <button
                  type="button"
                  onClick={onOpenFocusMode}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t('chart_start_focus_btn')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 9. Visually Hidden Accessible Data Table for Screen Readers */}
      <table className="sr-only">
        <caption>{t('chart_study_hours_title')} - {chartData.periodLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Période / Date</th>
            <th scope="col">Statut</th>
            <th scope="col">Heures d'étude</th>
          </tr>
        </thead>
        <tbody>
          {chartData.points.map((p) => (
            <tr key={`sr-${p.id}`}>
              <td>{p.fullLabel}</td>
              <td>{p.isFuture ? 'Futur' : 'Passé'}</td>
              <td>
                {p.isFuture
                  ? 'Non commencé'
                  : formatDurationLocalized(p.hours || 0, currentLang)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const StudyHoursChart = React.memo(StudyHoursChartInner);
StudyHoursChart.displayName = 'StudyHoursChart';
