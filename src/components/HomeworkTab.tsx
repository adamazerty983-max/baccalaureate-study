import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
  Edit2,
  FileCheck2,
  CheckSquare,
  Square,
  FolderGit2,
} from 'lucide-react';
import { HomeworkItem, PriorityLevel } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { BAC_SUBJECTS } from '../utils/constants';
import { chimePlayer } from '../utils/audio';

interface HomeworkTabProps {
  homework: HomeworkItem[];
  onAddHomework: (hw: Omit<HomeworkItem, 'id' | 'createdAt'>) => void;
  onUpdateHomework: (hw: HomeworkItem) => void;
  onDeleteHomework: (hwId: string) => void;
  onToggleStatus: (hwId: string) => void;
}

export const HomeworkTab: React.FC<HomeworkTabProps> = ({
  homework,
  onAddHomework,
  onUpdateHomework,
  onDeleteHomework,
  onToggleStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [filterProjectsOnly, setFilterProjectsOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHw, setEditingHw] = useState<HomeworkItem | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState(BAC_SUBJECTS[0].name);
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('20:00');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('high');
  const [formProgress, setFormProgress] = useState(0);
  const [formIsProject, setFormIsProject] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [formChecklistRaw, setFormChecklistRaw] = useState('');

  const openNewModal = () => {
    chimePlayer.playChime('modal_open');
    setEditingHw(null);
    setFormTitle('');
    setFormSubject(BAC_SUBJECTS[0].name);
    setFormDueDate(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));
    setFormDueTime('20:00');
    setFormPriority('high');
    setFormProgress(0);
    setFormIsProject(false);
    setFormNotes('');
    setFormChecklistRaw('Read problem guidelines\nDraft draft solution\nVerify final calculations');
    setIsModalOpen(true);
  };

  const openEditModal = (hw: HomeworkItem) => {
    chimePlayer.playChime('modal_open');
    setEditingHw(hw);
    setFormTitle(hw.title);
    setFormSubject(hw.subject);
    setFormDueDate(hw.dueDate);
    setFormDueTime(hw.dueTime || '20:00');
    setFormPriority(hw.priority);
    setFormProgress(hw.progressPercentage);
    setFormIsProject(hw.isProjectSubmission);
    setFormNotes(hw.notes || '');
    setFormChecklistRaw(hw.checklist.map((c) => c.text).join('\n'));
    setIsModalOpen(true);
  };

  const handleSaveHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const checklistItems = formChecklistRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, idx) => {
        const existing = editingHw?.checklist.find((c) => c.text === text);
        return {
          id: existing?.id || `hwc-${Date.now()}-${idx}`,
          text,
          completed: existing?.completed || false,
        };
      });

    if (editingHw) {
      onUpdateHomework({
        ...editingHw,
        title: formTitle.trim(),
        subject: formSubject,
        dueDate: formDueDate,
        dueTime: formDueTime,
        priority: formPriority,
        progressPercentage: Number(formProgress),
        isProjectSubmission: formIsProject,
        notes: formNotes.trim(),
        checklist: checklistItems,
      });
    } else {
      onAddHomework({
        title: formTitle.trim(),
        subject: formSubject,
        dueDate: formDueDate || new Date().toISOString().slice(0, 10),
        dueTime: formDueTime,
        priority: formPriority,
        progressPercentage: Number(formProgress),
        status: Number(formProgress) === 100 ? 'submitted' : 'in_progress',
        isProjectSubmission: formIsProject,
        notes: formNotes.trim(),
        checklist: checklistItems,
      });
    }

    chimePlayer.playChime('add');
    setIsModalOpen(false);
  };

  // Toggle individual checklist item inside a homework card
  const handleToggleChecklistItem = (hw: HomeworkItem, checkId: string) => {
    const updatedChecklist = hw.checklist.map((item) =>
      item.id === checkId ? { ...item, completed: !item.completed } : item
    );

    const completedCount = updatedChecklist.filter((c) => c.completed).length;
    const newProgress =
      updatedChecklist.length > 0 ? Math.round((completedCount / updatedChecklist.length) * 100) : hw.progressPercentage;

    const newStatus = newProgress === 100 ? 'submitted' : newProgress > 0 ? 'in_progress' : 'pending';

    onUpdateHomework({
      ...hw,
      checklist: updatedChecklist,
      progressPercentage: newProgress,
      status: newStatus,
    });

    if (newProgress === 100) {
      chimePlayer.playChime('complete');
    } else {
      chimePlayer.playChime('click');
    }
  };

  const filteredHomework = homework.filter((hw) => {
    const matchesSearch =
      hw.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hw.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hw.notes && hw.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSubject = selectedSubject === 'all' || hw.subject === selectedSubject;
    const matchesStatus = selectedStatus === 'all' || hw.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || hw.priority === selectedPriority;
    const matchesProjects = !filterProjectsOnly || hw.isProjectSubmission;

    return matchesSearch && matchesSubject && matchesStatus && matchesPriority && matchesProjects;
  });

  const getSubjectBadge = (subjectName: string) => {
    const found = BAC_SUBJECTS.find((s) => s.name.toLowerCase() === subjectName.toLowerCase());
    return (
      found?.badgeColor ||
      'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    );
  };

  const getDueStatus = (dueDateStr: string) => {
    const target = new Date(dueDateStr).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return { label: 'Overdue', color: 'text-rose-600 dark:text-rose-400 font-bold' };
    if (diff === 0) return { label: 'Due Today', color: 'text-amber-600 dark:text-amber-400 font-bold' };
    if (diff === 1) return { label: 'Due Tomorrow', color: 'text-amber-500 font-semibold' };
    return { label: `Due in ${diff} days`, color: 'text-slate-500 dark:text-slate-400' };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-slate-900 dark:text-white">
              Homework, Deadlines & Important Dates
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Keep track of homework assignments, project submission deadlines, interactive checklist milestones, and completion rates.
          </p>
        </div>

        <button
          id="add-homework-btn"
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-95 transition-all shadow-sm shadow-rose-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Homework Deadline</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assignments or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
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
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted / Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Quick Filter: Projects Only */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setFilterProjectsOnly(!filterProjectsOnly)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${filterProjectsOnly
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Show Term Projects Only ({homework.filter((h) => h.isProjectSubmission).length})</span>
          </button>
        </div>
      </div>

      {/* Homework Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredHomework.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">No homework or deadlines match your criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Add a new homework deadline to start organizing!</p>
          </div>
        ) : (
          filteredHomework.map((hw) => {
            const isSubmitted = hw.status === 'submitted';
            const dueInfo = getDueStatus(hw.dueDate);

            return (
              <div
                key={hw.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${isSubmitted
                    ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                    : hw.isProjectSubmission
                      ? 'bg-gradient-to-br from-white via-rose-50/20 to-white dark:from-slate-900 dark:via-rose-950/20 dark:to-slate-900 border-rose-200 dark:border-rose-900 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PriorityBadge priority={hw.priority} />
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getSubjectBadge(
                          hw.subject
                        )}`}
                      >
                        {hw.subject}
                      </span>
                      {hw.isProjectSubmission && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 flex items-center gap-1">
                          <FolderGit2 className="w-3 h-3" /> Project
                        </span>
                      )}
                    </div>

                    <span className={`text-xs ${dueInfo.color}`}>{dueInfo.label}</span>
                  </div>

                  {/* Title & Notes */}
                  <h3
                    className={`text-base font-bold font-['Outfit'] ${isSubmitted
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-900 dark:text-white'
                      }`}
                  >
                    {hw.title}
                  </h3>

                  {hw.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {hw.notes}
                    </p>
                  )}

                  {/* Interactive Checklist */}
                  {hw.checklist && hw.checklist.length > 0 && (
                    <div className="mt-3 space-y-1.5 bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Checklist Milestones ({hw.checklist.filter((c) => c.completed).length}/
                        {hw.checklist.length})
                      </span>
                      {hw.checklist.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleToggleChecklistItem(hw, item.id)}
                          className="w-full flex items-center gap-2 text-left text-xs py-0.5 group focus:outline-none"
                        >
                          {item.completed ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                          )}
                          <span
                            className={`truncate ${item.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            {item.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Progress Bar & Slider */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                      <span>Completion Progress</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {hw.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${hw.progressPercentage === 100
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-rose-500 to-indigo-500'
                          }`}
                        style={{ width: `${hw.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {hw.dueDate} {hw.dueTime ? `at ${hw.dueTime}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onToggleStatus(hw.id);
                        if (!isSubmitted) {
                          chimePlayer.playChime('complete');
                        } else {
                          chimePlayer.playChime('uncheck');
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${isSubmitted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                        }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSubmitted ? 'Submitted' : 'Submit Done'}</span>
                    </button>

                    <button
                      onClick={() => openEditModal(hw)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        chimePlayer.playChime('delete');
                        onDeleteHomework(hw.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Homework Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
            {/* Header - Fixed & always visible */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
              <h2 className="text-base sm:text-lg font-bold font-['Outfit'] text-slate-900 dark:text-white">
                {editingHw ? 'Edit Homework / Deadline' : 'Add New Homework & Deadline'}
              </h2>
              <button
                type="button"
                onClick={() => { chimePlayer.playChime('modal_close'); setIsModalOpen(false); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveHomework} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto p-4 sm:p-5 space-y-3 flex-1 text-xs sm:text-sm">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assignment / Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physics Mechanics Problem Set #5"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                      Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Due Time
                    </label>
                    <input
                      type="time"
                      value={formDueTime}
                      onChange={(e) => setFormDueTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Major Project Submission Toggle */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="project-checkbox"
                    checked={formIsProject}
                    onChange={(e) => setFormIsProject(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500 cursor-pointer"
                  />
                  <label
                    htmlFor="project-checkbox"
                    className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
                  >
                    This is a Major Term Project Submission Deadline (Special Focus)
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Progress Percentage
                    </label>
                    <span className="font-bold text-rose-500 font-mono text-xs">{formProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formProgress}
                    onChange={(e) => setFormProgress(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Checklist Items (One per line)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Part 1: Theoretical study&#10;Part 2: Numerical application"
                      value={formChecklistRaw}
                      onChange={(e) => setFormChecklistRaw(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none resize-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Notes & Requirements
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Guidelines, file upload instructions..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none resize-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Footer - Fixed & always visible at bottom */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
                <button
                  type="button"
                  onClick={() => { chimePlayer.playChime('modal_close'); setIsModalOpen(false); }}
                  className="px-4 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-xl text-white bg-rose-600 hover:bg-rose-500 font-semibold shadow-md shadow-rose-500/20 cursor-pointer text-xs sm:text-sm"
                >
                  {editingHw ? 'Save Changes' : 'Create Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
