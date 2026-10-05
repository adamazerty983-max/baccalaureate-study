import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, Pencil, Plus } from 'lucide-react';
import { AppLanguage, TimeBlock } from '../../types';
import { BAC_SUBJECTS } from '../../utils/constants';
import { getTimeBlockCompletionOccurrences, isTimeBlockOccurrenceCompleted } from '../../utils/streak';

interface PlannerHistoryCalendarProps {
  timeBlocks: TimeBlock[];
  language: AppLanguage;
  onAddBlock: (dateKey: string) => void;
  onEditBlock: (block: TimeBlock) => void;
  onToggleComplete: (blockId: string, dateKey: string, isCompleted: boolean, useSelectedDate?: boolean) => void;
}

const pad2 = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
const displayTime = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return `${pad2((hours || 0) % 24)}:${pad2(minutes || 0)}`;
};
function durationHours(block: TimeBlock): number {
  const [sh, sm] = block.startTime.split(':').map(Number);
  const [eh, em] = block.endTime.split(':').map(Number);
  const start = (sh || 0) * 60 + (sm || 0);
  let end = (eh || 0) * 60 + (em || 0);
  if (end < start) end += 24 * 60;
  return Math.max(0, end - start) / 60;
}

export const PlannerHistoryCalendar: React.FC<PlannerHistoryCalendarProps> = ({
  timeBlocks,
  language,
  onAddBlock,
  onEditBlock,
  onToggleComplete,
}) => {
  const isAr = language === 'ar';
  const locale = isAr ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR';
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today));

  const activityByDate = useMemo(() => {
    const map: Record<string, { block: TimeBlock; completed: boolean }[]> = {};
    const append = (date: string, block: TimeBlock, completed: boolean) => {
      const items = map[date] || (map[date] = []);
      if (!items.some((item) => item.block.id === block.id)) items.push({ block, completed });
      else if (completed) {
        const existing = items.find((item) => item.block.id === block.id);
        if (existing) existing.completed = true;
      }
    };

    timeBlocks.filter((block) => block.type === 'study').forEach((block) => {
      if (block.dateKey) append(block.dateKey, block, isTimeBlockOccurrenceCompleted(block, block.dateKey));
      getTimeBlockCompletionOccurrences(block).forEach(({ dateKey: completedDate }) => append(completedDate, block, true));
    });
    Object.values(map).forEach((items) => items.sort((a, b) => a.block.startTime.localeCompare(b.block.startTime)));
    return map;
  }, [timeBlocks]);

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
  const monthSummary = useMemo(() => (Object.entries(activityByDate) as [string, { block: TimeBlock; completed: boolean }[]][])
    .filter(([date]) => date.startsWith(displayedMonthKey))
    .reduce((summary, [, items]) => {
      items.forEach(({ block, completed }) => {
        if (completed) {
          summary.hours += durationHours(block);
          summary.sessions += 1;
        }
      });
      return summary;
    }, { hours: 0, sessions: 0 }), [activityByDate, displayedMonthKey]);
  const selectedItems = activityByDate[selectedDate] || [];
  const canMarkSelectedDayComplete = selectedDate <= dateKey(today);
  const selectedCompletedHours = selectedItems.reduce((sum, item) => sum + (item.completed ? durationHours(item.block) : 0), 0);
  const activityMonths = Object.keys(activityByDate).sort();
  const earliestMonthKey = activityMonths[0]?.slice(0, 7) || currentMonthKey;
  const weekLabels = isAr ? ['إث', 'ث', 'أر', 'خ', 'ج', 'س', 'أح'] : language === 'en'
    ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    : ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
  const moveMonth = (offset: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(dateKey(next));
  };

  const labels = {
    history: isAr ? 'سجل الدراسة' : language === 'en' ? 'Study history' : 'Historique des révisions',
    previous: isAr ? 'الشهر السابق' : language === 'en' ? 'Previous month' : 'Mois précédent',
    next: isAr ? 'الشهر التالي' : language === 'en' ? 'Next month' : 'Mois suivant',
    studied: isAr ? 'دراسة' : language === 'en' ? 'studied' : 'étudiées',
    completedSessions: isAr ? 'حصة مكتملة' : language === 'en' ? 'completed sessions' : 'séances terminées',
    add: isAr ? 'إضافة مهمة لهذا اليوم' : language === 'en' ? 'Add task for this day' : 'Ajouter une tâche pour ce jour',
    edit: isAr ? 'تعديل المهمة' : language === 'en' ? 'Edit task' : 'Modifier la tâche',
    markDone: isAr ? 'تحديد كمكتملة' : language === 'en' ? 'Mark complete' : 'Marquer comme terminée',
    markUndone: isAr ? 'إلغاء اكتمال المهمة' : language === 'en' ? 'Mark incomplete' : 'Marquer comme non terminée',
    empty: isAr ? 'لا توجد مهام مسجلة في هذا اليوم.' : language === 'en' ? 'No tasks recorded for this day.' : 'Aucune tâche enregistrée ce jour.',
  };

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111827]/95 sm:p-5" aria-label={labels.history}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-teal-500" />
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{labels.history}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveMonth(-1)} disabled={displayedMonthKey <= earliestMonthKey} aria-label={labels.previous} className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <strong className="min-w-32 text-center text-sm capitalize text-slate-800 dark:text-slate-100">{visibleMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</strong>
          <button type="button" onClick={() => moveMonth(1)} disabled={displayedMonthKey >= currentMonthKey} aria-label={labels.next} className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-lg bg-teal-500/10 px-2.5 py-1.5 text-teal-700 dark:text-teal-300">{monthSummary.hours.toFixed(1)}h {labels.studied}</span>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600 dark:bg-white/5 dark:text-slate-300">{monthSummary.sessions} {labels.completedSessions}</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekLabels.map((day) => <div key={day} className="pb-1 text-center text-[10px] font-bold text-slate-400">{day}</div>)}
        {monthDays.map((day, index) => {
          const items = day ? activityByDate[day] : undefined;
          const isSelected = day === selectedDate;
          return day ? <button key={day} type="button" onClick={() => setSelectedDate(day)} aria-pressed={isSelected} aria-label={`${new Date(`${day}T12:00:00`).toLocaleDateString(locale)}${items ? `, ${items.length} ${language === 'en' ? 'tasks' : isAr ? 'مهام' : 'tâches'}` : ''}`} className={`relative flex min-h-12 flex-col items-center justify-center rounded-xl border text-xs transition-colors sm:min-h-14 ${isSelected ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300' : 'border-slate-100 bg-slate-50/80 text-slate-700 hover:border-teal-300 dark:border-white/[0.04] dark:bg-white/[0.025] dark:text-slate-300'} ${items?.length ? 'font-extrabold' : ''}`}>
            <span>{Number(day.slice(-2))}</span>
            {items?.length ? <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-teal-500" /> : null}
          </button> : <div key={`empty-${index}`} />;
        })}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/[0.08]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h4>
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-500"><Clock className="h-3 w-3" />{selectedCompletedHours.toFixed(1)}h {labels.studied}</span>
          </div>
          <button type="button" onClick={() => onAddBlock(selectedDate)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-teal-500">
            <Plus className="h-3.5 w-3.5" />{labels.add}<CalendarPlus className="h-3.5 w-3.5 opacity-75" />
          </button>
        </div>
        {selectedItems.length ? <ul className="space-y-2">
          {selectedItems.map(({ block, completed }) => {
            const subjectColor = BAC_SUBJECTS.find((subject) => subject.name === block.subject)?.hexColor || '#14b8a6';
            return <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.035]">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button type="button" onClick={() => onToggleComplete(block.id, selectedDate, !completed, true)} disabled={!canMarkSelectedDayComplete} aria-label={completed ? labels.markUndone : labels.markDone} title={completed ? labels.markUndone : labels.markDone} className={`shrink-0 transition disabled:cursor-not-allowed disabled:opacity-40 ${completed ? 'text-teal-500 hover:text-slate-400' : 'text-slate-400 hover:text-teal-500'}`}>
                  {completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </button>
                <i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: subjectColor }} />
                <span className={`truncate text-xs font-semibold ${completed ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{block.subject} · {block.title}</span>
              </div>
              <div className="ml-6 flex shrink-0 items-center gap-2 sm:ml-0">
                <span className="font-mono text-[10px] text-slate-500">{displayTime(block.startTime)}–{displayTime(block.endTime)}</span>
                <button type="button" onClick={() => onEditBlock(block)} aria-label={`${labels.edit}: ${block.title}`} title={labels.edit} className="rounded-md p-1.5 text-slate-500 transition hover:bg-teal-500/10 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-300"><Pencil className="h-3.5 w-3.5" /></button>
              </div>
            </li>;
          })}
        </ul> : <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:bg-white/[0.035] dark:text-slate-400">{labels.empty}</p>}
      </div>
    </section>
  );
};
