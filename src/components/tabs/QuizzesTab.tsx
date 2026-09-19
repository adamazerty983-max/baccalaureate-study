import React, { useState, useMemo, useDeferredValue, useCallback } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Target,
  Award,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Trash2,
  Edit2,
  Check,
} from 'lucide-react';
import { PriorityLevel, QuizItem } from '../../types';
import { PriorityBadge } from '../shared/PriorityBadge';
import { BAC_SUBJECTS } from '../../utils/constants';
import { chimePlayer } from '../../utils/audio';

interface QuizzesTabProps {
  quizzes: QuizItem[];
  onAddQuiz: (quiz: Omit<QuizItem, 'id' | 'createdAt'>) => void;
  onUpdateQuiz: (quiz: QuizItem) => void;
  onDeleteQuiz: (quizId: string) => void;
  onToggleStatus: (quizId: string) => void;
}

const getDaysUntil = (dateStr: string) => {
  const target = new Date(dateStr).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Past';
  if (diffDays === 0) return 'Today!';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
};

const getSubjectBadge = (subjectName: string) => {
  const found = BAC_SUBJECTS.find((s) => s.name.toLowerCase() === subjectName.toLowerCase());
  return (
    found?.badgeColor ||
    'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  );
};

interface QuizCardItemProps {
  quiz: QuizItem;
  onToggleStatus: (id: string) => void;
  onEdit: (quiz: QuizItem) => void;
  onDelete: (id: string) => void;
}

const QuizCardItem: React.FC<QuizCardItemProps> = React.memo(({
  quiz,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const isDone = quiz.status === 'completed';
  const daysLabel = getDaysUntil(quiz.date);

  return (
    <div
      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${isDone
          ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
          : quiz.priority === 'urgent'
            ? 'bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-800 shadow-sm shadow-purple-500/10'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
        }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PriorityBadge priority={quiz.priority} />
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getSubjectBadge(
                quiz.subject
              )}`}
            >
              {quiz.subject}
            </span>
          </div>

          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${daysLabel === 'Today!' || daysLabel === 'Tomorrow'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            {daysLabel}
          </span>
        </div>

        {/* Title & Notes */}
        <h3
          className={`text-base font-bold font-['Outfit'] ${isDone
              ? 'line-through text-slate-400 dark:text-slate-500'
              : 'text-slate-900 dark:text-white'
            }`}
        >
          {quiz.title}
        </h3>

        {quiz.notes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
            {quiz.notes}
          </p>
        )}

        {/* Topics Chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          {quiz.topics.map((topic, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
            >
              #{topic}
            </span>
          ))}
        </div>

        {/* Target & Actual Score Metrics */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Target Score
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {quiz.targetScore} / {quiz.totalScore}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Actual Score
            </span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {quiz.actualScore !== undefined ? `${quiz.actualScore} / ${quiz.totalScore}` : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {quiz.date} at {quiz.time}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onToggleStatus(quiz.id);
              if (!isDone) {
                chimePlayer.playChime('complete');
              } else {
                chimePlayer.playChime('uncheck');
              }
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${isDone
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
              }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isDone ? 'Completed' : 'Mark Done'}</span>
          </button>

          <button
            onClick={() => onEdit(quiz)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              chimePlayer.playChime('delete');
              onDelete(quiz.id);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

export const QuizzesTab: React.FC<QuizzesTabProps> = ({
  quizzes,
  onAddQuiz,
  onUpdateQuiz,
  onDeleteQuiz,
  onToggleStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState(BAC_SUBJECTS[0].name);
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formTargetScore, setFormTargetScore] = useState(18);
  const [formTotalScore, setFormTotalScore] = useState(20);
  const [formActualScore, setFormActualScore] = useState<number | ''>('');
  const [formTopics, setFormTopics] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('high');
  const [formNotes, setFormNotes] = useState('');

  const openNewQuizModal = () => {
    chimePlayer.playChime('modal_open');
    setEditingQuiz(null);
    setFormTitle('');
    setFormSubject(BAC_SUBJECTS[0].name);
    setFormDate(new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10));
    setFormTime('09:00');
    setFormTargetScore(18);
    setFormTotalScore(20);
    setFormActualScore('');
    setFormTopics('');
    setFormDifficulty('medium');
    setFormPriority('high');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (quiz: QuizItem) => {
    chimePlayer.playChime('modal_open');
    setEditingQuiz(quiz);
    setFormTitle(quiz.title);
    setFormSubject(quiz.subject);
    setFormDate(quiz.date);
    setFormTime(quiz.time || '09:00');
    setFormTargetScore(quiz.targetScore);
    setFormTotalScore(quiz.totalScore);
    setFormActualScore(quiz.actualScore !== undefined ? quiz.actualScore : '');
    setFormTopics(quiz.topics.join(', '));
    setFormDifficulty(quiz.difficulty);
    setFormPriority(quiz.priority);
    setFormNotes(quiz.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const topicsArray = formTopics
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingQuiz) {
      onUpdateQuiz({
        ...editingQuiz,
        title: formTitle.trim(),
        subject: formSubject,
        date: formDate,
        time: formTime,
        targetScore: Number(formTargetScore),
        totalScore: Number(formTotalScore),
        actualScore: formActualScore !== '' ? Number(formActualScore) : undefined,
        topics: topicsArray.length > 0 ? topicsArray : ['General Review'],
        difficulty: formDifficulty,
        priority: formPriority,
        notes: formNotes.trim(),
      });
    } else {
      onAddQuiz({
        title: formTitle.trim(),
        subject: formSubject,
        date: formDate || new Date().toISOString().slice(0, 10),
        time: formTime,
        targetScore: Number(formTargetScore),
        totalScore: Number(formTotalScore),
        actualScore: formActualScore !== '' ? Number(formActualScore) : undefined,
        topics: topicsArray.length > 0 ? topicsArray : ['General Review'],
        status: 'upcoming',
        difficulty: formDifficulty,
        priority: formPriority,
        notes: formNotes.trim(),
      });
    }

    chimePlayer.playChime('add');
    setIsAddModalOpen(false);
  };

  const deferredSearch = useDeferredValue(searchTerm);

  // Filter quizzes (memoized with deferred search)
  const filteredQuizzes = useMemo(() => {
    const searchLower = deferredSearch.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      const matchesSearch =
        !searchLower ||
        quiz.title.toLowerCase().includes(searchLower) ||
        quiz.subject.toLowerCase().includes(searchLower) ||
        quiz.topics.some((t) => t.toLowerCase().includes(searchLower));

      const matchesSubject = selectedSubject === 'all' || quiz.subject === selectedSubject;
      const matchesStatus = selectedStatus === 'all' || quiz.status === selectedStatus;
      const matchesPriority = selectedPriority === 'all' || quiz.priority === selectedPriority;

      return matchesSearch && matchesSubject && matchesStatus && matchesPriority;
    });
  }, [quizzes, deferredSearch, selectedSubject, selectedStatus, selectedPriority]);

  const handleEditQuiz = useCallback((quiz: QuizItem) => {
    openEditModal(quiz);
  }, []);

  const handleDeleteQuiz = useCallback((quizId: string) => {
    onDeleteQuiz(quizId);
  }, [onDeleteQuiz]);

  const handleToggleStatus = useCallback((quizId: string) => {
    onToggleStatus(quizId);
  }, [onToggleStatus]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-slate-900 dark:text-white">
              Quizzes & Test Deadlines
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize upcoming Baccalaureate class quizzes, trial tests, revision targets, and track your scores.
          </p>
        </div>

        <button
          id="add-quiz-btn"
          onClick={openNewQuizModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 transition-all shadow-sm shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Quiz Deadline</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search quiz title or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Subjects</option>
            {BAC_SUBJECTS.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="revision_needed">Revision Needed</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Quizzes List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredQuizzes.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <HelpCircle className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">No quizzes found.</p>
            <p className="text-xs text-slate-400 mt-1">Click "New Quiz Deadline" to add your upcoming tests!</p>
          </div>
        ) : (
          filteredQuizzes.map((quiz) => (
            <QuizCardItem
              key={quiz.id}
              quiz={quiz}
              onToggleStatus={handleToggleStatus}
              onEdit={handleEditQuiz}
              onDelete={handleDeleteQuiz}
            />
          ))
        )}
      </div>

      {/* Add / Edit Quiz Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
              <h2 className="text-base sm:text-lg font-bold font-['Outfit'] text-slate-900 dark:text-white">
                {editingQuiz ? 'Edit Quiz & Test' : 'Add New Quiz Deadline'}
              </h2>
              <button
                type="button"
                onClick={() => { chimePlayer.playChime('modal_close'); setIsAddModalOpen(false); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveQuiz} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto p-4 sm:p-5 space-y-3 flex-1 text-xs sm:text-sm">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quiz Title / Examination Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Calculus & Differential Equations Midterm"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Subject
                    </label>
                    <select
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    >
                      {BAC_SUBJECTS.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as PriorityLevel)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="urgent">🟣 Urgent</option>
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Quiz Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Quiz Time
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Score
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formTargetScore}
                      onChange={(e) => setFormTargetScore(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Out Of (Scale)
                    </label>
                    <input
                      type="number"
                      value={formTotalScore}
                      onChange={(e) => setFormTotalScore(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Actual Score
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Optional"
                      value={formActualScore}
                      onChange={(e) => setFormActualScore(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Topics / Chapters (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Euler formula, Trigonometry, Locus of points"
                    value={formTopics}
                    onChange={(e) => setFormTopics(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Revision Notes / Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Key theorems to memorize, formulas, or teacher tips..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none resize-none text-xs"
                  />
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
                <button
                  type="button"
                  onClick={() => { chimePlayer.playChime('modal_close'); setIsAddModalOpen(false); }}
                  className="px-4 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-xl text-white bg-amber-600 hover:bg-amber-500 font-semibold shadow-md shadow-amber-500/20 cursor-pointer text-xs sm:text-sm"
                >
                  {editingQuiz ? 'Save Changes' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
