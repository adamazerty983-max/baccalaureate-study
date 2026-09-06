import {
  ActivitySticker,
  AppSettings,
  FullAppData,
  GoalItem,
  GradeItem,
  HabitItem,
  HomeworkItem,
  LectureNote,
  LessonRevisionItem,
  QuizItem,
  TaskItem,
  TimeBlock,
  WeeklyReviewData,
  MonthlyReviewData,
} from '../types';

export const BAC_SUBJECTS = [
  { id: 'math', name: 'Mathématiques', color: 'from-teal-500 to-emerald-600', dotColor: 'bg-emerald-500', hexColor: '#1A5F5F', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', coefficient: 7 },
  { id: 'french', name: 'Français', color: 'from-amber-600 to-orange-700', dotColor: 'bg-amber-500', hexColor: '#C4622D', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700', coefficient: 4 },
  { id: 'arabic', name: 'Arabe', color: 'from-cyan-500 to-blue-600', dotColor: 'bg-cyan-500', hexColor: '#7B3FA0', badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700', coefficient: 3 },
  { id: 'english', name: 'Anglais', color: 'from-blue-600 to-indigo-700', dotColor: 'bg-blue-500', hexColor: '#37474F', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700', coefficient: 3 },
  { id: 'philosophy', name: 'Philosophie', color: 'from-purple-600 to-pink-700', dotColor: 'bg-purple-500', hexColor: '#1565C0', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-700', coefficient: 2 },
  { id: 'islamic_studies', name: 'Éducation Islamique', color: 'from-rose-500 to-pink-600', dotColor: 'bg-rose-500', hexColor: '#2A7A5A', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700', coefficient: 2 },
  { id: 'biology', name: 'Sciences de la Vie et de la Terre', color: 'from-green-600 to-emerald-700', dotColor: 'bg-green-500', hexColor: '#558B2F', badgeColor: 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300 border-green-300 dark:border-green-700', coefficient: 5 },
  { id: 'physics', name: 'Physique Chimie', color: 'from-red-500 to-orange-600', dotColor: 'bg-red-500', hexColor: '#00838F', badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-700', coefficient: 7 },
  { id: 'history_geo', name: 'Histoire & Géographie', color: 'from-yellow-600 to-amber-700', dotColor: 'bg-yellow-500', hexColor: '#8D4E2A', badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', coefficient: 2 },
  { id: 'economics', name: 'Économie & Sociologie', color: 'from-sky-500 to-blue-700', dotColor: 'bg-sky-500', hexColor: '#2E7D32', badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-700', coefficient: 4 },
  { id: 'computer_science', name: 'Informatique', color: 'from-indigo-500 to-violet-700', dotColor: 'bg-indigo-500', hexColor: '#0277BD', badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', coefficient: 3 },
  { id: 'general', name: 'Révision Générale', color: 'from-slate-500 to-gray-700', dotColor: 'bg-slate-400', hexColor: '#C4622D', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700', coefficient: 2 },
];

export const ACTIVITY_STICKERS: ActivitySticker[] = [
  {
    type: 'praying',
    label: 'Prière',
    iconName: 'MoonStar',
    emoji: '🕌',
    defaultDurationMinutes: 20,
    colorClass: {
      bg: 'bg-indigo-950/80',
      border: 'border-indigo-500/50',
      text: 'text-indigo-200',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
      glow: 'shadow-indigo-500/20',
    },
    description: 'Prière et pause spirituelle',
  },
  {
    type: 'rest',
    label: 'Repos',
    iconName: 'Coffee',
    emoji: '☕',
    defaultDurationMinutes: 20,
    colorClass: {
      bg: 'bg-amber-950/80',
      border: 'border-amber-500/50',
      text: 'text-amber-200',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
      glow: 'shadow-amber-500/20',
    },
    description: 'Pause de repos et détente',
  },
  {
    type: 'pause',
    label: 'Pause',
    iconName: 'Clock',
    emoji: '⏸️',
    defaultDurationMinutes: 15,
    colorClass: {
      bg: 'bg-yellow-950/80',
      border: 'border-yellow-500/50',
      text: 'text-yellow-200',
      badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40',
      glow: 'shadow-yellow-500/20',
    },
    description: 'Courte pause de respiration',
  },
  {
    type: 'repas',
    label: 'Repas',
    iconName: 'Utensils',
    emoji: '🍴',
    defaultDurationMinutes: 45,
    colorClass: {
      bg: 'bg-amber-900/80',
      border: 'border-amber-400/50',
      text: 'text-amber-100',
      badge: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
      glow: 'shadow-amber-500/20',
    },
    description: 'Déjeuner, dîner ou collation nutritive',
  },
  {
    type: 'walking',
    label: 'Marche',
    iconName: 'Footprints',
    emoji: '🚶',
    defaultDurationMinutes: 30,
    colorClass: {
      bg: 'bg-emerald-950/80',
      border: 'border-emerald-500/50',
      text: 'text-emerald-200',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
      glow: 'shadow-emerald-500/20',
    },
    description: 'Marche aérée et oxygénation',
  },
  {
    type: 'sport',
    label: 'Sport',
    iconName: 'Dumbbell',
    emoji: '🏋️',
    defaultDurationMinutes: 45,
    colorClass: {
      bg: 'bg-teal-950/80',
      border: 'border-teal-500/50',
      text: 'text-teal-200',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-400/40',
      glow: 'shadow-teal-500/20',
    },
    description: 'Activité sportive et exercices',
  },
  {
    type: 'perso',
    label: 'Perso',
    iconName: 'User',
    emoji: '👤',
    defaultDurationMinutes: 30,
    colorClass: {
      bg: 'bg-pink-950/80',
      border: 'border-pink-500/50',
      text: 'text-pink-200',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-400/40',
      glow: 'shadow-pink-500/20',
    },
    description: 'Temps personnel ou famille',
  },
  {
    type: 'sleeping',
    label: 'Sommeil',
    iconName: 'Moon',
    emoji: '🌙',
    defaultDurationMinutes: 480,
    colorClass: {
      bg: 'bg-purple-950/80',
      border: 'border-purple-500/50',
      text: 'text-purple-200',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
      glow: 'shadow-purple-500/20',
    },
    description: 'Sommeil récupérateur nocturne',
  },
];

export const INITIAL_SETTINGS: AppSettings = {
  language: 'fr',
  theme: 'light',
  fontSize: 'base',
  baccalaureateDate: '2027-06-10T08:00:00',
  academicYearStartDate: '2026-09-07T08:00:00',
  baccalaureateTrack: 'Sciences Mathématiques & Expérimentales',
  studentName: '',
  cloudSyncCode: '',
  lastSyncedAt: null,
  chimeSoundEnabled: true,
  soundVolume: 0.65,
  autoSave: true,
  favorites: ['quizzes', 'homework', 'planner'],
};

export const INITIAL_TASKS: TaskItem[] = [];

export const INITIAL_QUIZZES: QuizItem[] = [];

export const INITIAL_HOMEWORK: HomeworkItem[] = [];

export const INITIAL_NOTES: LectureNote[] = [];

export const INITIAL_TIME_BLOCKS: TimeBlock[] = [];

export const INITIAL_GRADES: GradeItem[] = [];

export const INITIAL_GOALS: GoalItem[] = [];

export const INITIAL_LESSONS: LessonRevisionItem[] = [];

export const INITIAL_HABITS: HabitItem[] = [];

export const INITIAL_WEEKLY_REVIEWS: Record<string, WeeklyReviewData> = {};

export const INITIAL_MONTHLY_REVIEWS: Record<string, MonthlyReviewData> = {};
