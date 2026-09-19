import React, { useState, useMemo, useDeferredValue, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Link as LinkIcon,
  Bell,
  Trash2,
  Edit2,
  Tag,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Lightbulb,
} from 'lucide-react';
import { HomeworkItem, LectureNote } from '../../types';
import { BAC_SUBJECTS } from '../../utils/constants';

interface LectureNotesTabProps {
  notes: LectureNote[];
  homework: HomeworkItem[];
  onAddNote: (note: Omit<LectureNote, 'id' | 'createdAt'>) => void;
  onUpdateNote: (note: LectureNote) => void;
  onDeleteNote: (noteId: string) => void;
}

interface NoteListItemProps {
  note: LectureNote;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const NoteListItem: React.FC<NoteListItemProps> = React.memo(({
  note,
  isSelected,
  onSelect,
}) => {
  const hasReminder = Boolean(note.linkedSubmissionDeadlineId || note.reviewReminderDate);

  return (
    <div
      onClick={() => onSelect(note.id)}
      className={`cursor-pointer p-4 rounded-xl border transition-all text-left group ${
        isSelected
          ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-xs'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
          {note.subject}
        </span>
        <span className="text-[10px] text-slate-400">{note.date}</span>
      </div>

      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {note.title}
      </h3>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
        {note.summary || note.content}
      </p>

      {hasReminder && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
          <Bell className="w-3 h-3" />
          <span>Project Deadline Linked</span>
        </div>
      )}
    </div>
  );
});

export const LectureNotesTab: React.FC<LectureNotesTabProps> = ({
  notes,
  homework,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<LectureNote | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState(BAC_SUBJECTS[0].name);
  const [formDate, setFormDate] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formFormulas, setFormFormulas] = useState('');
  const [formLinkedProject, setFormLinkedProject] = useState('');
  const [formReviewReminder, setFormReviewReminder] = useState('');

  // Collect all unique tags (memoized)
  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags || []))), [notes]);

  // Available project submissions for linking (memoized)
  const projectDeadlines = useMemo(
    () => homework.filter((h) => h.isProjectSubmission || h.status !== 'submitted'),
    [homework]
  );

  const openNewModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormSubject(BAC_SUBJECTS[0].name);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormSummary('');
    setFormContent('### 1. Main Concept\n- Point 1\n- Point 2\n\n### 2. Baccalaureate Application\n- Key problem type');
    setFormTags('#Calculus, #Mechanics');
    setFormFormulas('f\'(x) = lim (f(x+h) - f(x))/h');
    setFormLinkedProject(projectDeadlines[0]?.id || '');
    setFormReviewReminder(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  const openEditModal = (note: LectureNote) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormSubject(note.subject);
    setFormDate(note.date);
    setFormSummary(note.summary);
    setFormContent(note.content);
    setFormTags(note.tags.join(', '));
    setFormFormulas(note.keyFormulas.join('\n'));
    setFormLinkedProject(note.linkedSubmissionDeadlineId || '');
    setFormReviewReminder(note.reviewReminderDate || '');
    setIsModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const formulasArray = formFormulas
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    if (editingNote) {
      onUpdateNote({
        ...editingNote,
        title: formTitle.trim(),
        subject: formSubject,
        date: formDate,
        summary: formSummary.trim(),
        content: formContent.trim(),
        tags: tagsArray,
        keyFormulas: formulasArray,
        linkedSubmissionDeadlineId: formLinkedProject || undefined,
        reviewReminderDate: formReviewReminder || undefined,
      });
    } else {
      const newId = `note-${Date.now()}`;
      onAddNote({
        title: formTitle.trim(),
        subject: formSubject,
        date: formDate || new Date().toISOString().slice(0, 10),
        summary: formSummary.trim(),
        content: formContent.trim(),
        tags: tagsArray,
        keyFormulas: formulasArray,
        linkedSubmissionDeadlineId: formLinkedProject || undefined,
        reviewReminderDate: formReviewReminder || undefined,
      });
      setActiveNoteId(newId);
    }

    setIsModalOpen(false);
  };

  const deferredSearch = useDeferredValue(searchTerm);

  const filteredNotes = useMemo(() => {
    const searchLower = deferredSearch.trim().toLowerCase();
    return notes.filter((n) => {
      const matchesSearch =
        !searchLower ||
        n.title.toLowerCase().includes(searchLower) ||
        n.summary.toLowerCase().includes(searchLower) ||
        n.content.toLowerCase().includes(searchLower) ||
        n.subject.toLowerCase().includes(searchLower);

      const matchesSubject = selectedSubject === 'all' || n.subject === selectedSubject;
      const matchesTag = selectedTag === 'all' || n.tags.includes(selectedTag);

      return matchesSearch && matchesSubject && matchesTag;
    });
  }, [notes, deferredSearch, selectedSubject, selectedTag]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || filteredNotes[0] || notes[0],
    [notes, activeNoteId, filteredNotes]
  );

  // Linked Project Info for Active Note
  const linkedProjectInfo = useMemo(
    () =>
      selectedNote?.linkedSubmissionDeadlineId
        ? homework.find((h) => h.id === selectedNote.linkedSubmissionDeadlineId)
        : null,
    [selectedNote, homework]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-slate-900 dark:text-white">
              Lecture Notes & Project Reminders
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Capture lecture sessions, formulas, summaries, and connect them directly to upcoming project submission deadlines.
          </p>
        </div>

        <button
          id="add-note-btn"
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-95 transition-all shadow-sm shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Lecture Note</span>
        </button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Notes List & Filter Bar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes & formulas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Subject Selector */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">All Subjects ({notes.length})</option>
              {BAC_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Tag Filter Chips */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedTag('all')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                    selectedTag === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Tags
                </button>
                {allTags.slice(0, 5).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes Navigation List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs p-4">
                No lecture notes found.
              </div>
            ) : (
              filteredNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isSelected={note.id === (selectedNote?.id || '')}
                  onSelect={setActiveNoteId}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Note Reader & Linked Project Submission Alert (8 cols) */}
        <div className="lg:col-span-8">
          {selectedNote ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                      {selectedNote.subject}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {selectedNote.date}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-extrabold font-['Outfit'] text-slate-900 dark:text-white">
                    {selectedNote.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditModal(selectedNote)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Note</span>
                  </button>

                  <button
                    onClick={() => onDeleteNote(selectedNote.id)}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* INTEGRATED PROJECT SUBMISSION REMINDER CARD */}
              {linkedProjectInfo ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-indigo-500/10 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                          Integrated Project Reminder
                        </span>
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                          Due: {linkedProjectInfo.dueDate}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {linkedProjectInfo.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Progress: {linkedProjectInfo.progressPercentage}% • Status:{' '}
                        {linkedProjectInfo.status}
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedNote.reviewReminderDate ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <Bell className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Spaced Repetition Review Reminder scheduled for:{' '}
                    <strong>{selectedNote.reviewReminderDate}</strong>
                  </span>
                </div>
              ) : null}

              {/* Summary / Key Takeaway Block */}
              {selectedNote.summary && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Executive Summary & Baccalaureate Context</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedNote.summary}
                  </p>
                </div>
              )}

              {/* Key Formulas / Definitions Spotlight */}
              {selectedNote.keyFormulas && selectedNote.keyFormulas.length > 0 && (
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                    <Code2 className="w-4 h-4" />
                    <span>Key Formulas & Theorem Anchors</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedNote.keyFormulas.map((formula, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200 border border-indigo-100 dark:border-indigo-900 shadow-xs"
                      >
                        {formula}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Lecture Note Content */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Lecture Session Content
                </h3>
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                  {selectedNote.content}
                </div>
              </div>

              {/* Tags footer */}
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {selectedNote.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-semibold">Select a note on the left or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold font-['Outfit'] text-slate-900 dark:text-white">
                {editingNote ? 'Edit Lecture Note' : 'Add New Lecture Note'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lecture Title / Subject Topic *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Newton Laws of Motion & Orbital Mechanics"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
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
                    Lecture Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* INTEGRATED PROJECT SUBMISSION SELECTOR */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                  <Bell className="w-3.5 h-3.5 text-rose-500" />
                  <span>Link with Upcoming Project Submission Deadline (Integrated Reminder)</span>
                </div>
                <select
                  value={formLinkedProject}
                  onChange={(e) => setFormLinkedProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">-- No linked project submission --</option>
                  {projectDeadlines.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title} (Due: {h.dueDate} - {h.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Summary / Key Takeaway
                </label>
                <input
                  type="text"
                  placeholder="Concise 1-2 sentence core concept recap..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Key Formulas (One per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="v(t) = a * t + v0&#10;E = m * c^2"
                  value={formFormulas}
                  onChange={(e) => setFormFormulas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Notes Content
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Lecture notes, proofs, theorem breakdowns, examples..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none resize-y text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="#Mechanics, #Analysis"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Review Reminder Date
                  </label>
                  <input
                    type="date"
                    value={formReviewReminder}
                    onChange={(e) => setFormReviewReminder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 font-semibold shadow-md shadow-indigo-500/20"
                >
                  {editingNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
