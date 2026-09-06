import React, { useState, useMemo } from 'react';
import { Target, Plus, CheckCircle, Circle, Trash2, Trophy, Sparkles, X } from 'lucide-react';
import { AppLanguage, GoalItem } from '../types';
import { chimePlayer } from '../utils/audio';
import { getT } from '../utils/i18n';

interface GoalsTabProps {
  goals: GoalItem[];
  language: AppLanguage;
  onAddGoal: (title: string) => void;
  onToggleGoal: (id: string) => void;
  onDeleteGoal: (id: string) => void;
}

export const GoalsTab: React.FC<GoalsTabProps> = ({
  goals,
  language,
  onAddGoal,
  onToggleGoal,
  onDeleteGoal,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const completedCount = useMemo(() => goals.filter((g) => g.done).length, [goals]);
  const progressPercent = useMemo(
    () => (goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0),
    [completedCount, goals.length]
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    onAddGoal(newGoalTitle.trim());
    chimePlayer.playChime('add');
    setNewGoalTitle('');
    setIsModalOpen(false);
  };

  const handleToggle = (id: string, currentlyDone: boolean) => {
    onToggleGoal(id);
    if (!currentlyDone) {
      chimePlayer.playChime('complete');
    } else {
      chimePlayer.playChime('uncheck');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Target className="w-5 h-5" />
            </span>
            <span>{t('nav_goals')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? 'حدد أهدافك الأكاديمية وطموحك للباكالوريا' : 'Fixez vos objectifs académiques et suivez votre accomplissement'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add')}</span>
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-teal-500/30 shadow-xl relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
              {isAr ? 'نسبة إنجاز الأهداف' : 'Taux d\'accomplissement global'}
            </span>
          </div>
          <span className="text-sm font-black font-['Outfit'] text-amber-400">
            {completedCount} / {goals.length} {t('tile_goals_sub')}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-3.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-300 font-bold">
            <span>{progressPercent}% complété</span>
            <span>{100 - progressPercent}% restant</span>
          </div>
        </div>
      </div>

      {/* Goals Checklist */}
      <div className="bg-white dark:bg-[#1A2535] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isAr ? 'قائمة الأهداف المسجلة' : 'Liste de vos objectifs'} ({goals.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {goals.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex items-center justify-between gap-4 transition-colors ${item.done ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/40'
                }`}
            >
              <div
                onClick={() => handleToggle(item.id, item.done)}
                className="flex items-center gap-3.5 min-w-0 cursor-pointer select-none flex-1"
              >
                <button
                  type="button"
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform active:scale-90 shrink-0 ${item.done ? 'bg-emerald-500 text-white shadow-xs' : 'border-2 border-slate-300 dark:border-slate-600 text-transparent'
                    }`}
                >
                  {item.done && <CheckCircle className="w-4 h-4" />}
                </button>
                <span
                  className={`text-xs font-semibold leading-relaxed transition-colors ${item.done
                      ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                      : 'text-slate-900 dark:text-white'
                    }`}
                >
                  {item.title}
                </span>
              </div>

              <button
                onClick={() => { chimePlayer.playChime('delete'); onDeleteGoal(item.id); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                title={t('delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {goals.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              {isAr ? 'لا توجد أهداف مسجلة — اضغط إضافة لبدء كتابة طموحاتك' : 'Aucun objectif défini — cliquez sur Ajouter pour commencer'}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Goal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold font-['Outfit']">
                {isAr ? 'إضافة هدف جديد' : 'Nouvel Objectif'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {isAr ? 'نص الهدف' : 'Intitulé de l\'objectif *'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={isAr ? 'مثال: الحصول على 19 في الرياضيات وحل جميع الامتحانات السابقة' : 'Ex: Obtenir plus de 18/20 en Mathématiques au Bac national'}
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-500/20"
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
