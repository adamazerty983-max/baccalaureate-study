import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { AppLanguage, TimeBlock } from '../../types';
import { BAC_SUBJECTS } from '../../utils/constants';
import { getTimeBlockCompletionOccurrences } from '../../utils/streak';

interface PlannerHistoryCalendarProps {
  timeBlocks: TimeBlock[];
  language: AppLanguage;
}

const pad2 = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

function durationHours(block: TimeBlock): number {
  const [sh, sm] = block.startTime.split(':').map(Number);
  const [eh, em] = block.endTime.split(':').map(Number);
  const start = (sh || 0) * 60 + (sm || 0);
  const end = (eh || 0) * 60 + (em || 0);
  return Math.max(1, end > start ? end - start : end + 1440 - start) / 60;
}

export const PlannerHistoryCalendar: React.FC<PlannerHistoryCalendarProps> = ({ timeBlocks, language }) => {
  const isAr = language === 'ar';
  const locale = isAr ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR';
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today));
  const completedStudyBlocks = useMemo(() => timeBlocks
    .filter((block) => block.type === 'study')
    .flatMap((block) => getTimeBlockCompletionOccurrences(block).map((occurrence) => ({ block, date: occurrence.dateKey }))), [timeBlocks]);

  const byDate = useMemo(() => {
    const map: Record<string, { blocks: TimeBlock[]; hours: number }> = {};
    completedStudyBlocks.forEach(({ block, date }) => {
      const entry = map[date] || (map[date] = { blocks: [], hours: 0 });
      entry.blocks.push(block);
      entry.hours += durationHours(block);
    });
    return map;
  }, [completedStudyBlocks]);

  const monthDays = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const count = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: mondayOffset }, () => null as null | string),
      ...Array.from({ length: count }, (_, index) => dateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1))),
    ];
  }, [visibleMonth]);

  const currentMonthKey = monthKey(today);
  const displayedMonthKey = monthKey(visibleMonth);
  const monthSummary = useMemo(() => completedStudyBlocks
    .filter(({ date }) => date.startsWith(displayedMonthKey))
    .reduce((summary, { block }) => ({
      hours: summary.hours + durationHours(block),
      sessions: summary.sessions + 1,
    }), { hours: 0, sessions: 0 }), [completedStudyBlocks, displayedMonthKey]);
  const selectedEntry = byDate[selectedDate];
  const earliestMonthKey = Object.keys(byDate).sort()[0]?.slice(0, 7) || currentMonthKey;
  const weekLabels = isAr ? ['إث', 'ث', 'أر', 'خ', 'ج', 'س', 'أح'] : language === 'en'
    ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    : ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
  const moveMonth = (offset: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(dateKey(next));
  };

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111827]/95 sm:p-5" aria-label={isAr ? 'تقويم سجل الدراسة' : language === 'en' ? 'Study history calendar' : 'Calendrier de l’historique d’étude'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-teal-500" />
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{isAr ? 'سجل الدراسة' : language === 'en' ? 'Study history' : 'Historique des révisions'}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveMonth(-1)} disabled={displayedMonthKey <= earliestMonthKey} aria-label={isAr ? 'الشهر السابق' : language === 'en' ? 'Previous month' : 'Mois précédent'} className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <strong className="min-w-32 text-center text-sm capitalize text-slate-800 dark:text-slate-100">{visibleMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</strong>
          <button type="button" onClick={() => moveMonth(1)} disabled={displayedMonthKey >= currentMonthKey} aria-label={isAr ? 'الشهر التالي' : language === 'en' ? 'Next month' : 'Mois suivant'} className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-lg bg-teal-500/10 px-2.5 py-1.5 text-teal-700 dark:text-teal-300">{monthSummary.hours.toFixed(1)}h {isAr ? 'دراسة' : language === 'en' ? 'studied' : 'étudiées'}</span>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600 dark:bg-white/5 dark:text-slate-300">{monthSummary.sessions} {isAr ? 'حصة مكتملة' : language === 'en' ? 'completed sessions' : 'séances terminées'}</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekLabels.map((day) => <div key={day} className="pb-1 text-center text-[10px] font-bold text-slate-400">{day}</div>)}
        {monthDays.map((day, index) => {
          const entry = day ? byDate[day] : undefined;
          const isSelected = day === selectedDate;
          return day ? <button key={day} type="button" onClick={() => setSelectedDate(day)} aria-pressed={isSelected} aria-label={`${new Date(`${day}T12:00:00`).toLocaleDateString(locale)}${entry ? `, ${entry.hours.toFixed(1)}h` : ''}`} className={`relative flex min-h-12 flex-col items-center justify-center rounded-xl border text-xs transition-colors sm:min-h-14 ${isSelected ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300' : 'border-slate-100 bg-slate-50/80 text-slate-700 hover:border-teal-300 dark:border-white/[0.04] dark:bg-white/[0.025] dark:text-slate-300'} ${entry ? 'font-extrabold' : ''}`}>
            <span>{Number(day.slice(-2))}</span>
            {entry && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-teal-500" />}
          </button> : <div key={`empty-${index}`} />;
        })}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/[0.08]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h4>
          <span className="inline-flex items-center gap-1 rounded-lg bg-teal-500/10 px-2 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300"><Clock className="h-3 w-3" />{(selectedEntry?.hours || 0).toFixed(1)}h</span>
        </div>
        {selectedEntry?.blocks.length ? <ul className="space-y-2">
          {selectedEntry.blocks.map((block) => {
            const subjectColor = BAC_SUBJECTS.find((subject) => subject.name === block.subject)?.hexColor || '#14b8a6';
            return <li key={block.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.035]">
              <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: subjectColor }} /><span className="truncate">{block.subject} · {block.title}</span></span>
              <span className="shrink-0 font-mono text-[10px] text-slate-500">{block.startTime}–{block.endTime}</span>
            </li>;
          })}
        </ul> : <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:bg-white/[0.035] dark:text-slate-400">{isAr ? 'لا توجد حصص مكتملة في هذا اليوم.' : language === 'en' ? 'No completed study sessions on this day.' : 'Aucune séance terminée ce jour.'}</p>}
      </div>
    </section>
  );
};
