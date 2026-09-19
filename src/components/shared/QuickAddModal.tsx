import React, { useState } from 'react';
import {
  CheckSquare,
  HelpCircle,
  BookOpen,
  FileText,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import { HomeworkItem, LectureNote, PriorityLevel, QuizItem, TaskItem, TimeBlock } from '../../types';
import { BAC_SUBJECTS } from '../../utils/constants';
import { chimePlayer } from '../../utils/audio';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'task' | 'quiz' | 'homework' | 'note' | 'timeblock';
  onAddTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  onAddQuiz: (quiz: Omit<QuizItem, 'id' | 'createdAt'>) => void;
  onAddHomework: (hw: Omit<HomeworkItem, 'id' | 'createdAt'>) => void;
  onAddNote: (note: Omit<LectureNote, 'id' | 'createdAt'>) => void;
  onAddTimeBlock: (tb: Omit<TimeBlock, 'id'>) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'task',
  onAddTask,
  onAddQuiz,
  onAddHomework,
  onAddNote,
  onAddTimeBlock,
}) => {
  const [activeType, setActiveType] = useState<'task' | 'quiz' | 'homework' | 'note' | 'timeblock'>(defaultType);

  // Common Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(BAC_SUBJECTS[0].name);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (activeType === 'task') {
      onAddTask({
        title: title.trim(),
        subject,
        dueDate,
        priority,
        status: 'todo',
        type: 'revision',
        description: notes.trim(),
        progressPercentage: 0,
      });
    } else if (activeType === 'quiz') {
      onAddQuiz({
        title: title.trim(),
        subject,
        date: dueDate,
        time: '09:00',
        targetScore: 18,
        totalScore: 20,
        topics: ['Revision Topics'],
        status: 'upcoming',
        difficulty: 'medium',
        priority,
        notes: notes.trim(),
      });
    } else if (activeType === 'homework') {
      onAddHomework({
        title: title.trim(),
        subject,
        dueDate,
        dueTime: '20:00',
        priority,
        progressPercentage: 0,
        status: 'pending',
        isProjectSubmission: false,
        notes: notes.trim(),
        checklist: [{ id: `hwc-${Date.now()}`, text: 'Complete assignment tasks', completed: false }],
      });
    } else if (activeType === 'note') {
      onAddNote({
        title: title.trim(),
        subject,
        date: dueDate,
        summary: notes.trim() || title.trim(),
        content: `### ${title}\n- Notes & summary here...`,
        tags: [`#${subject.split(' ')[0]}`],
        keyFormulas: [],
      });
    } else if (activeType === 'timeblock') {
      onAddTimeBlock({
        dayOfWeek: new Date().getDay(),
        startTime: '08:00',
        endTime: '10:00',
        title: title.trim(),
        subject,
        isCompleted: false,
        type: 'study',
        notes: notes.trim(),
      });
    }

    chimePlayer.playChime('add');
    onClose();
    setTitle('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold font-['Outfit'] text-slate-900 dark:text-white">
              Quick Add Item
            </h2>
          </div>
          <button
            onClick={() => { chimePlayer.playChime('modal_close'); onClose(); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Type Selector Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {[
            { id: 'task', label: 'Task', icon: CheckSquare },
            { id: 'quiz', label: 'Quiz', icon: HelpCircle },
            { id: 'homework', label: 'HW', icon: BookOpen },
            { id: 'note', label: 'Note', icon: FileText },
            { id: 'timeblock', label: 'Block', icon: CalendarClock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveType(tab.id as any)}
                className={`py-1.5 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-0.5 transition-colors ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title / Activity Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Solve Trigonometry Past Papers"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
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
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="urgent">🟣 Urgent</option>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Due / Scheduled Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief details or targets..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 font-semibold shadow-md shadow-indigo-500/20"
            >
              Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
