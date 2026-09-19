import React, { useState, useMemo } from 'react';
import {
  Brain,
  CheckCircle,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Sparkles,
  BookOpen,
  X,
  RotateCcw,
  Flame,
  Star,
  Award,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { AppLanguage, LessonItem } from '../../types';
import { BAC_SUBJECTS } from '../../utils/constants';
import { chimePlayer } from '../../utils/audio';
import { getT } from '../../utils/i18n';
import { ProgressRing } from '../shared/ProgressRing';

interface RevisionTabProps {
  lessons: LessonItem[];
  language: AppLanguage;
  onAddLesson: (lesson: Omit<LessonItem, 'id' | 'createdAt'>) => void;
  onReviewLesson: (id: string, easeRating: 1 | 2 | 3 | 4 | 5) => void;
  onDeleteLesson: (id: string) => void;
}

export const RevisionTab: React.FC<RevisionTabProps> = ({
  lessons,
  language,
  onAddLesson,
  onReviewLesson,
  onDeleteLesson,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'memorized'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(BAC_SUBJECTS[0].name);
  const [newNotes, setNewNotes] = useState('');

  // Active Recall Quiz / Test Mode State
  const [activeTestLesson, setActiveTestLesson] = useState<LessonItem | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filtered Lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      if (selectedSubject !== 'all' && l.subject !== selectedSubject) return false;
      if (filterMode === 'due') return l.nextReviewDate <= todayStr && !l.isMemorized;
      if (filterMode === 'memorized') return l.isMemorized;
      return true;
    });
  }, [lessons, selectedSubject, filterMode, todayStr]);

  // Statistics
  const stats = useMemo(() => {
    const total = lessons.length;
    const memorized = lessons.filter((l) => l.isMemorized).length;
    const due = lessons.filter((l) => l.nextReviewDate <= todayStr && !l.isMemorized).length;
    const percentage = total > 0 ? Math.round((memorized / total) * 100) : 0;
    return { total, memorized, due, percentage };
  }, [lessons, todayStr]);

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1); // Stage 1 review tomorrow

    onAddLesson({
      title: newTitle.trim(),
      subject: newSubject,
      stage: 1,
      masteryLevel: 20,
      lastReviewed: todayStr,
      nextReviewDate: nextDate.toISOString().slice(0, 10),
      isMemorized: false,
      notes: newNotes.trim() || undefined,
    });

    setNewTitle('');
    setNewNotes('');
    chimePlayer.playChime('add');
    setIsAddModalOpen(false);
  };

  const handleStartReview = (lesson: LessonItem) => {
    chimePlayer.playChime('modal_open');
    setActiveTestLesson(lesson);
    setIsAnswerRevealed(false);
  };

  const handleRateReview = (rating: 1 | 2 | 3 | 4 | 5) => {
    if (!activeTestLesson) return;
    onReviewLesson(activeTestLesson.id, rating);

    if (rating >= 4) {
      chimePlayer.playChime('complete');
    } else {
      chimePlayer.playChime('tab_switch');
    }

    setActiveTestLesson(null);
    setIsAnswerRevealed(false);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Brain className="w-5 h-5" />
            </span>
            <span>{t('rev_title')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('rev_subtitle')}
          </p>
        </div>

        <button
          onClick={() => { chimePlayer.playChime('modal_open'); setIsAddModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('rev_add_lesson')}</span>
        </button>
      </div>

      {/* 3 Metric Cards with Progress Rings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Due today card */}
        <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">{t('rev_due')}</span>
            <div className="text-3xl font-black font-['Outfit'] text-amber-600 dark:text-amber-400 mt-1">
              {stats.due}
            </div>
            <span className="text-[11px] text-slate-400">
              {isAr ? 'للمراجعة اليوم' : 'À réviser aujourd\'hui'}
            </span>
          </div>
          <ProgressRing
            progress={stats.total > 0 ? Math.round((stats.due / stats.total) * 100) : 0}
            size={64}
            strokeWidth={6}
            strokeColor="#D97706"
            trackColor="#D97706"
            gradientId="due-grad"
            gradientColors={{ from: '#F59E0B', to: '#D97706' }}
            centerContent={
              <span className="text-[13px] font-black font-['Outfit'] text-amber-600 dark:text-amber-400">
                {stats.due}
              </span>
            }
          />
        </div>

        {/* Memorized card */}
        <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">{t('rev_memorized')}</span>
            <div className="text-3xl font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.memorized}
            </div>
            <span className="text-[11px] text-slate-400">
              {isAr ? 'فصول محفوظة' : 'Chapitres maîtrisés'}
            </span>
          </div>
          <ProgressRing
            progress={stats.total > 0 ? Math.round((stats.memorized / stats.total) * 100) : 0}
            size={64}
            strokeWidth={6}
            gradientId="mem-grad"
            gradientColors={{ from: '#10B981', to: '#059669' }}
            centerContent={
              <span className="text-[13px] font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400">
                {stats.memorized}
              </span>
            }
          />
        </div>

        {/* Mastery rate card */}
        <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">{t('rev_rate')}</span>
            <div className="text-3xl font-black font-['Outfit'] text-teal-600 dark:text-teal-400 mt-1">
              {stats.percentage}%
            </div>
            <span className="text-[11px] text-slate-400">
              {stats.total} {isAr ? 'فصل إجمالاً' : 'chapitres au total'}
            </span>
          </div>
          <ProgressRing
            progress={stats.percentage}
            size={64}
            strokeWidth={6}
            gradientId="rate-grad"
            gradientColors={{ from: '#0D9488', to: '#6366F1' }}
            centerContent={
              <span className="text-[11px] font-black font-['Outfit'] text-teal-600 dark:text-teal-400">
                {stats.percentage}%
              </span>
            }
          />
        </div>
      </div>

      {/* Subject Filter Chips & Filter Toggle */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedSubject === 'all'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1A2535] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
          >
            {t('all')}
          </button>
          {BAC_SUBJECTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSubject(s.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${selectedSubject === s.name
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#1A2535] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: t('all') },
            { id: 'due', label: `${t('rev_due')} (${stats.due})` },
            { id: 'memorized', label: `${t('rev_memorized')} (${stats.memorized})` },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterMode(item.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filterMode === item.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lesson List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLessons.map((lesson) => {
          const subjectInfo = BAC_SUBJECTS.find((s) => s.name === lesson.subject);
          const isDue = lesson.nextReviewDate <= todayStr && !lesson.isMemorized;

          return (
            <div
              key={lesson.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 bg-white dark:bg-[#1A2535] shadow-xs ${isDue
                  ? 'border-amber-400/80 ring-1 ring-amber-400/30'
                  : 'border-slate-200 dark:border-slate-800'
                }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${subjectInfo?.dotColor || 'bg-teal-500'
                        }`}
                    />
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      {lesson.subject}
                    </span>
                  </div>

                  <button
                    onClick={() => { chimePlayer.playChime('delete'); onDeleteLesson(lesson.id); }}
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-500 dark:text-slate-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {lesson.title}
                </h3>

                {lesson.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {lesson.notes}
                  </p>
                )}
              </div>

              {/* Leitner Progress Ring + Stage Dots */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-4">
                {/* Circular Ring */}
                <ProgressRing
                  progress={lesson.masteryLevel}
                  size={58}
                  strokeWidth={5}
                  gradientId={`lesson-${lesson.id}`}
                  gradientColors={
                    lesson.isMemorized
                      ? { from: '#10B981', to: '#059669' }
                      : isDue
                        ? { from: '#F59E0B', to: '#D97706' }
                        : { from: '#0D9488', to: '#6366F1' }
                  }
                  centerContent={
                    <span
                      className={`text-[11px] font-black font-['Outfit'] ${lesson.isMemorized
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isDue
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-teal-600 dark:text-teal-400'
                        }`}
                    >
                      {lesson.masteryLevel}%
                    </span>
                  }
                />

                {/* Stage info + date + action */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Stage dots row */}
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((stg) => (
                      <div
                        key={stg}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${stg <= lesson.stage
                            ? isDue
                              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/40'
                              : 'bg-teal-500 text-white shadow-sm shadow-teal-500/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}
                      >
                        {stg}
                      </div>
                    ))}
                    <span className="text-[10px] font-bold text-slate-400 ms-1">
                      {t('rev_stage')} {lesson.stage}/5
                    </span>
                  </div>

                  {/* Date + Review button */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 truncate">
                      <CalendarIcon className="w-3 h-3 shrink-0" />
                      {isDue ? (
                        <strong className="text-amber-500">
                          {isAr ? 'للمراجعة الآن' : 'À réviser maintenant'}
                        </strong>
                      ) : (
                        <span className="truncate">
                          {isAr ? 'قادم: ' : 'Prochaine: '}{lesson.nextReviewDate}
                        </span>
                      )}
                    </span>

                    <button
                      onClick={() => handleStartReview(lesson)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shrink-0 ${isDue
                          ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-xs'
                          : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                        }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('rev_review_btn')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredLessons.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-[#1A2535] rounded-2xl border border-slate-200 dark:border-slate-800">
          <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aucun chapitre trouvé dans cette catégorie.
          </p>
        </div>
      )}

      {/* Active Recall / Review Modal */}
      {activeTestLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Brain className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold font-['Outfit']">
                    {t('rev_recall_title')}
                  </h3>
                  <span className="text-xs text-slate-400">{activeTestLesson.subject}</span>
                </div>
              </div>
              <button
                onClick={() => { chimePlayer.playChime('modal_close'); setActiveTestLesson(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Flashcard Box */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chapitre à restituer mentalement
              </div>
              <h2 className="text-xl font-black font-['Outfit'] text-slate-900 dark:text-white">
                {activeTestLesson.title}
              </h2>

              {!isAnswerRevealed ? (
                <button
                  onClick={() => { chimePlayer.playChime('tab_switch'); setIsAnswerRevealed(true); }}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-transform active:scale-95"
                >
                  {t('rev_reveal_answer')}
                </button>
              ) : (
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-left rtl:text-right">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {activeTestLesson.notes ||
                      'Restituez les définitions, théorèmes et méthodes clés du cours sans regarder vos fiches.'}
                  </p>
                </div>
              )}
            </div>

            {/* Self-Rating Buttons (1 to 5) */}
            {isAnswerRevealed && (
              <div className="space-y-3">
                <span className="block text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t('rev_rate_ease')}
                </span>
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold">
                  {[
                    { val: 1, label: 'Difficile', color: 'bg-rose-500 text-white' },
                    { val: 2, label: 'Moyen', color: 'bg-amber-500 text-white' },
                    { val: 3, label: 'Correct', color: 'bg-blue-500 text-white' },
                    { val: 4, label: 'Facile', color: 'bg-teal-500 text-white' },
                    { val: 5, label: 'Parfait', color: 'bg-emerald-500 text-white' },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => handleRateReview(btn.val as any)}
                      className={`p-2.5 rounded-xl ${btn.color} font-bold transition-transform active:scale-95 flex flex-col items-center gap-1 shadow-xs`}
                    >
                      <span className="text-sm font-black">{btn.val}</span>
                      <span className="text-[10px] truncate max-w-full">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add New Lesson */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold font-['Outfit']">
                {t('rev_add_lesson')}
              </h3>
              <button
                onClick={() => { chimePlayer.playChime('modal_close'); setIsAddModalOpen(false); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Matière
                </label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {BAC_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Titre du chapitre
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Équations différentielles du 1er ordre..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Notes clés / Définitions à mémoriser (optionnel)
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes, théorèmes ou formules clés..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { chimePlayer.playChime('modal_close'); setIsAddModalOpen(false); }}
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
