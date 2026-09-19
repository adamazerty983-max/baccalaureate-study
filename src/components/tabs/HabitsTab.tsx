import React, { useState } from 'react';
import { Flame, Plus, CheckCircle, Trash2, Award, X, Sparkles, Calendar, ListFilter } from 'lucide-react';
import { AppLanguage, HabitItem, TaskItem, TimeBlock } from '../../types';
import { chimePlayer } from '../../utils/audio';
import { getT } from '../../utils/i18n';
import { StreakCalendarView } from '../gamification/StreakCalendarView';
import { CalendarHeatmap } from '../gamification/CalendarHeatmap';

interface HabitsTabProps {
  habits: HabitItem[];
  habitLogs?: Record<string, Record<string, boolean>>;
  tasks?: TaskItem[];
  timeBlocks?: TimeBlock[];
  language: AppLanguage;
  onAddHabit: (name: string, subject?: string, icon?: string) => void;
  onToggleHabit?: (habitId: string, dateKey: string) => void;
  onToggleHabitDay?: (habitId: string, dateKey: string) => void;
  onDeleteHabit: (id: string) => void;
}

const HABIT_ICONS = ['🕌', '📚', '🏃', '😴', '💧', '🍎', '🧘', '🎯', '✍️', '⚡', '🧠', '🌿'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export const HabitsTab: React.FC<HabitsTabProps> = ({
  habits = [],
  habitLogs = {},
  tasks = [],
  timeBlocks = [],
  language,
  onAddHabit,
  onToggleHabit,
  onToggleHabitDay,
  onDeleteHabit,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const todayKey = getTodayKey();

  const [activeSubView, setActiveSubView] = useState<'heatmap' | 'calendar' | 'cards'>('heatmap');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📚');

  const safeLogs = habitLogs || {};
  const todayLogs = safeLogs[todayKey] || {};

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    if (typeof onAddHabit === 'function') {
      onAddHabit(newHabitName.trim(), '', selectedIcon);
    }

    chimePlayer.playChime('add');
    setNewHabitName('');
    setIsModalOpen(false);
  };

  const handleToggle = (id: string, isDoneToday: boolean) => {
    const toggleFn = onToggleHabit || onToggleHabitDay;
    if (toggleFn) {
      toggleFn(id, todayKey);
    }
    if (!isDoneToday) {
      chimePlayer.playChime('complete');
    } else {
      chimePlayer.playChime('uncheck');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header with Sub-View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1A2535] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-500">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
            </span>
            <span>
              {activeSubView === 'heatmap'
                ? isAr
                  ? 'خريطة النشاط والانضباط (GitHub Heatmap)'
                  : 'Carte d\'Activité (GitHub Heatmap)'
                : activeSubView === 'calendar'
                  ? isAr
                    ? 'سجل الشعلة والتقويم'
                    : 'Historique de la série (Streak History)'
                  : t('hab_title')}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeSubView === 'heatmap'
              ? isAr
                ? 'متابعة بصرية دقيقة لمعدل إنجازاتك اليومية عبر مصفوفة حرارية سنوية'
                : 'Visualisez la densité de vos sessions de travail au fil des semaines'
              : activeSubView === 'calendar'
                ? isAr
                  ? 'تتبع الأيام المكتملة وحافظ على توهج شعلتك اليومية'
                  : 'Calendrier visuel des jours où votre série a été maintenue avec succès'
                : t('hab_sub')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sub-view switcher tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSubView('heatmap')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeSubView === 'heatmap'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Sparkles className="w-4 h-4 text-teal-500" />
              <span>{isAr ? 'خريطة النشاط' : 'Heatmap'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeSubView === 'calendar'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'تقويم الشعلة' : 'Calendrier'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView('cards')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeSubView === 'cards'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>{isAr ? 'قائمة العادات' : 'Mes Habitudes'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px]">
                {habits.length}
              </span>
            </button>
          </div>

          {activeSubView === 'cards' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('hab_add')}</span>
            </button>
          )}
        </div>
      </div>

      {/* View Content: Heatmap, Streak Calendar, or Habit Cards */}
      {activeSubView === 'heatmap' ? (
        <CalendarHeatmap
          tasks={tasks}
          habits={habits}
          habitLogs={habitLogs}
          timeBlocks={timeBlocks}
          language={language}
        />
      ) : activeSubView === 'calendar' ? (
        <StreakCalendarView
          tasks={tasks}
          habits={habits}
          habitLogs={habitLogs}
          timeBlocks={timeBlocks}
          language={language}
        />
      ) : (
        <>
          {/* Habits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map((habit) => {
              const isDoneToday =
                Boolean(todayLogs[habit.id]) ||
                Boolean(habit.history && habit.history.includes(todayKey));

              return (
                <div
                  key={habit.id}
                  className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${isDoneToday
                    ? 'bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-500/40 shadow-xs'
                    : 'bg-white dark:bg-[#1A2535] border-slate-200 dark:border-slate-800 shadow-xs'
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                        {habit.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {habit.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>
                              {habit.streak || 0} {t('hab_days')}
                            </span>
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-[11px] text-slate-400">
                            {t('hab_max')}: {habit.best || habit.streak || 0} {t('hab_days')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => { chimePlayer.playChime('delete'); onDeleteHabit(habit.id); }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Complete Today Button */}
                  <button
                    onClick={() => handleToggle(habit.id, isDoneToday)}
                    className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs cursor-pointer ${isDoneToday
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                  >
                    <CheckCircle
                      className={`w-4 h-4 ${isDoneToday ? 'text-white' : 'text-slate-400'}`}
                    />
                    <span>
                      {isDoneToday
                        ? isAr
                          ? 'مكتملة اليوم ✓'
                          : "Complétée aujourd'hui ✓"
                        : isAr
                          ? 'تسجيل إنجاز اليوم'
                          : "Valider aujourd'hui"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {habits.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-[#1A2535] rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-medium space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Flame className="w-6 h-6" />
              </div>
              <p>{t('hab_empty')}</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t('hab_add')}</span>
              </button>
            </div>
          )}
        </>
      )}


      {/* Modal: Add Habit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold font-['Outfit']">{t('hab_add')}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {isAr ? 'اسم العادة' : 'Nom de l\'habitude *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: قراءة 15 دقيقة قبل النوم' : 'Ex: Lecture matinale 20min'}
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  {isAr ? 'الأيقونة' : 'Icône'}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {HABIT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={`text-xl p-2 rounded-xl border transition-all cursor-pointer ${selectedIcon === icon
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950 scale-110 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-500/20 cursor-pointer"
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
