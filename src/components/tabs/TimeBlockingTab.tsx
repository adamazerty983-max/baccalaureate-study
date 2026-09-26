import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Check,
  Clock,
  Trash2,
  X,
  Zap,
  Sliders,
  ChevronDown,
  MoonStar,
  Coffee,
  Utensils,
  Footprints,
  Dumbbell,
  User,
  Moon,
  Volume2,
  Calendar,
  Layers,
  ArrowRight,
  BookOpen,
  GripVertical,
  Pencil,
  ArrowUp,
  ArrowDown,
  Move,
  Plus,
  AlertCircle,
  Timer,
  Flame,
  CheckCircle,
  Brain,
  RotateCcw,
} from 'lucide-react';
import { ActivitySticker, AppLanguage, StickerActivityType, TaskItem, TimeBlock } from '../../types';
import { ACTIVITY_STICKERS, BAC_SUBJECTS } from '../../utils/constants';
import { useToast } from '../shared/Toast';
import { chimePlayer } from '../../utils/audio';
import { calculateDailyStreak, getLocalDateStr } from '../../utils/streak';

interface TimeBlockingTabProps {
  timeBlocks: TimeBlock[];
  tasks?: TaskItem[];
  language?: AppLanguage;
  onAddTimeBlock: (block: Omit<TimeBlock, 'id'>) => void;
  onUpdateTimeBlock: (block: TimeBlock) => void;
  onDeleteTimeBlock: (blockId: string) => void;
  onToggleComplete: (blockId: string) => void;
}

// 05:00 to 24:00 (half-hour markers)
export const TIMETABLE_START_HOUR = 5; // 05:00
export const TIMETABLE_END_HOUR = 24; // 24:00 (midnight)
export const SLOT_HEIGHT_PX = 46; // height for 30 minutes (92px per hour)
export const PIXELS_PER_MINUTE = (SLOT_HEIGHT_PX * 2) / 60; // ~1.533 px per minute

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lundi', nameAr: 'الإثنين', short: 'Lun', shortAr: 'إثن' },
  { id: 2, name: 'Mardi', nameAr: 'الثلاثاء', short: 'Mar', shortAr: 'ثلا' },
  { id: 3, name: 'Mercredi', nameAr: 'الأربعاء', short: 'Mer', shortAr: 'أرب' },
  { id: 4, name: 'Jeudi', nameAr: 'الخميس', short: 'Jeu', shortAr: 'خمي' },
  { id: 5, name: 'Vendredi', nameAr: 'الجمعة', short: 'Ven', shortAr: 'جمع' },
  { id: 6, name: 'Samedi', nameAr: 'السبت', short: 'Sam', shortAr: 'سبت' },
  { id: 0, name: 'Dimanche', nameAr: 'الأحد', short: 'Dim', shortAr: 'أحد' },
];

// Generate 30-min markers from 05:00 to 24:00
const TIME_MARKERS: string[] = [];
for (let h = TIMETABLE_START_HOUR; h <= TIMETABLE_END_HOUR; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_MARKERS.push(`${hh}:00`);
  if (h < TIMETABLE_END_HOUR) {
    TIME_MARKERS.push(`${hh}:30`);
  }
}

// Helper to convert time "HH:mm" to total minutes from midnight
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Helper to convert total minutes from midnight to "HH:mm"
const minutesToTime = (minutes: number): string => {
  const safeMins = Math.max(0, Math.min(24 * 60, minutes));
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Helper to format duration string: "2h 45min" or "45 min" or "1h"
const formatDurationLabel = (totalMins: number): string => {
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins} min`;
};

// Helper to compute YYYY-MM-DD dateKey for a dayOfWeek in the current active week
const computeDateKeyForDay = (dayOfWeek: number): string => {
  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday
  const currentMondayOffset = currentDay === 0 ? 6 : currentDay - 1;
  const targetMondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const diffDays = targetMondayOffset - currentMondayOffset;
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diffDays);
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Natural language fast parser for the top input
const parseNaturalLanguageTask = (text: string) => {
  let title = text.trim();
  let subject = '';
  let durationMins = 60;
  let dayOffset = 0; // 0 = today, 1 = tomorrow

  const lower = text.toLowerCase();

  // Match subjects (French and Arabic)
  const ARABIC_SUBJECT_MAP: Record<string, string> = {
    'رياضيات': 'Mathématiques',
    'الرياضيات': 'Mathématiques',
    'فرنسية': 'Français',
    'الفرنسية': 'Français',
    'عربية': 'Arabe',
    'العربية': 'Arabe',
    'إنجليزية': 'Anglais',
    'انجليزية': 'Anglais',
    'الانجليزية': 'Anglais',
    'الإنجليزية': 'Anglais',
    'فلسفة': 'Philosophie',
    'الفلسفة': 'Philosophie',
    'إسلامية': 'Éducation Islamique',
    'اسلامية': 'Éducation Islamique',
    'التربية الإسلامية': 'Éducation Islamique',
    'علوم': 'Sciences de la Vie et de la Terre',
    'svt': 'Sciences de la Vie et de la Terre',
    'فيزياء': 'Physique Chimie',
    'الفيزياء': 'Physique Chimie',
    'كيمياء': 'Physique Chimie',
    'تاريخ': 'Histoire & Géographie',
    'جغرافيا': 'Histoire & Géographie',
    'اجتماعيات': 'Histoire & Géographie',
    'اقتصاد': 'Économie & Sociologie',
    'إعلاميات': 'Informatique',
    'اعلاميات': 'Informatique',
  };

  for (const [arKey, subjName] of Object.entries(ARABIC_SUBJECT_MAP)) {
    if (lower.includes(arKey)) {
      subject = subjName;
      break;
    }
  }

  if (!subject) {
    for (const s of BAC_SUBJECTS) {
      if (lower.includes(s.name.toLowerCase()) || lower.includes(s.id.toLowerCase())) {
        subject = s.name;
        break;
      }
    }
  }

  // Match day
  if (lower.includes('demain') || lower.includes('tomorrow') || lower.includes('غدا') || lower.includes('غداً')) {
    dayOffset = 1;
  }

  // Match duration: "1h30", "2h", "45min", "1h", "45 دقيقة", "ساعة"
  const hMatch = lower.match(/(\d+)\s*h\s*(\d+)?/);
  if (hMatch) {
    const h = parseInt(hMatch[1], 10);
    const m = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    durationMins = h * 60 + m;
  } else {
    const minMatch = lower.match(/(\d+)\s*(?:min|دقيقة)/);
    if (minMatch) {
      durationMins = parseInt(minMatch[1], 10);
    } else if (lower.includes('ساعتين') || lower.includes('ساعتان') || lower.includes('2h')) {
      durationMins = 120;
    } else if (lower.includes('ساعة ونصف') || lower.includes('1h30')) {
      durationMins = 90;
    } else if (lower.includes('ساعة') || lower.includes('1h')) {
      durationMins = 60;
    } else if (lower.includes('نصف ساعة')) {
      durationMins = 30;
    }
  }

  return { title, subject, durationMins, dayOffset };
};

const STICKER_ICONS: Record<string, React.ReactNode> = {
  praying: <MoonStar className="w-3.5 h-3.5 text-indigo-400" />,
  rest: <Coffee className="w-3.5 h-3.5 text-amber-400" />,
  pause: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  repas: <Utensils className="w-3.5 h-3.5 text-amber-300" />,
  walking: <Footprints className="w-3.5 h-3.5 text-emerald-400" />,
  sport: <Dumbbell className="w-3.5 h-3.5 text-teal-400" />,
  perso: <User className="w-3.5 h-3.5 text-pink-400" />,
  sleeping: <Moon className="w-3.5 h-3.5 text-purple-400" />,
};

const STICKER_THEMES: Record<string, { bg: string; border: string; text: string; iconColor: string }> = {
  praying: {
    bg: 'bg-indigo-50/90 dark:bg-indigo-950/40',
    border: 'border-indigo-200/80 dark:border-indigo-800/60',
    text: 'text-indigo-800 dark:text-indigo-200',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  rest: {
    bg: 'bg-amber-50/90 dark:bg-amber-950/40',
    border: 'border-amber-200/80 dark:border-amber-800/60',
    text: 'text-amber-800 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  pause: {
    bg: 'bg-yellow-50/90 dark:bg-yellow-950/40',
    border: 'border-yellow-200/80 dark:border-yellow-800/60',
    text: 'text-yellow-800 dark:text-yellow-200',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  repas: {
    bg: 'bg-orange-50/90 dark:bg-orange-950/40',
    border: 'border-orange-200/80 dark:border-orange-800/60',
    text: 'text-orange-800 dark:text-orange-200',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  walking: {
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    border: 'border-emerald-200/80 dark:border-emerald-800/60',
    text: 'text-emerald-800 dark:text-emerald-200',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  sport: {
    bg: 'bg-teal-50/90 dark:bg-teal-950/40',
    border: 'border-teal-200/80 dark:border-teal-800/60',
    text: 'text-teal-800 dark:text-teal-200',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  perso: {
    bg: 'bg-pink-50/90 dark:bg-pink-950/40',
    border: 'border-pink-200/80 dark:border-pink-800/60',
    text: 'text-pink-800 dark:text-pink-200',
    iconColor: 'text-pink-600 dark:text-pink-400',
  },
  sleeping: {
    bg: 'bg-purple-50/90 dark:bg-purple-950/40',
    border: 'border-purple-200/80 dark:border-purple-800/60',
    text: 'text-purple-800 dark:text-purple-200',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
};

const FALLBACK_STICKER_THEME = {
  bg: 'bg-slate-100 dark:bg-slate-800',
  border: 'border-slate-200 dark:border-slate-700',
  text: 'text-slate-700 dark:text-slate-300',
  iconColor: 'text-slate-600 dark:text-slate-400',
};

// Single source of truth for sticker theming: sticker bar, placed cards and drag ghost
const getStickerTheme = (type?: string) => (type && STICKER_THEMES[type]) || FALLBACK_STICKER_THEME;

interface TimeBlockTheme {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
  dot: string;
}

const getSubjectCardTheme = (subjectName: string): TimeBlockTheme => {
  const s = subjectName?.toLowerCase() || '';
  if (s.includes('math')) {
    return {
      bg: 'bg-teal-50/80 dark:bg-teal-950/35',
      border: 'border-teal-200/80 dark:border-teal-800/50',
      text: 'text-teal-950 dark:text-teal-100',
      badgeBg: 'bg-teal-500/15 dark:bg-teal-500/20 border-teal-500/30',
      badgeText: 'text-teal-700 dark:text-teal-300',
      accent: 'text-teal-600 dark:text-teal-400',
      dot: 'bg-teal-500',
    };
  }
  if (s.includes('phys')) {
    return {
      bg: 'bg-sky-50/80 dark:bg-sky-950/35',
      border: 'border-sky-200/80 dark:border-sky-800/50',
      text: 'text-sky-950 dark:text-sky-100',
      badgeBg: 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/30',
      badgeText: 'text-sky-700 dark:text-sky-300',
      accent: 'text-sky-600 dark:text-sky-400',
      dot: 'bg-sky-500',
    };
  }
  if (s.includes('vie') || s.includes('svt') || s.includes('terre')) {
    return {
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/35',
      border: 'border-emerald-200/80 dark:border-emerald-800/50',
      text: 'text-emerald-950 dark:text-emerald-100',
      badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      accent: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    };
  }
  if (s.includes('philo')) {
    return {
      bg: 'bg-purple-50/80 dark:bg-purple-950/35',
      border: 'border-purple-200/80 dark:border-purple-800/50',
      text: 'text-purple-950 dark:text-purple-100',
      badgeBg: 'bg-purple-500/15 dark:bg-purple-500/20 border-purple-500/30',
      badgeText: 'text-purple-700 dark:text-purple-300',
      accent: 'text-purple-600 dark:text-purple-400',
      dot: 'bg-purple-500',
    };
  }
  if (s.includes('fran')) {
    return {
      bg: 'bg-amber-50/80 dark:bg-amber-950/35',
      border: 'border-amber-200/80 dark:border-amber-800/50',
      text: 'text-amber-950 dark:text-amber-100',
      badgeBg: 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/30',
      badgeText: 'text-amber-700 dark:text-amber-300',
      accent: 'text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
    };
  }
  if (s.includes('ang') || s.includes('engl') || s.includes('arab')) {
    return {
      bg: 'bg-indigo-50/80 dark:bg-indigo-950/35',
      border: 'border-indigo-200/80 dark:border-indigo-800/50',
      text: 'text-indigo-950 dark:text-indigo-100',
      badgeBg: 'bg-indigo-500/15 dark:bg-indigo-500/20 border-indigo-500/30',
      badgeText: 'text-indigo-700 dark:text-indigo-300',
      accent: 'text-indigo-600 dark:text-indigo-400',
      dot: 'bg-indigo-500',
    };
  }
  if (s.includes('islam')) {
    return {
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/35',
      border: 'border-emerald-200/80 dark:border-emerald-800/50',
      text: 'text-emerald-950 dark:text-emerald-100',
      badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      accent: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    };
  }
  if (s.includes('hist') || s.includes('géo')) {
    return {
      bg: 'bg-orange-50/80 dark:bg-orange-950/35',
      border: 'border-orange-200/80 dark:border-orange-800/50',
      text: 'text-orange-950 dark:text-orange-100',
      badgeBg: 'bg-orange-500/15 dark:bg-orange-500/20 border-orange-500/30',
      badgeText: 'text-orange-700 dark:text-orange-300',
      accent: 'text-orange-600 dark:text-orange-400',
      dot: 'bg-orange-500',
    };
  }
  return {
    bg: 'bg-slate-50/90 dark:bg-slate-900/60',
    border: 'border-slate-200/80 dark:border-white/10',
    text: 'text-slate-900 dark:text-slate-100',
    badgeBg: 'bg-teal-500/15 dark:bg-teal-500/20 border-teal-500/30',
    badgeText: 'text-teal-700 dark:text-teal-300',
    accent: 'text-teal-600 dark:text-teal-400',
    dot: 'bg-teal-500',
  };
};

interface ActiveMoveState {
  blockId: string;
  initialBlock: TimeBlock;
  durationMinutes: number;
  grabOffsetMinutes: number;
  currentStartMinutes: number;
  type: 'move' | 'resize-top' | 'resize-bottom';
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART SCHEDULE OPTIMIZER
// Chronobiology + Cognitive Load Theory priority classifier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a cognitive priority score for a subject name.
 * Lower = harder / more demanding (placed earlier in the day).
 * 1 → Deep analytical (Math, Physics-Chemistry)
 * 2 → Critical thinking (Philosophy, Economics)
 * 3 → Language / verbal (Arabic, French, English)
 * 4 → Memorisation / recall (History, Islamic, SVT facts)
 * 5 → Light review / general
 */
const getSubjectCognitivePriority = (subject: string): number => {
  const s = subject.toLowerCase();
  // Tier 1 — Deep analytic (morning peak: 06h–10h)
  if (s.includes('math') || s.includes('physique') || s.includes('chimie') || s.includes('pc'))
    return 1;
  // Tier 2 — Critical thinking (mid-morning: 10h–12h)
  if (s.includes('philo') || s.includes('économie') || s.includes('sociolo') || s.includes('inform'))
    return 2;
  // Tier 3 — Language (midday: 12h–15h)
  if (
    s.includes('arab') || s.includes('français') || s.includes('anglais') ||
    s.includes('franc') || s.includes('english') || s.includes('langue')
  )
    return 3;
  // Tier 4 — Memorisation (afternoon: 15h–18h)
  if (
    s.includes('histoir') || s.includes('géograph') || s.includes('islamique') ||
    s.includes('svt') || s.includes('vie') || s.includes('terre') ||
    s.includes('tarbiya') || s.includes('islámi')
  )
    return 4;
  // Tier 5 — Light / revision (evening: 18h+)
  if (s.includes('révision') || s.includes('revision') || s.includes('activit') || s.includes('général'))
    return 5;
  return 3; // Default: treat as language tier
};

/**
 * Pure function: given the day's blocks, returns new start/end times for
 * study blocks only — sticker_activity blocks are left untouched.
 *
 * Algorithm:
 * 1. Separate study blocks from sticker (anchor) blocks.
 * 2. Determine window: min(startTime) → max(endTime) across ALL blocks.
 * 3. Sort stickers by their start time (they are fixed anchors).
 * 4. Sort study blocks by cognitive priority (1 = first).
 * 5. Fill study slots in the window, skipping over sticker time ranges.
 * 6. Returns array of { id, startTime, endTime } patches.
 */
export const smartRedistribute = (
  blocks: TimeBlock[]
): { id: string; startTime: string; endTime: string }[] => {
  if (blocks.length === 0) return [];

  const studyBlocks = blocks
    .filter((b) => b.type === 'study' && !b.isCompleted)
    .sort((a, b) => getSubjectCognitivePriority(a.subject) - getSubjectCognitivePriority(b.subject));

  const stickerBlocks = blocks
    .filter((b) => b.type === 'sticker_activity' || b.isCompleted)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  if (studyBlocks.length === 0) return [];

  // Window boundaries
  const allStarts = blocks.map((b) => timeToMinutes(b.startTime));
  const allEnds = blocks.map((b) => timeToMinutes(b.endTime));
  const windowStart = Math.min(...allStarts);
  const windowEnd = Math.max(...allEnds);

  // Build list of "free" intervals by subtracting sticker ranges from the window
  type Interval = { start: number; end: number };
  const blocked: Interval[] = stickerBlocks.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  // Compute free slots in the window
  const freeSlots: Interval[] = [];
  let cursor = windowStart;
  for (const blk of blocked) {
    if (blk.start > cursor) freeSlots.push({ start: cursor, end: blk.start });
    cursor = Math.max(cursor, blk.end);
  }
  if (cursor < windowEnd) freeSlots.push({ start: cursor, end: windowEnd });

  // Assign study blocks into free slots in order
  const patches: { id: string; startTime: string; endTime: string }[] = [];
  let slotIdx = 0;
  let slotCursor = freeSlots[0]?.start ?? windowStart;

  for (const sb of studyBlocks) {
    const dur = timeToMinutes(sb.endTime) - timeToMinutes(sb.startTime);
    let placed = false;

    while (slotIdx < freeSlots.length) {
      const slot = freeSlots[slotIdx];
      // Advance cursor to slot start if needed
      if (slotCursor < slot.start) slotCursor = slot.start;

      if (slotCursor + dur <= slot.end) {
        patches.push({
          id: sb.id,
          startTime: minutesToTime(slotCursor),
          endTime: minutesToTime(slotCursor + dur),
        });
        slotCursor += dur;
        placed = true;
        break;
      } else {
        // Move to next slot
        slotIdx++;
        if (freeSlots[slotIdx]) slotCursor = freeSlots[slotIdx].start;
      }
    }

    // If no slot fit: place at window end (overflow, rare case)
    if (!placed) {
      patches.push({
        id: sb.id,
        startTime: sb.startTime,
        endTime: sb.endTime,
      });
    }
  }

  return patches;
};

export const TimeBlockingTab: React.FC<TimeBlockingTabProps> = ({

  timeBlocks,
  tasks = [],
  language = 'fr',
  onAddTimeBlock,
  onUpdateTimeBlock,
  onDeleteTimeBlock,
  onToggleComplete,
}) => {
  const isAr = language === 'ar';
  const toast = useToast();
  const todayStr = getLocalDateStr();

  // Strict daily streak calculation connected to time blocks and tasks
  const streakData = useMemo(() => {
    return calculateDailyStreak(tasks, [], timeBlocks);
  }, [tasks, timeBlocks]);

  // Active selected day of week (0: Sunday .. 6: Saturday)
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    return new Date().getDay();
  });

  // Timetable grid container reference
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Mouse hover tracking for the dynamic time tag & guideline
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [hoverTimeStr, setHoverTimeStr] = useState<string>('06:00');

  // Activity Sticker Drag & Drop state
  const [draggingSticker, setDraggingSticker] = useState<ActivitySticker | null>(null);
  const [stickerDropY, setStickerDropY] = useState<number | null>(null);
  const [stickerDropMinutes, setStickerDropMinutes] = useState<number | null>(null);

  // Drag-to-create-block interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragCurrentY, setDragCurrentY] = useState<number>(0);
  const [dragStartMinutes, setDragStartMinutes] = useState<number>(360); // 06:00
  const [dragCurrentMinutes, setDragCurrentMinutes] = useState<number>(420); // 07:00

  // Active block drag/move/resize state
  const [activeMove, setActiveMove] = useState<ActiveMoveState | null>(null);

  // "Ajouter / Modifier une tâche" Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'precision' | 'rapide'>('rapide');
  const [naturalInput, setNaturalInput] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [isCustomTimeExpanded, setIsCustomTimeExpanded] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Selected Day Pill in modal: 'today' | 'tomorrow' | 'week' | 'custom'
  const [modalDayOption, setModalDayOption] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('today');
  const [modalCustomDay, setModalCustomDay] = useState<number>(() => new Date().getDay());

  // Time & Duration inside Modal
  const [modalStartMinutes, setModalStartMinutes] = useState(360); // 06:00
  const [modalDurationMinutes, setModalDurationMinutes] = useState(60); // 1h

  // Rapid Mode Period selection
  const [rapidPeriod, setRapidPeriod] = useState<'matin' | 'milieu' | 'aprem' | 'soir' | 'nuit'>('matin');

  // Dismissible reminder notification banner state
  const [isReminderVisible, setIsReminderVisible] = useState(true);

  // Smart Schedule Optimizer: snapshot of original block times before redistribution
  const [originalSnapshot, setOriginalSnapshot] = useState<{ id: string; startTime: string; endTime: string }[] | null>(null);
  const isSmartDistributed = originalSnapshot !== null;

  // ─────────────────────────────────────────────────────────────────────────────
  // CONSECUTIVE TASK MERGING (_tbMerge) — App V3 Feature
  // Merges adjacent blocks with same subject/title into single larger block
  // ─────────────────────────────────────────────────────────────────────────────
  const [isMergeMode, setIsMergeMode] = useState(false);


  // ─────────────────────────────────────────────────────────────────────────────
  // REAL-TIME CURRENT TIME TRACKING (Now Line) — App V3 Feature
  // Live horizontal line at current time, updates every minute
  // ─────────────────────────────────────────────────────────────────────────────
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    };
    updateNow();
    const interval = setInterval(updateNow, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Check if a block is currently in progress (for live highlighting)
  const isBlockActive = (block: TimeBlock): boolean => {
    const startM = timeToMinutes(block.startTime);
    const endM = timeToMinutes(block.endTime);
    return currentTimeMinutes >= startM && currentTimeMinutes < endM;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TASK OVERLAP DETECTION — App V3 Feature
  // Checks for time conflicts and displays warning badges
  // ─────────────────────────────────────────────────────────────────────────────


  // Subject display name localization helper
  const getSubjectDisplayName = (name: string) => {
    if (!name) return '';
    if (!isAr) return name;
    switch (name) {
      case 'Mathématiques':
        return 'الرياضيات';
      case 'Français':
        return 'الفرنسية';
      case 'Arabe':
        return 'اللغة العربية';
      case 'Anglais':
        return 'اللغة الإنجليزية';
      case 'Philosophie':
        return 'الفلسفة';
      case 'Éducation Islamique':
        return 'التربية الإسلامية';
      case 'Sciences de la Vie et de la Terre':
        return 'علوم الحياة والأرض';
      case 'Physique Chimie':
        return 'الفيزياء والكيمياء';
      case 'Histoire & Géographie':
        return 'التاريخ والجغرافيا';
      case 'Économie & Sociologie':
        return 'الاقتصاد والاجتماع';
      case 'Informatique':
        return 'الإعلاميات';
      case 'Révision Générale':
        return 'مراجعة عامة';
      case 'Activités & Équilibre':
        return 'أنشطة واستراحة';
      default:
        return name;
    }
  };

  // Filter blocks for active day
  const dayBlocks = useMemo(() => {
    return timeBlocks
      .filter((b) => b.dayOfWeek === selectedDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timeBlocks, selectedDay]);

  /**
   * App V3 _tbMerge algorithm: merges consecutive tasks sharing same subject or title
   * when cur.endTime === next.startTime (adjacent time slots).
   * Render-time only — nothing is written back to storage, so toggling the
   * feature off restores every original block untouched.
   */
  const mergedDayBlocks = useMemo(() => {
    if (!isMergeMode || dayBlocks.length === 0) return dayBlocks;

    const sorted = [...dayBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const out: TimeBlock[] = [];
    let i = 0;

    while (i < sorted.length) {
      const cur: TimeBlock = { ...sorted[i] };

      while (i + 1 < sorted.length) {
        const nxt = sorted[i + 1];
        const sameKey = Boolean(
          (cur.subject && cur.subject === nxt.subject) || cur.title === nxt.title
        );

        if (sameKey && cur.endTime === nxt.startTime) {
          cur.endTime = nxt.endTime;
          cur._merged = true; // Render-time flag for the dashed-border styling
          i++;
        } else {
          break;
        }
      }

      out.push(cur);
      i++;
    }

    return out;
  }, [dayBlocks, isMergeMode]);

  // Display blocks: use merged version when merge mode is on
  const displayBlocks = isMergeMode ? mergedDayBlocks : dayBlocks;

  // ─────────────────────────────────────────────────────────────────────────────
  // TASK OVERLAP DETECTION — App V3 Feature
  // Checks for time conflicts between study blocks on the active day.
  // Stickers are excluded: a meal during a maths block is a break in the day,
  // not a scheduling mistake.
  // ─────────────────────────────────────────────────────────────────────────────
  const getOverlappingBlocks = useMemo(() => {
    const overlaps: string[] = [];
    const studyBlocks = displayBlocks.filter((b) => b.type === 'study');

    for (let i = 0; i < studyBlocks.length; i++) {
      for (let j = i + 1; j < studyBlocks.length; j++) {
        const a = studyBlocks[i];
        const b = studyBlocks[j];
        const startA = timeToMinutes(a.startTime);
        const endA = timeToMinutes(a.endTime);
        const startB = timeToMinutes(b.startTime);
        const endB = timeToMinutes(b.endTime);

        // Half-open interval overlap: startA < endB && endA > startB
        if (startA < endB && endA > startB) {
          if (!overlaps.includes(a.id)) overlaps.push(a.id);
          if (!overlaps.includes(b.id)) overlaps.push(b.id);
        }
      }
    }
    return overlaps;
  }, [displayBlocks]);

  const isOverlapping = (blockId: string) => getOverlappingBlocks.includes(blockId);

  // Statistics: Total planned study hours and sessions count
  const plannedStudyMinutes = useMemo(() => {
    return dayBlocks
      .filter((b) => b.type === 'study')
      .reduce((acc, b) => {
        const start = timeToMinutes(b.startTime);
        const end = timeToMinutes(b.endTime);
        const diff = end > start ? end - start : 60;
        return acc + diff;
      }, 0);
  }, [dayBlocks]);

  const completedSessionsCount = useMemo(() => {
    return dayBlocks.filter((b) => b.isCompleted).length;
  }, [dayBlocks]);

  const completedStudyMinutes = useMemo(() => {
    return dayBlocks
      .filter((b) => b.isCompleted && b.type === 'study')
      .reduce((acc, b) => {
        const start = timeToMinutes(b.startTime);
        const end = timeToMinutes(b.endTime);
        const diff = end > start ? end - start : 60;
        return acc + diff;
      }, 0);
  }, [dayBlocks]);

  const totalSessionsCount = dayBlocks.length;

  // ─────────────────────────────────────────────────────────────────────────────
  // DAILY SUMMARY & PROGRESS ENGINE — App V3 Feature
  // Aggregates the day's study load, ignoring activity stickers entirely so
  // rest / prayer / meals never inflate the study numbers.
  // ─────────────────────────────────────────────────────────────────────────────
  const summaryBlocks = useMemo(
    () => displayBlocks.filter((b) => b.type === 'study'),
    [displayBlocks]
  );

  const totalStudyMinutes = useMemo(
    () =>
      summaryBlocks.reduce(
        (acc, b) => acc + Math.max(0, timeToMinutes(b.endTime) - timeToMinutes(b.startTime)),
        0
      ),
    [summaryBlocks]
  );

  const doneStudyCount = useMemo(
    () => summaryBlocks.filter((b) => b.isCompleted).length,
    [summaryBlocks]
  );

  const studyProgressPct =
    summaryBlocks.length > 0 ? Math.round((doneStudyCount / summaryBlocks.length) * 100) : 0;

  // Minutes of study already in the past for the selected day (for the "live" readout)
  const elapsedStudyMinutes = useMemo(() => {
    if (selectedDay !== new Date().getDay()) return 0;
    return summaryBlocks.reduce((acc, b) => {
      const s = timeToMinutes(b.startTime);
      const e = timeToMinutes(b.endTime);
      return acc + Math.max(0, Math.min(currentTimeMinutes, e) - s);
    }, 0);
  }, [summaryBlocks, selectedDay, currentTimeMinutes]);

  const remainingStudyMinutes = Math.max(0, totalStudyMinutes - elapsedStudyMinutes);

  // Convert pixel offset from top of timetable grid to minutes from midnight
  const pixelOffsetToMinutes = (y: number): number => {
    const timetableStartMins = TIMETABLE_START_HOUR * 60;
    const minsFromStart = y / PIXELS_PER_MINUTE;
    const rawMins = timetableStartMins + minsFromStart;
    // Snap to 5-minute intervals
    const snapped = Math.round(rawMins / 5) * 5;
    return Math.max(TIMETABLE_START_HOUR * 60, Math.min(TIMETABLE_END_HOUR * 60, snapped));
  };

  // Convert minutes from midnight to Y pixel position relative to timetable top
  const minutesToPixelOffset = (mins: number): number => {
    const timetableStartMins = TIMETABLE_START_HOUR * 60;
    const offsetMins = Math.max(0, mins - timetableStartMins);
    return offsetMins * PIXELS_PER_MINUTE;
  };

  // -------------------------------------------------------------
  // MOUSE HOVER & DRAG-TO-CREATE / MOVE HANDLERS
  // -------------------------------------------------------------
  const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    setHoverY(relativeY);
    const mins = pixelOffsetToMinutes(relativeY);
    setHoverTimeStr(minutesToTime(mins));

    if (activeMove) {
      if (activeMove.type === 'move') {
        const minAllowed = TIMETABLE_START_HOUR * 60;
        const maxAllowed = TIMETABLE_END_HOUR * 60 - activeMove.durationMinutes;
        const desiredStart = mins - activeMove.grabOffsetMinutes;
        const snappedStart = Math.round(desiredStart / 5) * 5;
        const boundedStart = Math.max(minAllowed, Math.min(maxAllowed, snappedStart));

        setActiveMove((prev) => (prev ? { ...prev, currentStartMinutes: boundedStart } : null));
      } else if (activeMove.type === 'resize-bottom') {
        const minEnd = activeMove.currentStartMinutes + 5;
        const maxEnd = TIMETABLE_END_HOUR * 60;
        const snappedEnd = Math.round(mins / 5) * 5;
        const boundedEnd = Math.max(minEnd, Math.min(maxEnd, snappedEnd));
        const newDuration = boundedEnd - activeMove.currentStartMinutes;

        setActiveMove((prev) => (prev ? { ...prev, durationMinutes: newDuration } : null));
      } else if (activeMove.type === 'resize-top') {
        const fixedEnd = activeMove.currentStartMinutes + activeMove.durationMinutes;
        const maxStart = fixedEnd - 5;
        const minStart = TIMETABLE_START_HOUR * 60;
        const snappedStart = Math.round(mins / 5) * 5;
        const boundedStart = Math.max(minStart, Math.min(maxStart, snappedStart));
        const newDuration = fixedEnd - boundedStart;

        setActiveMove((prev) =>
          prev ? { ...prev, currentStartMinutes: boundedStart, durationMinutes: newDuration } : null
        );
      }
    } else if (isDragging) {
      setDragCurrentY(relativeY);
      setDragCurrentMinutes(mins);
    }
  };

  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only the primary (left) button may start a drag-to-create. A right or
    // middle click used to arm the drag and then open the "add task" modal on
    // release, which made the context menu feel like it created a block.
    if (e.button !== 0) return;
    // If clicking directly on a button or existing block, ignore
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.time-block-card')) {
      return;
    }
    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const mins = pixelOffsetToMinutes(relativeY);
    setIsDragging(true);
    setDragStartY(relativeY);
    setDragCurrentY(relativeY);
    setDragStartMinutes(mins);
    setDragCurrentMinutes(mins);

  };

  // Start moving an existing card
  const handleStartMoveBlock = (
    e: React.MouseEvent,
    block: TimeBlock,
    type: 'move' | 'resize-top' | 'resize-bottom' = 'move'
  ) => {
    e.stopPropagation();
    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const cursorMins = pixelOffsetToMinutes(relativeY);

    const startMins = timeToMinutes(block.startTime);
    const endMins = timeToMinutes(block.endTime);
    const duration = endMins > startMins ? endMins - startMins : 60;

    const offset = Math.max(0, Math.min(duration, cursorMins - startMins));

    setActiveMove({
      blockId: block.id,
      initialBlock: block,
      durationMinutes: duration,
      grabOffsetMinutes: offset,
      currentStartMinutes: startMins,
      type,
    });

  };

  const handleGridMouseUp = () => {
    if (activeMove) {
      const newStartStr = minutesToTime(activeMove.currentStartMinutes);
      const newEndStr = minutesToTime(activeMove.currentStartMinutes + activeMove.durationMinutes);

      if (
        newStartStr !== activeMove.initialBlock.startTime ||
        newEndStr !== activeMove.initialBlock.endTime
      ) {
        onUpdateTimeBlock({
          ...activeMove.initialBlock,
          startTime: newStartStr,
          endTime: newEndStr,
        });
      }
      setActiveMove(null);
      return;
    }

    if (!isDragging) return;
    setIsDragging(false);

    // Compute start and end minutes
    const startMins = Math.min(dragStartMinutes, dragCurrentMinutes);
    const rawEndMins = Math.max(dragStartMinutes, dragCurrentMinutes);

    // A quick click (no actual drag) keeps the 1-hour default. A deliberate but
    // short drag is clamped up to the 15-minute minimum instead of being
    // inflated to a full hour, which used to discard the user's chosen range.
    let duration = rawEndMins - startMins;
    if (duration <= 0) {
      duration = 60; // quick click → default 1 hour
    } else if (duration < 5) {
      duration = 5;
    }

    setEditingBlockId(null);
    setModalStartMinutes(startMins);
    setModalDurationMinutes(duration);
    setTaskTitle('');
    setTaskSubject('');
    setSubjectError('');
    setTaskNotes('');
    setNaturalInput('');
    setModalDayOption('today');
    setModalCustomDay(selectedDay);
    setModalMode('rapide');
    setIsCustomTimeExpanded(false);
    setIsDetailsExpanded(false);

    setIsModalOpen(true);
  };

  // Open direct Add Task modal with clean empty fields
  const handleOpenAddNewBlock = (defaultStartMinutes = 480) => {
    setEditingBlockId(null);
    setModalStartMinutes(defaultStartMinutes);
    setModalDurationMinutes(60);
    setTaskTitle('');
    setTaskSubject('');
    setSubjectError('');
    setTaskNotes('');
    setNaturalInput('');
    setModalDayOption('today');
    setModalCustomDay(selectedDay);
    setModalMode('rapide');
    setIsCustomTimeExpanded(false);
    setIsDetailsExpanded(false);
    setIsModalOpen(true);
  };

  // Global mouseup listener + stuck-drag rescue
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging || activeMove) {
        handleGridMouseUp();
      }
    };
    // Releasing the mouse outside the window (or alt-tabbing mid-drag) can
    // swallow the mouseup, which left a phantom selection box stuck on the grid
    // with the drag state still armed.
    const handleCancelDrag = () => {
      setIsDragging(false);
      setActiveMove(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('blur', handleCancelDrag);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('blur', handleCancelDrag);
    };
  }, [isDragging, activeMove]);

  // Dismiss modal or subject dropdown on Escape key
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isSubjectDropdownOpen) {
          setIsSubjectDropdownOpen(false);
        } else {
          setIsModalOpen(false);
          setEditingBlockId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isSubjectDropdownOpen]);

  // Dismiss subject dropdown when clicking outside
  useEffect(() => {
    if (!isSubjectDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        subjectDropdownRef.current &&
        !subjectDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSubjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSubjectDropdownOpen]);

  // Quick shift block by +/- hours
  const handleShiftBlockHours = (block: TimeBlock, deltaHours: number) => {
    const startM = timeToMinutes(block.startTime);
    const endM = timeToMinutes(block.endTime);
    const duration = endM > startM ? endM - startM : 60;

    const deltaMins = deltaHours * 60;
    const newStartM = Math.max(
      TIMETABLE_START_HOUR * 60,
      Math.min(TIMETABLE_END_HOUR * 60 - duration, startM + deltaMins)
    );
    const newEndM = newStartM + duration;

    onUpdateTimeBlock({
      ...block,
      startTime: minutesToTime(newStartM),
      endTime: minutesToTime(newEndM),
    });
  };

  // Open Edit Dialog for a block
  const handleOpenEditBlock = (block: TimeBlock) => {
    setEditingBlockId(block.id);
    setTaskTitle(block.title);
    setTaskSubject(block.subject || '');
    setSubjectError('');
    setTaskNotes(block.notes || '');
    setNaturalInput('');

    const startM = timeToMinutes(block.startTime);
    const endM = timeToMinutes(block.endTime);
    setModalStartMinutes(startM);
    setModalDurationMinutes(endM > startM ? endM - startM : 60);

    if (block.dayOfWeek === selectedDay) {
      setModalDayOption('today');
      setModalCustomDay(selectedDay);
    } else if (block.dayOfWeek === (selectedDay + 1) % 7) {
      setModalDayOption('tomorrow');
      setModalCustomDay((selectedDay + 1) % 7);
    } else {
      setModalDayOption('custom');
      setModalCustomDay(block.dayOfWeek);
    }

    setModalMode('precision');
    setIsCustomTimeExpanded(false);
    setIsDetailsExpanded(Boolean(block.notes || (block.title && block.title !== block.subject)));

    setIsModalOpen(true);
  };

  // -------------------------------------------------------------
  // MODAL QUICK ACTIONS
  // -------------------------------------------------------------
  const handleApplyNaturalLanguage = () => {
    if (!naturalInput.trim()) return;
    const parsed = parseNaturalLanguageTask(naturalInput);
    if (parsed.title) setTaskTitle(parsed.title);
    if (parsed.subject) {
      setTaskSubject(parsed.subject);
      setSubjectError('');
    }
    if (parsed.durationMins) setModalDurationMinutes(parsed.durationMins);
    if (parsed.dayOffset === 1) setModalDayOption('tomorrow');
    chimePlayer.playChime('click');
  };

  const handleDurationPresetClick = (minutes: number) => {
    setModalDurationMinutes(minutes);
  };

  const handleRapidPeriodClick = (period: 'matin' | 'milieu' | 'aprem' | 'soir' | 'nuit') => {
    setRapidPeriod(period);
    switch (period) {
      case 'matin':
        setModalStartMinutes(6 * 60); // 06:00
        break;
      case 'milieu':
        setModalStartMinutes(9 * 60); // 09:00
        break;
      case 'aprem':
        setModalStartMinutes(14 * 60); // 14:00
        break;
      case 'soir':
        setModalStartMinutes(18 * 60); // 18:00
        break;
      case 'nuit':
        setModalStartMinutes(21 * 60); // 21:00
        break;
    }
  };

  const handleSaveModalTask = (e?: React.FormEvent, overrideSubject?: string) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    const subjectToValidate = (overrideSubject !== undefined ? overrideSubject : taskSubject).trim();

    // Subject is MANDATORY (إجباري للمادة فقط)
    if (!subjectToValidate) {
      setSubjectError(
        isAr ? 'يرجى اختيار المادة إجبارياً لحفظ المهمة.' : 'Veuillez sélectionner une matière obligatoirement.'
      );
      if (modalMode === 'precision') {
        setIsSubjectDropdownOpen(true);
      }
      return;
    }

    let targetDay = selectedDay;
    if (modalDayOption === 'tomorrow') {
      targetDay = (selectedDay + 1) % 7;
    } else if (modalDayOption === 'custom' || modalDayOption === 'week') {
      targetDay = modalCustomDay;
    }

    const startStr = minutesToTime(modalStartMinutes);
    const endStr = minutesToTime(modalStartMinutes + modalDurationMinutes);
    // Title is OPTIONAL - falls back to selected subject name if empty
    const finalTitle = taskTitle.trim() || subjectToValidate;

    const targetDateKey = computeDateKeyForDay(targetDay);

    if (editingBlockId) {
      const existing = timeBlocks.find((b) => b.id === editingBlockId);
      if (existing) {
        onUpdateTimeBlock({
          ...existing,
          title: finalTitle,
          subject: subjectToValidate,
          dayOfWeek: targetDay,
          dateKey: existing.dateKey || targetDateKey,
          startTime: startStr,
          endTime: endStr,
          notes: taskNotes.trim(),
        });
      }
    } else {
      onAddTimeBlock({
        dayOfWeek: targetDay,
        dateKey: targetDateKey,
        startTime: startStr,
        endTime: endStr,
        title: finalTitle,
        subject: subjectToValidate,
        isCompleted: false,
        type: 'study',
        notes: taskNotes.trim(),
        createdAt: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
    setEditingBlockId(null);
    setIsSubjectDropdownOpen(false);
    setSubjectError('');
    chimePlayer.playChime('add');
    toast.success(
      isAr ? 'تم الحفظ بنجاح ✓' : editingBlockId ? 'Bloc mis à jour ✓' : 'Bloc ajouté ✓',
      isAr ? 'تم تسجيل الكتلة في جدولك' : `${subjectToValidate || taskTitle} · ${startStr} – ${endStr}`,
    );
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      // Allow multi-line input in textarea unless Ctrl/Cmd is pressed
      if (target.tagName === 'TEXTAREA' && !e.ctrlKey && !e.metaKey) {
        return;
      }
      // Allow button keyboard activation without early submit interception
      if (target.tagName === 'BUTTON') {
        return;
      }
      e.preventDefault();
      handleSaveModalTask(e);
    }
  };

  // Handler for dropping a sticker directly onto the timetable at a specific start time
  const handleDropSticker = (sticker: ActivitySticker, startMinutes: number) => {
    const endM = Math.min(24 * 60, startMinutes + sticker.defaultDurationMinutes);
    const startStr = minutesToTime(startMinutes);
    const endStr = minutesToTime(endM);

    onAddTimeBlock({
      dayOfWeek: selectedDay,
      dateKey: computeDateKeyForDay(selectedDay),
      startTime: startStr,
      endTime: endStr,
      title: sticker.label,
      subject: 'Activités & Équilibre',
      isCompleted: false,
      type: 'sticker_activity',
      stickerType: sticker.type,
      notes: sticker.description,
      createdAt: new Date().toISOString(),
    });

    // Play context-aware soothing sound based on sticker type
    const stickerSoundMap: Record<string, string> = {
      praying: 'praying',
      sleeping: 'sleeping',
      sport: 'sport',
      walking: 'sport',
      rest: 'rest',
      coffee: 'rest',
      repas: 'repas',
      lunch: 'repas',
      dinner: 'repas',
    };
    chimePlayer.playChime(stickerSoundMap[sticker.type] ?? 'add');

    toast.success(
      isAr ? `تم تثبيت ${sticker.label} (${startStr} – ${endStr}) ✓` : `${sticker.label} placé (${startStr} – ${endStr}) ✓`,
      isAr ? 'تمت إضافة النشاط في الجدول' : 'Activité ajoutée sur votre planning',
    );
  };

  // Quick activity sticker place handler (click fallback)
  const handlePlaceActivitySticker = (sticker: ActivitySticker) => {
    let startM = 12 * 60; // 12:00 default
    if (dayBlocks.length > 0) {
      const last = dayBlocks[dayBlocks.length - 1];
      startM = timeToMinutes(last.endTime);
    }
    handleDropSticker(sticker, startM);
  };

  // Calculate live drag box geometry for creating
  const dragMinMins = Math.min(dragStartMinutes, dragCurrentMinutes);
  const dragMaxMins = Math.max(dragStartMinutes, dragCurrentMinutes);
  const dragDurationMins = Math.max(1, dragMaxMins - dragMinMins);
  const dragTopPx = minutesToPixelOffset(dragMinMins);
  const dragHeightPx = Math.max(8, minutesToPixelOffset(dragMaxMins) - dragTopPx);

  // ─── Smart Schedule Optimizer handlers ─────────────────────────────────────

  /** Saves a snapshot of current block times then applies the smart redistribution */
  const handleSmartRedistribute = () => {
    if (dayBlocks.length === 0) {
      toast.error(
        isAr ? 'لا توجد حصص لإعادة توزيعها' : 'Aucune séance à redistribuer',
        isAr ? 'أضف حصصًا أولاً ثم استخدم التوزيع الذكي' : 'Ajoutez des séances d\'abord',
      );
      return;
    }

    // Save original snapshot (study blocks only — we only move those)
    const snapshot = dayBlocks
      .filter((b) => b.type === 'study' && !b.isCompleted)
      .map((b) => ({ id: b.id, startTime: b.startTime, endTime: b.endTime }));

    if (snapshot.length === 0) {
      toast.error(
        isAr ? 'لا توجد حصص دراسة قابلة للإعادة' : 'Aucune séance d\'étude à redistribuer',
        isAr ? 'الحصص المكتملة والأنشطة لا تتأثر' : 'Les sessions complètes et activités restent fixes',
      );
      return;
    }

    const patches = smartRedistribute(dayBlocks);
    if (patches.length === 0) return;

    // Apply patches
    patches.forEach((patch) => {
      const existing = timeBlocks.find((b) => b.id === patch.id);
      if (existing) {
        onUpdateTimeBlock({ ...existing, startTime: patch.startTime, endTime: patch.endTime });
      }
    });

    setOriginalSnapshot(snapshot);
    chimePlayer.playChime('add');
    toast.success(
      isAr ? '🧠 تم التوزيع الذكي' : '🧠 Redistribution intelligente',
      isAr
        ? 'الأصعب صباحًا • الحفظ مساءً • الراحة ثابتة — اضغط "تراجع" للعودة'
        : 'Analytique le matin • Mémorisation l\'après-midi — "Annuler" pour revenir',
    );
  };

  /** Reverts blocks to their original times before smart redistribution */
  const handleRevert = () => {
    if (!originalSnapshot) return;
    originalSnapshot.forEach((snap) => {
      const existing = timeBlocks.find((b) => b.id === snap.id);
      if (existing) {
        onUpdateTimeBlock({ ...existing, startTime: snap.startTime, endTime: snap.endTime });
      }
    });
    setOriginalSnapshot(null);
    chimePlayer.playChime('delete');
    toast.success(
      isAr ? '↩ تم التراجع' : '↩ Annulé',
      isAr ? 'تم استعادة التوزيع الأصلي الخاص بك' : 'Votre planning original a été restauré',
    );
  };


  return (
    <div className="space-y-4 pb-16 select-none font-sans text-slate-900 dark:text-slate-100">
      {/* 1. TOP HEADER BAR: PLANNED TIME, SESSIONS, DATE SELECTOR & ADD BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-[#111827]/95 p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        {/* Left: Stats Badges (1h planifiées • 0/1 sessions) & Direct Add Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {plannedStudyMinutes > 0 ? formatDurationLabel(plannedStudyMinutes) : '0h'}{' '}
              {isAr ? 'مخطط' : 'planifiées'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {completedSessionsCount}/{totalSessionsCount} {isAr ? 'حصص' : 'sessions'}
            </span>
          </div>

          {/* Daily Streak Flame Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${streakData.isTodayCompleted
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs'
              : 'bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/10'
              }`}
            title={
              streakData.isTodayCompleted
                ? isAr
                  ? 'تم تأكيد إنجاز مهمة اليوم! شعلتك متوهجة 🔥'
                  : 'Série validée aujourd\'hui 🔥'
                : isAr
                  ? 'اضغط على زر تأكيد المهمة [✓] لإشعال الشعلة اليومية'
                  : 'Cochez une tâche pour allumer votre série'
            }
          >
            <Flame
              className={`w-3.5 h-3.5 ${streakData.isTodayCompleted ? 'text-amber-500 fill-current animate-pulse' : 'text-slate-400'
                }`}
            />
            <span>
              {streakData.currentStreak} {isAr ? 'أيام متتالية' : 'jours'}
            </span>
          </div>

          {/* Today Completed & Calculated Study Hours */}
          {completedStudyMinutes > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {formatDurationLabel(completedStudyMinutes)} {isAr ? 'منجزة ومحسوبة' : 'validées'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleOpenAddNewBlock(8 * 60)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold transition-transform active:scale-95 shadow-md shadow-teal-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إضافة حصة جديدة' : '+ Bloquer un créneau'}</span>
          </button>

          {/* Smart Schedule Optimizer Button */}
          <button
            type="button"
            onClick={handleSmartRedistribute}
            title={isAr ? 'توزيع ذكي وفق منطق الطاقة المعرفية' : 'Redistribution intelligente (charge cognitive)'}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer ${
              isSmartDistributed
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/25'
                : 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>{isAr ? 'توزيع ذكي' : 'Optimiser'}</span>
          </button>

          {/* Consecutive Task Merge Mode Toggle — App V3 Feature */}
          <button
            type="button"
            onClick={() => {
              setIsMergeMode(!isMergeMode);
              chimePlayer.playChime('click');
            }}
            title={isAr ? 'دمج الحصص المتتالية ذات نفس المادة' : 'Fusionner les séances consécutives (même matière)'}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer ${
              isMergeMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isAr ? 'دمج' : 'Fusion'}</span>
          </button>

          {/* Revert to original button — visible only after smart redistribution */}
          {isSmartDistributed && (
            <button
              type="button"
              onClick={handleRevert}
              title={isAr ? 'استعادة التوزيع الأصلي' : 'Restaurer le planning original'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'تراجع' : 'Annuler'}</span>
            </button>
          )}
        </div>

        {/* Right: Day Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {DAYS_OF_WEEK.map((d) => {
            const isSelected = selectedDay === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${isSelected
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
                  : 'bg-slate-100/80 hover:bg-slate-200/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
              >
                {isAr ? d.nameAr : d.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. "ACTIVITÉS" STICKERS BAR (DRAG & DROP TO TIMETABLE) */}
      <div className="bg-white/90 dark:bg-[#111827]/95 p-3 sm:p-3.5 rounded-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 px-1 shrink-0 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            {isAr ? 'أنشطة (اسحب وضع في الجدول)' : 'ACTIVITÉS (Glisser-Déposer)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {ACTIVITY_STICKERS.map((sticker) => {
            const isBeingDragged = draggingSticker?.type === sticker.type;
            const stickerTheme = getStickerTheme(sticker.type);
            return (
              <div
                key={sticker.type}
                draggable
                onDragStart={(e) => {
                  setDraggingSticker(sticker);
                  e.dataTransfer.setData('text/plain', sticker.type);
                  // 'copy' made the OS paint its copy cursor (a pointer with a
                  // "+" badge) all over the timetable. The user asked for the
                  // normal cursor, so advertise a plain 'move' instead — the
                  // drop handler below still creates a brand-new block, so
                  // nothing about the resulting behaviour changes.
                  e.dataTransfer.effectAllowed = 'move';
                  chimePlayer.playChime('click');
                }}
                onDragEnd={() => {
                  setDraggingSticker(null);
                  setStickerDropY(null);
                  setStickerDropMinutes(null);
                }}
                onClick={() => handlePlaceActivitySticker(sticker)}
                className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border cursor-grab active:cursor-grabbing select-none transition-all duration-150 hover:scale-105 active:scale-95 shadow-xs ${isBeingDragged
                  ? 'opacity-40 scale-95 border-teal-500 ring-2 ring-teal-500/40'
                  : `${stickerTheme.bg} ${stickerTheme.border} ${stickerTheme.text} hover:shadow-md`
                  }`}
                title={
                  isAr
                    ? `اسحب ${sticker.label} وضعه في الجدول (أو اضغط للوضع السريع)`
                    : `Glissez ${sticker.label} sur le planning (ou cliquez pour placer)`
                }
              >
                <div className="shrink-0 transition-transform group-hover:rotate-6">
                  {STICKER_ICONS[sticker.type] || <Sparkles className="w-3.5 h-3.5" />}
                </div>
                <span>{sticker.label}</span>
                <span className="text-[9px] opacity-60 font-mono hidden sm:inline">
                  {sticker.defaultDurationMinutes}m
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2.5 DAILY SUMMARY & PROGRESS ENGINE (App V3) */}
      <div className="bg-white/90 dark:bg-[#111827]/95 p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            {isAr ? 'ملخص اليوم' : 'Résumé du jour'}
          </span>

          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono">
              {formatDurationLabel(totalStudyMinutes)} {isAr ? 'مخطط' : 'planifiées'}
            </span>
            <span className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-mono">
              {doneStudyCount}/{summaryBlocks.length} {isAr ? 'منجزة' : 'terminées'}
            </span>
            {selectedDay === new Date().getDay() && remainingStudyMinutes > 0 && (
              <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
                {formatDurationLabel(remainingStudyMinutes)} {isAr ? 'متبقية' : 'restantes'}
              </span>
            )}
            {getOverlappingBlocks.length > 0 && (
              <span className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {isAr ? 'تعارض في الجدول' : 'Conflit détecté'}
              </span>
            )}
          </div>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden border border-slate-200/60 dark:border-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-400 transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${studyProgressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
          <span>{isAr ? 'التقدم' : 'Progression'}</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{studyProgressPct}%</span>
        </div>
      </div>

      {/* 3. FLUID DRAG-TO-BLOCK & DRAG-TO-MOVE TIMETABLE MATRIX */}
      <div className="relative bg-white/95 dark:bg-[#111827]/95 rounded-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm p-4 sm:p-6 overflow-hidden">
        {/* Main Coordinate Grid */}
        {/* data-mybac-cursor opts this zone into the smooth two-layer cursor
            (PlannerCursor.tsx). It is the only place in the app where the
            native pointer is hidden, so the rest of the interface is untouched. */}
        <div
          ref={gridContainerRef}
          id="timetable-drag-matrix"
          data-mybac-cursor="planner-tasks"
          onMouseMove={handleGridMouseMove}
          onMouseDown={handleGridMouseDown}
          onMouseLeave={() => setHoverY(null)}
          onDragOver={(e) => {
            if (!gridContainerRef.current) return;
            e.preventDefault();
            // Must stay in sync with effectAllowed on the sticker ('move'),
            // otherwise the browser rejects the drop. 'copy' here is what drew
            // the "+" copy cursor the user reported.
            e.dataTransfer.dropEffect = 'move';
            const rect = gridContainerRef.current.getBoundingClientRect();
            const relativeY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            const mins = pixelOffsetToMinutes(relativeY);
            setStickerDropY(relativeY);
            setStickerDropMinutes(mins);
          }}
          onDragLeave={(e) => {
            if (!gridContainerRef.current?.contains(e.relatedTarget as Node)) {
              setStickerDropY(null);
              setStickerDropMinutes(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!gridContainerRef.current) return;
            const stickerType = e.dataTransfer.getData('text/plain');
            const targetSticker =
              draggingSticker || ACTIVITY_STICKERS.find((s) => s.type === stickerType);

            if (targetSticker) {
              const rect = gridContainerRef.current.getBoundingClientRect();
              const relativeY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
              const dropMins = stickerDropMinutes ?? pixelOffsetToMinutes(relativeY);
              handleDropSticker(targetSticker, dropMins);
            }

            setDraggingSticker(null);
            setStickerDropY(null);
            setStickerDropMinutes(null);
          }}
          // Cursor: a plain arrow, always. Do NOT switch this back to a
          // cross-shaped selection cursor — it painted a "+" over the whole
          // timetable during drag-to-create, which is exactly what the user
          // reported. Dragging an existing block keeps its grab affordance.
          className={`relative min-h-[900px] select-none ${activeMove ? 'cursor-grabbing' : 'cursor-default'
            }`}
          style={{ height: `${(TIMETABLE_END_HOUR - TIMETABLE_START_HOUR) * 2 * SLOT_HEIGHT_PX}px` }}
        >
          {/* Time lines & Background Grid */}
          {TIME_MARKERS.map((time, idx) => {
            const isHour = time.endsWith(':00');
            const topPx = idx * SLOT_HEIGHT_PX;

            return (
              // -translate-y-1/2 keeps the drawn line ON the row's coordinate.
              // Without it the row (as tall as its label) centres the 1px line
              // ~8px lower, so every grid line and hour label was drawn below
              // its real position and never lined up with the session blocks.
              <div
                key={time}
                style={{ top: `${topPx}px` }}
                className="absolute inset-x-0 flex items-center pointer-events-none -translate-y-1/2"
              >
                {/* Left Time label */}
                <div className="w-16 shrink-0 text-right pr-4 font-mono text-xs font-medium">
                  {isHour ? (
                    <span className="font-bold text-slate-700 dark:text-slate-300">{time}</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600 text-[10px]">{time}</span>
                  )}
                </div>

                {/* Horizontal Guideline */}
                <div
                  className={`flex-1 border-t ${isHour ? 'border-slate-200/80 dark:border-white/10' : 'border-dashed border-slate-200/50 dark:border-white/5'
                    }`}
                />
              </div>
            );
          })}

          {/* ─── REAL-TIME "NOW LINE" CURRENT TIME MARKER (App V3) ─── */}
          {currentTimeMinutes >= TIMETABLE_START_HOUR * 60 && currentTimeMinutes < TIMETABLE_END_HOUR * 60 && (
            <div
              style={{ top: `${minutesToPixelOffset(currentTimeMinutes)}px` }}
              className="absolute inset-x-0 flex items-center pointer-events-none z-25 -translate-y-1/2"
            >
              {/* Left: Current time badge */}
              <div className="w-16 shrink-0 text-right pr-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500 text-white font-mono text-[10px] font-black shadow-md animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {minutesToTime(currentTimeMinutes)}
                </span>
              </div>
              {/* Red glowing dot */}
              <div className="w-2.5 h-2.5 -ml-1.5 rounded-full bg-rose-500 border-2 border-white dark:border-[#111827] ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/40" />
              {/* Horizontal now line */}
              <div className="flex-1 h-0.5 bg-gradient-to-r from-rose-500/80 via-rose-500/40 to-transparent" />
            </div>
          )}

          {/* DYNAMIC HOVER TIME TAG & GUIDELINE */}
          {hoverY !== null && !isDragging && !activeMove && !draggingSticker && (
            // -translate-y-1/2 makes the guideline sit exactly under the pointer,
            // so the circle's centre lies ON the line and the line reads as its
            // diameter. Without it the line floated ~12px below the cursor and
            // the circle looked like it pointed a few minutes before the hour.
            <div
              style={{ top: `${hoverY}px` }}
              className="absolute inset-x-0 flex items-center pointer-events-none -translate-y-1/2"
            >
              {/* Teal Pointed Badge */}
              <div className="w-16 shrink-0 text-right pr-2">
                <span className="inline-block px-2 py-0.5 rounded-md bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950 font-mono text-[10px] font-black shadow-sm">
                  {hoverTimeStr}
                </span>
              </div>
              {/* Target dot */}
              <div className="w-2.5 h-2.5 -ml-1.5 rounded-full bg-teal-500 border-2 border-white dark:border-[#111827] ring-2 ring-teal-500/40" />
              {/* Guideline line */}
              <div className="flex-1 border-t border-teal-500/40" />
            </div>
          )}

          {/* DYNAMIC ACTIVE DRAGGING SELECTION BOX (CREATE MODE) */}
          {isDragging && (
            <div
              style={{
                top: `${dragTopPx}px`,
                height: `${dragHeightPx}px`,
                left: '4.5rem',
                right: '1rem',
              }}
              className="absolute z-20 rounded-2xl border-2 border-teal-500 bg-teal-500/10 backdrop-blur-sm shadow-xl flex items-center justify-center transition-all duration-75 pointer-events-none"
            >
              {/* Top guideline time tag */}
              <div
                style={{ top: '-14px', left: '-5rem' }}
                className="absolute flex items-center"
              >
                <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950 font-mono text-[10px] font-black shadow-sm">
                  {minutesToTime(dragMinMins)}
                </span>
              </div>

              {/* Center Floating Time Range Pill */}
              <div className="px-3.5 py-1.5 rounded-full bg-teal-600 text-white font-mono text-xs font-black shadow-lg shadow-teal-900/30 border border-teal-300/40 animate-pulse">
                {minutesToTime(dragMinMins)} - {minutesToTime(dragMaxMins)}
              </div>

              {/* Bottom Circular Drag Handle Following Cursor */}
              <div className="absolute bottom-2 left-6 w-6 h-6 rounded-full border-2 border-teal-500 bg-teal-500/20 flex items-center justify-center animate-bounce">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
              </div>
            </div>
          )}

          {/* DYNAMIC ACTIVE STICKER DRAG-AND-DROP GHOST PREVIEW */}
          {draggingSticker && stickerDropMinutes !== null && (
            <div
              style={{
                top: `${minutesToPixelOffset(stickerDropMinutes)}px`,
                height: `${Math.max(12, draggingSticker.defaultDurationMinutes * PIXELS_PER_MINUTE)}px`,
                left: '4.5rem',
                right: '1rem',
              }}
              className={`absolute z-30 rounded-2xl border-2 border-dashed ${getStickerTheme(draggingSticker.type).border} ${getStickerTheme(draggingSticker.type).bg} shadow-2xl backdrop-blur-xs flex items-center justify-between px-4 transition-all duration-75 pointer-events-none animate-pulse overflow-hidden`}
            >
              {/* Top guideline time tag */}
              <div
                style={{ top: '-14px', left: '-5rem' }}
                className="absolute flex items-center"
              >
                <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950 font-mono text-[10px] font-black">
                  {minutesToTime(stickerDropMinutes)}
                </span>
              </div>

              {/* Left: Sticker icon, label and duration */}
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-black/20 dark:bg-black/50 border border-white/10 text-white shadow-inner">
                  {STICKER_ICONS[draggingSticker.type] || <Sparkles className="w-4 h-4 text-teal-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{draggingSticker.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 font-mono">
                      {draggingSticker.defaultDurationMinutes} min
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
                    {minutesToTime(stickerDropMinutes)} –{' '}
                    {minutesToTime(
                      Math.min(24 * 60, stickerDropMinutes + draggingSticker.defaultDurationMinutes)
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Drop indicator badge */}
              <div className="px-3 py-1 rounded-full bg-teal-600 text-white border border-teal-400/40 text-xs font-bold shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span>{isAr ? 'أفلت للوضع هنا' : 'Lâcher pour placer ici'}</span>
              </div>
            </div>
          )}

          {/* RENDERED TIME BLOCKS ON TIMETABLE */}
          {displayBlocks.map((block) => {
            const isBeingMoved = activeMove?.blockId === block.id;
            const activeNow = isBlockActive(block);
            const hasOverlap = isOverlapping(block.id);

            const startM = isBeingMoved
              ? activeMove.currentStartMinutes
              : timeToMinutes(block.startTime);
            const duration = isBeingMoved
              ? activeMove.durationMinutes
              : Math.max(1, timeToMinutes(block.endTime) - timeToMinutes(block.startTime));

            const topPx = minutesToPixelOffset(startM);
            const heightPx = Math.max(12, duration * PIXELS_PER_MINUTE);

            const isUltraCompact = heightPx < 20; // 5m (~12px) - 12m (~18px)
            const isCompact = heightPx < 36;      // 15m (~22.5px) - 23m (~35px)

            const isSticker = block.type === 'sticker_activity';
            const stickerData = isSticker
              ? ACTIVITY_STICKERS.find((s) => s.type === block.stickerType)
              : null;
            const subjectData = BAC_SUBJECTS.find((s) => s.name === block.subject);

            const cardTheme = isSticker && stickerData
              ? getStickerTheme(stickerData.type)
              : getSubjectCardTheme(block.subject);

            const startTimeFormatted = isBeingMoved ? minutesToTime(startM) : block.startTime;
            const endTimeFormatted = isBeingMoved
              ? minutesToTime(startM + duration)
              : block.endTime;

            return (
              <div
                key={block.id}
                onMouseDown={(e) => handleStartMoveBlock(e, block, 'move')}
                style={{
                  top: `${topPx}px`,
                  height: `${heightPx}px`,
                  left: '4.5rem',
                  right: '1rem',
                }}
                className={`time-block-card absolute ${
                  isUltraCompact
                    ? 'px-2 py-0 rounded-lg'
                    : isCompact
                    ? 'px-2.5 py-0.5 rounded-xl'
                    : 'p-3 rounded-2xl'
                } border transition-all select-none flex ${
                  isCompact ? 'flex-row items-center justify-between' : 'flex-col justify-between'
                } overflow-hidden group cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md ${
                  isBeingMoved
                    ? 'z-40 ring-2 ring-teal-500 shadow-2xl scale-[1.01] opacity-95 bg-white dark:bg-slate-800'
                    : activeNow
                    ? 'ring-2 ring-rose-500/80 shadow-lg shadow-rose-500/20 animate-pulse'
                    : hasOverlap
                    ? 'border-amber-500/80 ring-1 ring-amber-500/40'
                    : `${cardTheme.bg} ${cardTheme.border} hover:border-teal-500/60`
                } ${block._merged ? 'border-dashed border-2' : ''}`}
              >
                {/* Active in-progress indicator badge */}
                {activeNow && (
                  <div className="absolute top-1 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold shadow-sm animate-bounce">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>{isAr ? 'جارية الآن' : 'En cours'}</span>
                  </div>
                )}

                {/* Overlap warning badge */}
                {hasOverlap && !activeNow && (
                  <div className="absolute top-1 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white text-[9px] font-bold shadow-sm" title={isAr ? 'تداخل في الوقت مع حصة أخرى' : 'Conflit horaire'}>
                    <AlertCircle className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{isAr ? 'تداخل' : 'Conflit'}</span>
                  </div>
                )}

                {/* Top Resize Drag Handle */}
                <div
                  onMouseDown={(e) => handleStartMoveBlock(e, block, 'resize-top')}
                  className={`absolute top-0 inset-x-0 ${isUltraCompact ? 'h-1' : 'h-2'} cursor-ns-resize hover:bg-teal-500/40 z-30 transition-colors`}
                  title={isAr ? 'اسحب لتعديل وقت البدء' : "Glisser pour modifier l'heure de début"}
                />

                {isCompact ? (
                  // Compact Single-Row View for Short Blocks (5m, 10m, 15m, 20m)
                  <>
                    <div className="min-w-0 flex items-center gap-1.5 flex-1 pointer-events-auto">
                      {!isUltraCompact && (
                        <div
                          className="text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 cursor-grab active:cursor-grabbing shrink-0"
                          title={isAr ? 'اسحب لنقل الحصة' : 'Glisser pour déplacer'}
                        >
                          <GripVertical className="w-3 h-3" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(block.id);
                          if (!block.isCompleted) {
                            chimePlayer.playChime('complete');
                            toast.success(
                              isAr ? 'تم إنجاز الحصة ✓' : 'Tâche terminée ✓',
                              block.title,
                            );
                          } else {
                            chimePlayer.playChime('uncheck');
                            toast.info(
                              isAr ? 'إعادة المهمة للانتظار' : 'Tâche réactivée',
                              block.title,
                            );
                          }
                        }}
                        className={`${
                          isUltraCompact ? 'w-3.5 h-3.5 rounded-xs' : 'w-4 h-4 sm:w-5 sm:h-5 rounded-md'
                        } flex items-center justify-center shrink-0 border transition-all active:scale-95 cursor-pointer ${
                          block.isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                            : 'border-slate-300 dark:border-white/20 bg-white/80 dark:bg-white/5 hover:border-teal-500 text-transparent'
                        }`}
                        title={block.isCompleted ? (isAr ? 'إلغاء التأكيد' : 'Décocher') : (isAr ? 'تأكيد الإنجاز' : 'Valider')}
                      >
                        <Check className={`${isUltraCompact ? 'w-2 h-2' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'} text-white stroke-[3]`} />
                      </button>

                      <span
                        className={`${isUltraCompact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full shrink-0 ${
                          subjectData?.dotColor || ('dot' in cardTheme ? cardTheme.dot : 'bg-teal-500')
                        }`}
                      />

                      <span
                        className={`font-bold ${
                          isUltraCompact ? 'text-[10px]' : 'text-xs'
                        } truncate ${
                          block.isCompleted
                            ? 'line-through opacity-70'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {block.title}
                      </span>

                      <span
                        className={`font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 dark:bg-teal-500/20 rounded-md border border-teal-500/25 ${
                          isUltraCompact ? 'text-[9px] px-1 py-0' : 'text-[10px] px-1.5 py-0.5'
                        } shrink-0`}
                      >
                        {formatDurationLabel(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
                      {!isUltraCompact && (
                        <span className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-black/40 px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-white/10 hidden md:inline-flex">
                          {startTimeFormatted}-{endTimeFormatted}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditBlock(block);
                          chimePlayer.playChime('click');
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 hover:bg-slate-200/60 dark:hover:bg-white/10 hidden group-hover:inline-flex cursor-pointer transition-colors"
                        title={isAr ? 'تعديل' : 'Modifier'}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTimeBlock(block.id);
                          chimePlayer.playChime('delete');
                          toast.warning(
                            isAr ? 'تم حذف الحصة' : 'Tâche supprimée',
                            block.title,
                          );
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hidden group-hover:inline-flex cursor-pointer transition-colors"
                        title={isAr ? 'حذف الحصة' : 'Supprimer'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  // Full Multi-Row View for Normal/Long Blocks (>= 25m / height >= 36px)
                  <>
                    <div className="flex items-start justify-between gap-2 pointer-events-auto">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div
                          className="text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 cursor-grab active:cursor-grabbing shrink-0"
                          title={isAr ? 'اسحب لنقل الحصة' : "Glisser pour déplacer"}
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleComplete(block.id);
                            if (!block.isCompleted) {
                              chimePlayer.playChime('complete');
                              toast.success(
                                isAr ? 'تم إنجاز الحصة ✓' : 'Tâche terminée ✓',
                                block.title,
                              );
                            } else {
                              chimePlayer.playChime('uncheck');
                              toast.info(
                                isAr ? 'إعادة المهمة للانتظار' : 'Tâche réactivée',
                                block.title,
                              );
                            }
                          }}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all active:scale-95 cursor-pointer ${
                            block.isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                              : 'border-slate-300 dark:border-white/20 bg-white/80 dark:bg-white/5 hover:border-teal-500 text-transparent'
                          }`}
                          title={block.isCompleted ? (isAr ? 'إلغاء التأكيد' : 'Décocher') : (isAr ? 'تأكيد الإنجاز' : 'Valider')}
                        >
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </button>

                        <div className="truncate">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-xs sm:text-sm truncate ${block.isCompleted ? 'line-through opacity-70' : 'text-slate-900 dark:text-white'}`}>
                              {block.title}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 dark:bg-teal-500/20 px-2 py-0.5 rounded-md border border-teal-500/25">
                              {formatDurationLabel(duration)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${subjectData?.dotColor || ('dot' in cardTheme ? cardTheme.dot : 'bg-teal-500')}`}
                            />
                            <span>{getSubjectDisplayName(block.subject)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-black/40 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/10">
                          {startTimeFormatted} - {endTimeFormatted}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShiftBlockHours(block, -1);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 hover:bg-slate-200/60 dark:hover:bg-white/10 hidden group-hover:inline-flex cursor-pointer transition-colors"
                          title={isAr ? 'تقديم بساعة (-1h)' : "Avancer d'une heure (-1h)"}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShiftBlockHours(block, 1);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 hover:bg-slate-200/60 dark:hover:bg-white/10 hidden group-hover:inline-flex cursor-pointer transition-colors"
                          title={isAr ? 'تأخير بساعة (+1h)' : "Reculer d'une heure (+1h)"}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditBlock(block);
                            chimePlayer.playChime('click');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 hover:bg-slate-200/60 dark:hover:bg-white/10 cursor-pointer transition-colors"
                          title={isAr ? 'تعديل / تحديد الوقت' : 'Modifier'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTimeBlock(block.id);
                            chimePlayer.playChime('delete');
                            toast.warning(
                              isAr ? 'تم حذف الحصة' : 'Tâche supprimée',
                              block.title,
                            );
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                          title={isAr ? 'حذف الحصة' : 'Supprimer'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {block.notes && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-1">
                        {block.notes}
                      </div>
                    )}
                  </>
                )}

                {/* Bottom Resize Drag Handle */}
                <div
                  onMouseDown={(e) => handleStartMoveBlock(e, block, 'resize-bottom')}
                  className={`absolute bottom-0 inset-x-0 ${isUltraCompact ? 'h-1' : 'h-2'} cursor-ns-resize hover:bg-teal-500/40 z-30 transition-colors`}
                  title={isAr ? 'اسحب لتعديل وقت النهاية' : "Glisser pour modifier l'heure de fin"}
                />
              </div>
            );
          })}
        </div>

        {/* Empty state hint */}
        {dayBlocks.length === 0 && !isDragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {isAr ? 'لا توجد حصص لهذا اليوم — انقر + أو اسحب في الجدول لإضافة حصة' : 'Aucune tâche — cliquez + ou glissez pour bloquer une heure'}
            </span>
          </div>
        )}
      </div>

      {/* 4. DISMISSIBLE NOTIFICATION CARD AT BOTTOM RIGHT */}
      {isReminderVisible && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm w-full bg-white/95 dark:bg-[#192237]/95 border border-slate-200/90 dark:border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl animate-fade-in flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {isAr ? 'لم تراجع مادة' : "Vous n'avez pas étudié"} <strong>{isAr ? 'الرياضيات' : 'Mathématiques'}</strong> {isAr ? 'اليوم.' : "aujourd'hui."}
            </p>
            <button
              onClick={() => {
                setEditingBlockId(null);
                setModalStartMinutes(16 * 60);
                setModalDurationMinutes(90);
                setTaskTitle('');
                setTaskSubject('Mathématiques');
                setSubjectError('');
                setTaskNotes('');
                setNaturalInput('');
                setModalDayOption('today');
                setModalCustomDay(selectedDay);
                setModalMode('rapide');
                setIsCustomTimeExpanded(false);
                setIsDetailsExpanded(false);
                setIsModalOpen(true);
              }}
              className="mt-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              + {isAr ? 'إضافة حصة للمادة' : 'Ajouter une séance'}
            </button>
          </div>

          <button
            onClick={() => setIsReminderVisible(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl cursor-pointer"
            title={isAr ? 'إغلاق' : 'Fermer'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. "AJOUTER / MODIFIER UNE TÂCHE" MODAL DIALOG */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
              setEditingBlockId(null);
              setIsSubjectDropdownOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-3xl max-w-lg w-full p-5 sm:p-7 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4 my-6 animate-scale-in"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  {editingBlockId ? (
                    <Move className="w-4 h-4" />
                  ) : modalMode === 'rapide' ? (
                    <Zap className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Sliders className="w-4 h-4" />
                  )}
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-['Outfit'] text-slate-900 dark:text-white leading-tight">
                    {editingBlockId
                      ? isAr ? 'تعديل الحصة' : 'Modifier la tâche'
                      : modalMode === 'rapide'
                        ? isAr ? 'إضافة سريعة لحصة' : 'Ajout rapide'
                        : isAr ? 'تخصيص الحصة الدراسية' : 'Ajout détaillé'}
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {modalMode === 'rapide'
                      ? isAr ? 'المادة والمدة بنقرات بسيطة' : 'Matière + durée en 3 clics'
                      : isAr ? 'تحكم كامل في الأوقات والعنوان والملاحظات' : 'Contrôle complet des horaires et détails'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingBlockId(null);
                  setIsSubjectDropdownOpen(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#182030] border border-slate-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  setModalMode('rapide');
                  chimePlayer.playChime('click');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${modalMode === 'rapide'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isAr ? '⚡ السريع (3 نقرات)' : '⚡ Rapide'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalMode('precision');
                  chimePlayer.playChime('click');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${modalMode === 'precision'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isAr ? '🎯 وضع الدقة' : '🎯 Précision'}</span>
              </button>
            </div>

            {/* Quick Natural Language Bar */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={naturalInput}
                    onChange={(e) => setNaturalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (naturalInput.trim()) {
                          const parsed = parseNaturalLanguageTask(naturalInput);
                          if (parsed.title) setTaskTitle(parsed.title);
                          if (parsed.durationMins) setModalDurationMinutes(parsed.durationMins);
                          if (parsed.dayOffset === 1) setModalDayOption('tomorrow');
                          if (parsed.subject) {
                            setTaskSubject(parsed.subject);
                            setSubjectError('');
                            handleSaveModalTask(e, parsed.subject);
                            return;
                          }
                        }
                        handleSaveModalTask(e);
                      }
                    }}
                    placeholder={
                      isAr
                        ? 'اكتب مثلاً: رياضيات 45 دقيقة غداً...'
                        : 'Ex : maths 45min demain 1h30...'
                    }
                    className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#182030] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  <Sparkles className="w-4 h-4 text-teal-500 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={handleApplyNaturalLanguage}
                  className="px-3.5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white transition-transform active:scale-95 cursor-pointer shadow-sm text-xs font-bold flex items-center gap-1 shrink-0"
                  title={isAr ? 'تطبيق التحليل' : 'Appliquer'}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAr ? 'تطبيق' : 'OK'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveModalTask} onKeyDown={handleFormKeyDown} className="space-y-4 text-xs">
              {modalMode === 'rapide' ? (
                /* ------------------------------------------------------------- */
                /* REAL MINIMAL 'RAPIDE' FLOW (ZERO CLUTTER, 3 TAPS ONLY)       */
                /* ------------------------------------------------------------- */
                <div className="space-y-4">
                  {/* 1. Subject Quick-Pick Chips Row (Single Tap, No Dropdown) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>{isAr ? 'المادة الدراسية' : 'MATIÈRE'}</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      {taskSubject && (
                        <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                          {getSubjectDisplayName(taskSubject)} ✓
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5 scroll-smooth">
                      {BAC_SUBJECTS.map((s) => {
                        const isSelected = taskSubject === s.name;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setTaskSubject(s.name);
                              setSubjectError('');
                              chimePlayer.playChime('click');
                            }}
                            className={`px-3 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${isSelected
                              ? 'bg-teal-600 text-white border-teal-500 shadow-md ring-2 ring-teal-500/30 scale-[1.02]'
                              : 'bg-slate-50 dark:bg-[#182030] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-teal-500/40 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                              }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : s.dotColor}`} />
                            <span>{getSubjectDisplayName(s.name)}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 rtl:mr-0.5" />}
                          </button>
                        );
                      })}
                    </div>

                    {subjectError && (
                      <p className="mt-1.5 text-[11px] text-rose-500 font-bold flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{subjectError}</span>
                      </p>
                    )}
                  </div>

                  {/* 2. Day Pills (Today / Tomorrow only) */}
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      {isAr ? 'اليوم' : 'JOUR'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setModalDayOption('today');
                          chimePlayer.playChime('click');
                        }}
                        className={`py-2.5 px-4 rounded-2xl text-xs font-bold transition-all text-center cursor-pointer border ${modalDayOption === 'today'
                          ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#182030] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                      >
                        {isAr ? 'اليوم' : "Aujourd'hui"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModalDayOption('tomorrow');
                          chimePlayer.playChime('click');
                        }}
                        className={`py-2.5 px-4 rounded-2xl text-xs font-bold transition-all text-center cursor-pointer border ${modalDayOption === 'tomorrow'
                          ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#182030] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                      >
                        {isAr ? 'غداً' : 'Demain'}
                      </button>
                    </div>
                  </div>

                  {/* 3. ONE Single Duration Control (Presets Only) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>{isAr ? 'المدة' : 'DURÉE'}</span>
                      </label>
                      <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        {formatDurationLabel(modalDurationMinutes)}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { mins: 25, label: '25m', sub: 'Pomo' },
                        { mins: 45, label: '45m', sub: null },
                        { mins: 60, label: '1h', sub: '60m' },
                        { mins: 90, label: '1h30', sub: '90m' },
                        { mins: 120, label: '2h', sub: '120m' },
                      ].map((p) => {
                        const isSelected = modalDurationMinutes === p.mins;
                        return (
                          <button
                            key={p.mins}
                            type="button"
                            onClick={() => {
                              handleDurationPresetClick(p.mins);
                              chimePlayer.playChime('click');
                            }}
                            className={`py-2 px-1 rounded-2xl font-mono text-center transition-all cursor-pointer border flex flex-col items-center justify-center ${isSelected
                              ? 'bg-teal-600 text-white border-teal-500 shadow-md ring-2 ring-teal-500/30 scale-[1.02]'
                              : 'bg-slate-50 dark:bg-[#182030] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-teal-500/30'
                              }`}
                          >
                            <span className="text-xs font-bold">{p.label}</span>
                            {p.sub && (
                              <span className={`text-[9px] ${isSelected ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                {p.sub}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* ------------------------------------------------------------- */
                /* 'PRECISION' FULL FORM (COLLAPSED & STREAMLINED)               */
                /* ------------------------------------------------------------- */
                <div className="space-y-4">
                  {/* 1. Subject Field (Chips + Optional Dropdown) */}
                  <div ref={subjectDropdownRef} className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1">
                        <span>{isAr ? 'المادة' : 'MATIÈRE'}</span>
                        <span className="text-rose-500 font-black">*</span>
                      </label>
                      {subjectError && (
                        <span className="text-[11px] text-rose-500 font-bold flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          <span>{subjectError}</span>
                        </span>
                      )}
                    </div>

                    {/* Quick chips shortcut row in precision mode */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
                      {BAC_SUBJECTS.slice(0, 6).map((s) => {
                        const isSelected = taskSubject === s.name;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setTaskSubject(s.name);
                              setSubjectError('');
                              setIsSubjectDropdownOpen(false);
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${isSelected
                              ? 'bg-teal-600 text-white border-teal-500 font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-[#182030] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                              }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : s.dotColor}`} />
                            <span>{getSubjectDisplayName(s.name)}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                      className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#182030] border text-slate-900 dark:text-slate-100 font-medium flex items-center justify-between transition-all cursor-pointer ${subjectError
                        ? 'border-rose-500 ring-2 ring-rose-500/30'
                        : taskSubject
                          ? 'border-teal-500/50 hover:border-teal-500'
                          : 'border-slate-200 dark:border-white/15 hover:border-teal-500/40'
                        }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {taskSubject ? (
                          <>
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${BAC_SUBJECTS.find((s) => s.name === taskSubject)?.dotColor || 'bg-teal-500'
                                }`}
                            />
                            <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {getSubjectDisplayName(taskSubject)}
                            </span>
                          </>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>
                              {isAr ? 'اختر المادة * (إجباري)' : 'Sélectionner une matière *'}
                            </span>
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${isSubjectDropdownOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
                          }`}
                      />
                    </button>

                    {/* Dropdown Options List */}
                    {isSubjectDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-[#182030] border border-slate-200 dark:border-white/10 rounded-2xl max-h-52 overflow-y-auto no-scrollbar shadow-2xl p-1.5 ring-1 ring-black/10 dark:ring-black/50">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-white/5 mb-1">
                          {isAr ? 'قائمة المواد' : 'Matières disponibles'}
                        </div>
                        {BAC_SUBJECTS.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setTaskSubject(s.name);
                              setSubjectError('');
                              setIsSubjectDropdownOpen(false);
                            }}
                            className={`w-full p-2 rounded-xl text-left rtl:text-right text-xs font-semibold flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${taskSubject === s.name
                              ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-500/30'
                              : 'text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${s.dotColor}`} />
                              <span>{getSubjectDisplayName(s.name)}</span>
                            </div>
                            {taskSubject === s.name && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Jour Selection (Today / Tomorrow / Custom Day) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      {isAr ? 'اليوم' : 'JOUR'}
                    </label>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setModalDayOption('today');
                          setModalCustomDay(selectedDay);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${modalDayOption === 'today'
                          ? 'bg-teal-600 text-white shadow-sm border border-teal-500'
                          : 'bg-slate-100 dark:bg-[#182030] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                      >
                        {isAr ? 'اليوم' : "Aujourd'hui"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModalDayOption('tomorrow');
                          setModalCustomDay((selectedDay + 1) % 7);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${modalDayOption === 'tomorrow'
                          ? 'bg-teal-600 text-white shadow-sm border border-teal-500'
                          : 'bg-slate-100 dark:bg-[#182030] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                      >
                        {isAr ? 'غداً' : 'Demain'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalDayOption('custom')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${modalDayOption === 'custom' || modalDayOption === 'week'
                          ? 'bg-teal-600 text-white shadow-sm border border-teal-500'
                          : 'bg-slate-100 dark:bg-[#182030] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{isAr ? 'يوم مخصص' : 'Autre jour'}</span>
                      </button>
                    </div>

                    {(modalDayOption === 'custom' || modalDayOption === 'week') && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2">
                        {DAYS_OF_WEEK.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setModalCustomDay(d.id);
                              chimePlayer.playChime('click');
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${modalCustomDay === d.id
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-[#182030] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                          >
                            {isAr ? d.shortAr : d.short}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Duration Section (Presets Primary, Custom Time Expandable) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>{isAr ? 'المدة الزمنية' : 'DURÉE DE LA SÉANCE'}</span>
                      </label>
                      <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        {formatDurationLabel(modalDurationMinutes)}
                      </span>
                    </div>

                    {/* Primary Duration Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { mins: 5, label: '5m' },
                        { mins: 10, label: '10m' },
                        { mins: 15, label: '15m' },
                        { mins: 25, label: '25m (Pomo)' },
                        { mins: 30, label: '30m' },
                        { mins: 45, label: '45m' },
                        { mins: 60, label: '1h' },
                        { mins: 75, label: '1h15' },
                        { mins: 90, label: '1h30' },
                        { mins: 120, label: '2h' },
                        { mins: 150, label: '2h30' },
                        { mins: 180, label: '3h' },
                        { mins: 240, label: '4h' },
                      ].map((p) => {
                        const isSelected = modalDurationMinutes === p.mins;
                        return (
                          <button
                            key={p.mins}
                            type="button"
                            onClick={() => {
                              handleDurationPresetClick(p.mins);
                              chimePlayer.playChime('click');
                            }}
                            className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold transition-all cursor-pointer border ${isSelected
                              ? 'bg-teal-600 text-white border-teal-500 shadow-sm ring-1 ring-teal-400'
                              : 'bg-white dark:bg-[#182030] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Expandable Custom Time Sub-panel */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCustomTimeExpanded(!isCustomTimeExpanded)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-[#182030]/60 hover:bg-slate-200/60 dark:hover:bg-[#182030] text-slate-700 dark:text-slate-300 transition-colors text-xs font-semibold cursor-pointer border border-slate-200/60 dark:border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>{isAr ? 'تخصيص أوقات البدء والانتهاء والدقائق' : "Ajuster l'horaire précis (début, fin, slider)"}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCustomTimeExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isCustomTimeExpanded && (
                        <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#182030] border border-slate-200/80 dark:border-white/10 space-y-3 animate-scale-in">
                          {/* Start Time & End Time Inputs */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                {isAr ? 'وقت البدء' : 'Heure de début'}
                              </label>
                              <input
                                type="time"
                                value={minutesToTime(modalStartMinutes)}
                                onChange={(e) => {
                                  const mins = timeToMinutes(e.target.value);
                                  setModalStartMinutes(mins);
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-teal-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                {isAr ? 'وقت الانتهاء' : 'Heure de fin'}
                              </label>
                              <input
                                type="time"
                                value={minutesToTime(modalStartMinutes + modalDurationMinutes)}
                                onChange={(e) => {
                                  const endMins = timeToMinutes(e.target.value);
                                  if (endMins > modalStartMinutes) {
                                    setModalDurationMinutes(Math.max(1, endMins - modalStartMinutes));
                                  } else if (endMins < modalStartMinutes) {
                                    setModalDurationMinutes(Math.max(1, 24 * 60 - modalStartMinutes + endMins));
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-teal-500"
                              />
                            </div>
                          </div>

                          {/* Live Badges Display (Début -> Durée -> Fin) */}
                          <div className="grid grid-cols-3 gap-2 text-center pt-1">
                            <div className="p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/60 dark:border-white/5">
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold block">
                                {isAr ? 'البداية' : 'Début'}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {minutesToTime(modalStartMinutes)}
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-500/40 flex flex-col justify-center items-center shadow-xs">
                              <span className="text-[9px] text-teal-700 dark:text-teal-400 uppercase font-bold block">
                                {isAr ? 'المدة' : 'Durée'}
                              </span>
                              <span className="font-mono text-xs font-black text-teal-800 dark:text-teal-200">
                                {formatDurationLabel(modalDurationMinutes)}
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/60 dark:border-white/5">
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold block">
                                {isAr ? 'النهاية' : 'Fin'}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {minutesToTime(modalStartMinutes + modalDurationMinutes)}
                              </span>
                            </div>
                          </div>

                          {/* Custom Hours and Minutes Direct Number Inputs */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-[#111827] p-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                                {isAr ? 'ساعات:' : 'Heures:'}
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={12}
                                value={Math.floor(modalDurationMinutes / 60)}
                                onChange={(e) => {
                                  const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  const m = modalDurationMinutes % 60;
                                  setModalDurationMinutes(Math.max(1, h * 60 + m));
                                }}
                                className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#182030] text-center font-mono font-bold text-teal-700 dark:text-teal-300 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </div>

                            <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-[#111827] p-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                                {isAr ? 'دقائق:' : 'Minutes:'}
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={59}
                                step={1}
                                value={modalDurationMinutes % 60}
                                onChange={(e) => {
                                  const m = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                                  const h = Math.floor(modalDurationMinutes / 60);
                                  setModalDurationMinutes(Math.max(1, h * 60 + m));
                                }}
                                className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#182030] text-center font-mono font-bold text-teal-700 dark:text-teal-300 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </div>
                          </div>

                          {/* Interactive Duration Slider */}
                          <div className="space-y-1 pt-1">
                            <input
                              type="range"
                              min={1}
                              max={360}
                              step={1}
                              value={modalDurationMinutes}
                              onChange={(e) => setModalDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-full accent-teal-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                            />
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 px-1">
                              <span>1m</span>
                              <span>15m</span>
                              <span>1h</span>
                              <span>2h</span>
                              <span>3h</span>
                              <span>4h</span>
                              <span>6h</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Optional Details Expandable Section (Title & Notes) */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-[#182030]/60 hover:bg-slate-200/60 dark:hover:bg-[#182030] text-slate-700 dark:text-slate-300 transition-colors text-xs font-semibold cursor-pointer border border-slate-200/60 dark:border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <Pencil className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>{isAr ? 'العنوان والملاحظات (اختياري)' : 'Titre & notes (optionnel)'}</span>
                        {(taskTitle || taskNotes) && (
                          <span className="w-2 h-2 rounded-full bg-teal-500" />
                        )}
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDetailsExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isDetailsExpanded && (
                      <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#182030] border border-slate-200/80 dark:border-white/10 space-y-3 animate-scale-in">
                        {/* Title Field */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {isAr ? 'العنوان المخصص' : 'Titre personnalisé'}
                            </label>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {isAr ? 'اختياري' : 'Facultatif'}
                            </span>
                          </div>
                          <input
                            type="text"
                            placeholder={
                              isAr
                                ? 'مثال: حل مسائل الدوران، حفظ النص...'
                                : 'Ex: Résolution exercices nombres complexes...'
                            }
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                          />
                          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                            {isAr
                              ? '💡 إذا تُرك فارغاً، يُعتمد اسم المادة كعنوان تلقائياً.'
                              : '💡 Si vide, le nom de la matière sera utilisé automatiquement.'}
                          </p>
                        </div>

                        {/* Notes Field */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            {isAr ? 'ملاحظات وأهداف الحصة' : 'Notes & objectifs de la séance'}
                          </label>
                          <textarea
                            rows={2}
                            value={taskNotes}
                            onChange={(e) => setTaskNotes(e.target.value)}
                            placeholder={
                              isAr
                                ? 'أي تفاصيل، روابط تمارين، أهداف إنجاز...'
                                : 'Objectifs, pages à réviser, exercices ciblés...'
                            }
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                {editingBlockId ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteTimeBlock(editingBlockId);
                      setIsModalOpen(false);
                      setEditingBlockId(null);
                      setIsSubjectDropdownOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isAr ? 'حذف' : 'Supprimer'}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingBlockId(null);
                      setIsSubjectDropdownOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold transition-colors cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Annuler'}
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white font-bold transition-transform active:scale-95 shadow-md shadow-teal-600/25 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {editingBlockId
                        ? isAr
                          ? 'تحديث الحصة'
                          : 'Mettre à jour'
                        : isAr
                          ? 'حفظ الحصة'
                          : 'Enregistrer'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
