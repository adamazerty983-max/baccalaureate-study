export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export type TaskType = 'exam' | 'homework' | 'quiz' | 'revision' | 'project' | 'uncommon';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export type AppLanguage = 'fr' | 'ar' | 'en';

export interface TaskItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: PriorityLevel;
  status: TaskStatus;
  type: TaskType;
  description?: string;
  isUncommonDeadline?: boolean;
  progressPercentage?: number;
  reminderDate?: string;
  checklist?: { id: string; text: string; completed: boolean }[];
  createdAt: string;
  completedAt?: string;
  /** Item-level change stamp: makes deliberate toggles/edits beat stale whole-blob writers. */
  updatedAt?: string;
}

export interface QuizItem {
  id: string;
  title: string;
  subject: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes?: number;
  room?: string;
  targetScore: number; // e.g. 18 / 20
  totalScore: number; // e.g. 20 or 100
  actualScore?: number;
  topics: string[];
  status: 'upcoming' | 'completed' | 'revision_needed';
  difficulty: 'easy' | 'medium' | 'hard';
  priority: PriorityLevel;
  notes?: string;
  reminderDate?: string;
  createdAt: string;
}

export interface HomeworkItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  priority: PriorityLevel;
  progressPercentage: number; // 0 - 100
  status: 'pending' | 'in_progress' | 'submitted';
  isProjectSubmission: boolean;
  notes?: string;
  checklist: { id: string; text: string; completed: boolean }[];
  createdAt: string;
}

export interface LectureNote {
  id: string;
  title: string;
  subject: string;
  date: string;
  content: string;
  summary: string;
  color?: string; // 'ny' | 'nb' | 'ng2' | 'npk' | 'no' | 'ntl'
  tags: string[];
  keyFormulas: string[];
  linkedSubmissionDeadlineId?: string;
  reviewReminderDate?: string;
  lastReviewedAt?: string;
  createdAt: string;
}

export type StickerActivityType =
  | 'praying'
  | 'rest'
  | 'pause'
  | 'repas'
  | 'walking'
  | 'sport'
  | 'perso'
  | 'sleeping'
  | 'nap';

export interface ActivitySticker {
  type: StickerActivityType;
  label: string;
  iconName: string;
  emoji: string;
  defaultDurationMinutes: number;
  colorClass: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    glow: string;
  };
  description: string;
}

export interface TimeBlock {
  id: string;
  dayOfWeek: number; // 0: Sunday, 1: Monday, ... 6: Saturday
  dateKey?: string; // Optional specific date e.g. "2026-08-29"
  startTime: string; // HH:mm (e.g. "08:00")
  endTime: string; // HH:mm (e.g. "09:30")
  title: string;
  subject: string;
  isCompleted: boolean;
  type: 'study' | 'sticker_activity';
  stickerType?: StickerActivityType;
  notes?: string;
  color?: string;
  createdAt?: string;
  completedAt?: string;
  /** Item-level change stamp: makes deliberate toggles/edits beat stale whole-blob writers. */
  updatedAt?: string;
  /** Present only on a render-time merged view of two adjacent same-subject blocks. */
  _merged?: boolean;
}

export interface GradeItem {
  id: string;
  subject: string;
  grade: number; // 0 - 20
  coeff: number; // 1, 2, 3, etc.
  date: string;
  notes?: string;
}

export interface GoalItem {
  id: string;
  title: string;
  done: boolean;
  targetDate?: string;
  createdAt: string;
}

export interface LessonItem {
  id: string;
  title: string;
  subject: string;
  stage: number; // 1 (J+1), 2 (J+3), 3 (J+7), 4 (J+14), 5 (J+30)
  masteryLevel: number; // 0 - 100%
  lastReviewed: string; // YYYY-MM-DD
  nextReviewDate: string; // YYYY-MM-DD
  isMemorized: boolean;
  notes?: string;
  createdAt: string;
}

export type LessonRevisionItem = LessonItem;

export interface HabitItem {
  id: string;
  name: string;
  subject?: string;
  icon: string;
  streak: number;
  best?: number;
  lastDate?: string;
  history: string[]; // List of YYYY-MM-DD dates completed
  frequency?: 'daily' | 'weekdays' | 'custom';
}

export interface WeeklyReviewData {
  wentWell: string;
  wentBad: string;
  improve: string;
  targetHours: number;
  prioritySubj: string;
  savedAt: number;
}

export interface MonthlyReviewData {
  wentWell: string;
  challenges: string;
  nextGoals: string;
  targetHours: number;
  prioritySubj: string;
  savedAt: number;
}

export interface AchievementDef {
  id: string;
  color: string;
  glow: string;
  icon: string;
  labels: { fr: string; ar: string; en: string };
  desc: { fr: string; ar: string; en: string };
  goal: number;
  unit: string;
  achType: 'daily' | 'cumulative';
}

export type ThemeMode = 'light' | 'dark' | 'system';
/**
 * Visual skin of the whole interface.
 * - 'classic' : the original Linear/Bento look (default)
 * - 'mybac'   : the cream + zellige skin imported from the MyBac Tracker app
 * The user switches between them from Settings ▸ Style de l'interface.
 */
export type UiStyleMode = 'classic' | 'mybac';
export type FontSizeOption = 'sm' | 'base' | 'lg' | 'xl';

export type MainTabType =
  | 'dashboard'
  | 'tasks'
  | 'quizzes'
  | 'homework'
  | 'notes'
  | 'timeblocking'
  | 'revision'
  | 'average'
  | 'goals'
  | 'habits'
  | 'review'
  | 'settings';

export type NotificationModule = 'tasks' | 'quizzes' | 'homework' | 'lessons' | 'goals' | 'habits';

export interface NotificationPreferences {
  enabled: boolean;
  modules: {
    tasks: boolean;
    quizzes: boolean;
    homework: boolean;
    lessons: boolean;
    goals: boolean;
    habits: boolean;
  };
  leadTimeMinutes: number; // e.g. 15, 30, 60, 120
  habitReminderTime: string; // HH:mm e.g. "20:00"
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm e.g. "23:00"
    end: string; // HH:mm e.g. "07:00"
  };
}

export interface InAppNotification {
  id: string;
  type: 'tasks' | 'quizzes' | 'homework' | 'lessons' | 'goals' | 'habits' | 'system';
  title: string;
  message: string;
  timestamp: string;
  tab: MainTabType;
  itemId?: string;
  read: boolean;
}

export interface AppSettings {
  language: AppLanguage;
  theme: ThemeMode;
  uiStyle: UiStyleMode;
  fontSize: FontSizeOption;
  baccalaureateDate: string; // ISO format e.g. "2026-06-10T08:00:00"
  academicYearStartDate: string; // e.g. "2026-09-01T08:00:00"
  baccalaureateTrack: string;
  studentName: string;
  cloudSyncCode: string;
  lastSyncedAt: string | null;
  chimeSoundEnabled: boolean;
  soundVolume: number; // 0 to 1
  autoSave: boolean;
  favorites: string[];
  customCoefficients?: Record<string, number>;
  notifications?: NotificationPreferences;
}

export interface FullAppData {
  version: number;
  settings: AppSettings;
  tasks: TaskItem[];
  quizzes: QuizItem[];
  homework: HomeworkItem[];
  notes: LectureNote[];
  timeBlocks: TimeBlock[];
  grades: GradeItem[];
  goals: GoalItem[];
  lessons: LessonItem[];
  habits: HabitItem[];
  habitLogs?: Record<string, Record<string, boolean>>; // dateKey -> habitId -> boolean
  weeklyReviews: Record<string, WeeklyReviewData>; // weekMondayKey -> WeeklyReviewData
  monthlyReviews?: Record<string, MonthlyReviewData>; // monthKey (YYYY-MM) -> MonthlyReviewData
  updatedAt: string;
}
