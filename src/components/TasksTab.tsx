import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Flame,
  CheckCircle2,
  Circle,
  AlertCircle,
  Tag,
  ListTodo,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
} from 'lucide-react';
import { AppLanguage, PriorityLevel, TaskItem, TaskStatus, TimeBlock } from '../types';
import { BAC_SUBJECTS } from '../utils/constants';
import { calculateDailyStreak, getLocalDateStr, getWeekDaysStreakStatus } from '../utils/streak';
import { chimePlayer } from '../utils/audio';
import { getT } from '../utils/i18n';
import { DuolingoStreakFlame } from './DuolingoStreakFlame';

interface TasksTabProps {
  tasks: TaskItem[];
  timeBlocks?: TimeBlock[];
  language: AppLanguage;
  onAddTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  onUpdateTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskComplete: (taskId: string) => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({
  tasks,
  timeBlocks = [],
  language,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTaskComplete,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const todayStr = getLocalDateStr();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'today' | 'todo' | 'completed'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // New Task Inline Form
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(BAC_SUBJECTS[0].name);
  const [newPriority, setNewPriority] = useState<PriorityLevel>('high');
  const [newDueDate, setNewDueDate] = useState(todayStr);
  const [newDescription, setNewDescription] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');

  // Expanded details per task
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  // Calculate Streak strictly with tasks and time blocks
  const streakData = useMemo(() => calculateDailyStreak(tasks, [], timeBlocks), [tasks, timeBlocks]);
  const weekDays = useMemo(
    () => getWeekDaysStreakStatus(streakData.completedDates, language),
    [streakData.completedDates, language]
  );

  const toggleExpand = (id: string) => {
    setExpandedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const checklistItems = newChecklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `chk-${Date.now()}-${idx}`,
        text,
        completed: false,
      }));

    onAddTask({
      title: newTitle.trim(),
      subject: newSubject,
      priority: newPriority,
      status: 'todo',
      type: 'revision',
      dueDate: newDueDate || todayStr,
      description: newDescription.trim() || undefined,
      checklist: checklistItems.length > 0 ? checklistItems : undefined,
      progressPercentage: 0,
    });

    chimePlayer.playChime('add');
    setNewTitle('');
    setNewDescription('');
    setNewChecklistText('');
    setIsAddingTask(false);
  };

  const handleToggleChecklistItem = (taskId: string, checkId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.checklist) return;

    const updatedChecklist = task.checklist.map((item) =>
      item.id === checkId ? { ...item, completed: !item.completed } : item
    );

    const completedCount = updatedChecklist.filter((c) => c.completed).length;
    const progress = Math.round((completedCount / updatedChecklist.length) * 100);

    onUpdateTask({
      ...task,
      checklist: updatedChecklist,
      progressPercentage: progress,
    });
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchSubject = task.subject.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchSubject && !matchDesc) return false;
      }

      // Status filter
      if (filterStatus === 'today') {
        if (task.dueDate !== todayStr) return false;
      } else if (filterStatus === 'todo') {
        if (task.status === 'completed') return false;
      } else if (filterStatus === 'completed') {
        if (task.status !== 'completed') return false;
      }

      // Subject filter
      if (selectedSubject !== 'all' && task.subject !== selectedSubject) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, filterStatus, selectedSubject, selectedPriority, todayStr]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner: Daily Streak Engine & Motivation */}
      <div className="bg-[#131F24] p-6 sm:p-7 rounded-3xl border border-[#2B3842] shadow-xl text-white">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Campfire & Counter */}
          <div className="md:col-span-4 flex flex-col items-center text-center">
            <div>
              <DuolingoStreakFlame size={115} />
            </div>

            <div className="text-5xl sm:text-6xl font-black font-['Outfit'] text-white tracking-tight leading-none mt-1">
              {streakData.currentStreak}
            </div>

            <div className="text-lg sm:text-xl font-black text-[#FF9600] tracking-wide mt-1">
              {streakData.currentStreak > 0
                ? isAr
                  ? `${streakData.currentStreak} أيام متتالية!`
                  : language === 'fr'
                    ? `${streakData.currentStreak} jours de série !`
                    : `${streakData.currentStreak} day streak!`
                : isAr
                  ? '0 أيام متتالية'
                  : language === 'fr'
                    ? '0 jour de série'
                    : '0 day streak'}
            </div>
          </div>

          {/* Right: Explanation & 7-Days Row */}
          <div className="md:col-span-8 bg-[#182229] border border-[#2B3842] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#FF9600]" />
                {isAr ? 'حالة الشعلة الأسبوعية' : 'Suivi de la série hebdomadaire'}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${streakData.isTodayCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-[#FF9600]/20 text-[#FF9600] border border-[#FF9600]/40'
                  }`}
              >
                {streakData.isTodayCompleted
                  ? isAr
                    ? '✓ تم إنجاز مهمة اليوم'
                    : '✓ Tâche du jour validée'
                  : isAr
                    ? '⚡ في انتظار تأكيد المهمة'
                    : '⚡ En attente de validation'}
              </span>
            </div>

            {/* 7 Days Row */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {weekDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`text-xs font-bold ${day.isToday
                      ? 'text-[#FF9600]'
                      : day.status === 'done' || day.status === 'flame'
                        ? 'text-slate-200'
                        : 'text-[#8495A0]'
                      }`}
                  >
                    {day.name}
                  </span>

                  {day.status === 'done' && (
                    <div className="w-8 h-8 rounded-full bg-[#FF9600] text-[#131F24] flex items-center justify-center font-black text-sm shadow-md">
                      <CheckCircle2 className="w-4 h-4 text-[#131F24] stroke-[3]" />
                    </div>
                  )}

                  {day.status === 'flame' && (
                    <div className="w-8 h-8 rounded-full bg-[#FF9600] text-[#131F24] flex items-center justify-center font-black text-sm shadow-md ring-2 ring-[#FF9600]/40 animate-pulse">
                      <Flame className="w-4 h-4 text-[#131F24] fill-current stroke-[2.5]" />
                    </div>
                  )}

                  {day.status === 'empty' && (
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${day.isToday
                        ? 'border-[#FF9600]/60 bg-[#FF9600]/10 text-[#FF9600]'
                        : 'border-[#2B3842] bg-[#131F24]'
                        }`}
                    >
                      {day.isToday && <span className="w-2 h-2 rounded-full bg-[#FF9600] animate-ping" />}
                    </div>
                  )}

                  {day.status === 'future' && (
                    <div className="w-8 h-8 rounded-full bg-[#2A3840]/60 border border-[#384852]/60" />
                  )}
                </div>
              ))}
            </div>

            {/* Streak Instructions */}
            <div className="text-xs text-slate-300 leading-relaxed border-t border-[#2B3842] pt-3">
              {streakData.isTodayCompleted ? (
                <span className="text-emerald-400 font-semibold">
                  {isAr
                    ? '🔥 أحسنت! لقد أكملت مهمتك اليوم وحافظت على شعلتك متوهجة.'
                    : '🔥 Super ! Vous avez validé votre tâche quotidienne aujourd’hui et entretenu votre série.'}
                </span>
              ) : (
                <span className="text-amber-300 font-semibold">
                  {isAr
                    ? '💡 اضغط على زر تأكيد إنجاز المهمة أدناه لتحديث الشعلة وإشعال سلسلة الأيام المتواصلة!'
                    : '💡 Cliquez sur le bouton de confirmation d’une tâche ci-dessous pour allumer votre flamme aujourd’hui !'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Add Task Trigger */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isAr ? 'البحث في المهام...' : 'Rechercher une tâche...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1A2535] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsAddingTask((prev) => !prev)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-500/20 transition-transform active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'إضافة مهمة جديدة' : 'Nouvelle tâche quotidienne'}</span>
        </button>
      </div>

      {/* Filter Chips Row */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        {/* Status Filters */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl">
          {[
            { id: 'all', label: isAr ? 'الكل' : 'Toutes', count: tasks.length },
            {
              id: 'today',
              label: isAr ? 'اليوم' : "Aujourd'hui",
              count: tasks.filter((t) => t.dueDate === todayStr).length,
            },
            { id: 'todo', label: isAr ? 'قيد الإنجاز' : 'À faire', count: pendingCount },
            { id: 'completed', label: isAr ? 'المكتملة' : 'Terminées', count: completedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterStatus === tab.id
                ? 'bg-white dark:bg-[#1A2535] text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Subject Filter Select */}
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2535] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="all">{isAr ? 'جميع المواد' : 'Toutes les matières'}</option>
          {BAC_SUBJECTS.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Priority Filter Select */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2535] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="all">{isAr ? 'جميع الأولويات' : 'Toutes priorités'}</option>
          <option value="urgent">🟣 Urgent</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
      </div>

      {/* Inline Task Creator Accordion */}
      {isAddingTask && (
        <form
          onSubmit={handleCreateTask}
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1A2535] border border-teal-500/30 shadow-xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{isAr ? 'إنشاء مهمة يومية جديدة' : 'Créer une tâche quotidienne'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingTask(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'عنوان المهمة *' : 'Titre de la tâche *'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  isAr
                    ? 'مثال: حل 3 تمارين في المتتاليات العددية'
                    : 'ex: Résoudre la série d’exercices sur les suites numériques'
                }
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المادة' : 'Matière'}
              </label>
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none"
              >
                {BAC_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الأولوية' : 'Priorité'}
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none"
              >
                <option value="urgent">🟣 Urgent (عاجل جداً)</option>
                <option value="high">🔴 High (أولوية عالية)</option>
                <option value="medium">🟡 Medium (متوسط)</option>
                <option value="low">🟢 Low (عادي)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ الإنجاز المستهدف' : 'Date d’échéance'}
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'عناصر فرعية للمهمة (سطر لكل عنصر)' : 'Sous-tâches / Checklist (1 par ligne)'}
            </label>
            <textarea
              rows={2}
              placeholder={
                isAr
                  ? 'مراجعة القواعد والخاصيات\nحل التمرين 1 و 2\nمقارنة النتائج مع التصحيح'
                  : 'Revoir le cours\nFaire exercice 1 et 2\nAuto-correction'
              }
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddingTask(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/20"
            >
              {isAr ? 'حفظ المهمة' : 'Enregistrer la tâche'}
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => {
          const isCompleted = task.status === 'completed';
          const subjectInfo = BAC_SUBJECTS.find((s) => s.name === task.subject);
          const isExpanded = Boolean(expandedTaskIds[task.id]);
          const isTaskForToday = task.dueDate === todayStr;

          return (
            <div
              key={task.id}
              className={`p-4 sm:p-5 rounded-3xl border transition-all ${isCompleted
                ? 'bg-slate-50/80 dark:bg-[#151D2A]/80 border-slate-200/80 dark:border-slate-800/80 opacity-90'
                : 'bg-white dark:bg-[#1A2535] border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-500/40 hover:shadow-md'
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Interactive Confirmation Button + Task Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Task Confirmation Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted) {
                        chimePlayer.playChime('uncheck');
                      } else {
                        chimePlayer.playChime('complete');
                      }
                      onToggleTaskComplete(task.id);
                    }}
                    title={
                      isCompleted
                        ? isAr
                          ? 'إلغاء التأكيد'
                          : 'Marquer comme non complétée'
                        : isAr
                          ? 'تأكيد إنجاز المهمة وإشعال الشعلة'
                          : 'Confirmer l’accomplissement de la tâche pour la série'
                    }
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-90 ${isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                      : 'border-2 border-slate-300 dark:border-slate-600 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600'
                      }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <Circle className="w-4 h-4 stroke-[2]" />
                    )}
                  </button>

                  {/* Task Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}
                      >
                        {task.title}
                      </span>

                      {/* Today Badge */}
                      {isTaskForToday && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-wider">
                          {isAr ? 'اليوم' : "Aujourd'hui"}
                        </span>
                      )}
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {/* Subject Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-lg font-bold border text-[10px] ${subjectInfo?.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                      >
                        {task.subject}
                      </span>

                      {/* Priority */}
                      <span
                        className={`px-2 py-0.5 rounded-lg font-bold text-[10px] ${task.priority === 'urgent'
                          ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                          : task.priority === 'high'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                      >
                        {task.priority.toUpperCase()}
                      </span>

                      {/* Due Date */}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {task.dueDate}
                      </span>

                      {/* Subtasks Count if any */}
                      {task.checklist && task.checklist.length > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-teal-600 dark:text-teal-400">
                          <ListTodo className="w-3 h-3" />
                          {task.checklist.filter((c) => c.completed).length}/{task.checklist.length}{' '}
                          {isAr ? 'عناصر' : 'étapes'}
                        </span>
                      )}
                    </div>

                    {/* Description if present */}
                    {task.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {task.checklist && task.checklist.length > 0 && (
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={isExpanded ? 'Réduire' : 'Afficher les sous-tâches'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      chimePlayer.playChime('delete');
                      onDeleteTask(task.id);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title={isAr ? 'حذف المهمة' : 'Supprimer la tâche'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expandable Checklist Section */}
              {isExpanded && task.checklist && task.checklist.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 pl-11">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {isAr ? 'خطوات المهمة الفرعية :' : 'Étapes de la tâche :'}
                  </div>
                  <div className="space-y-1.5">
                    {task.checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklistItem(task.id, item.id)}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => { }}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-0 cursor-pointer"
                        />
                        <span
                          className={`flex-1 ${item.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'
                            }`}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-[#1A2535] border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'لا توجد مهام مسجلة حالياً' : 'Aucune tâche enregistrée'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {isAr
                ? 'أضف مهمتك الأولى لليوم واضغط على زر التأكيد لبدء وإشعال سلسلة الأيام المتواصلة (Streak)!'
                : 'Ajoutez votre première tâche quotidienne et validez-la pour allumer votre feu de camp et démarrer votre série !'}
            </p>
            <button
              onClick={() => setIsAddingTask(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة مهمة جديدة' : 'Créer une tâche'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
