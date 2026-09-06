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
} from 'lucide-react';
import { ActivitySticker, AppLanguage, StickerActivityType, TaskItem, TimeBlock } from '../types';
import { ACTIVITY_STICKERS, BAC_SUBJECTS } from '../utils/constants';
import { useToast } from './Toast';
import { chimePlayer } from '../utils/audio';
import { calculateDailyStreak, getLocalDateStr } from '../utils/streak';

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

  // Match subjects
  for (const s of BAC_SUBJECTS) {
    if (lower.includes(s.name.toLowerCase()) || lower.includes(s.id.toLowerCase())) {
      subject = s.name;
      break;
    }
  }

  // Match day
  if (lower.includes('demain') || lower.includes('tomorrow')) {
    dayOffset = 1;
  }

  // Match duration: "1h30", "2h", "45min", "1h"
  const hMatch = lower.match(/(\d+)\s*h\s*(\d+)?/);
  if (hMatch) {
    const h = parseInt(hMatch[1], 10);
    const m = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    durationMins = h * 60 + m;
  } else {
    const minMatch = lower.match(/(\d+)\s*min/);
    if (minMatch) {
      durationMins = parseInt(minMatch[1], 10);
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

interface ActiveMoveState {
  blockId: string;
  initialBlock: TimeBlock;
  durationMinutes: number;
  grabOffsetMinutes: number;
  currentStartMinutes: number;
  type: 'move' | 'resize-top' | 'resize-bottom';
}

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
  const [modalMode, setModalMode] = useState<'precision' | 'rapide'>('precision');
  const [naturalInput, setNaturalInput] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [taskNotes, setTaskNotes] = useState('');

  // Selected Day Pill in modal: 'today' | 'tomorrow' | 'week' | 'custom'
  const [modalDayOption, setModalDayOption] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('today');

  // Time & Duration inside Modal
  const [modalStartMinutes, setModalStartMinutes] = useState(360); // 06:00
  const [modalDurationMinutes, setModalDurationMinutes] = useState(60); // 1h

  // Rapid Mode Period selection
  const [rapidPeriod, setRapidPeriod] = useState<'matin' | 'milieu' | 'aprem' | 'soir' | 'nuit'>('matin');

  // Dismissible reminder notification banner state
  const [isReminderVisible, setIsReminderVisible] = useState(true);

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
        const minEnd = activeMove.currentStartMinutes + 15;
        const maxEnd = TIMETABLE_END_HOUR * 60;
        const snappedEnd = Math.round(mins / 5) * 5;
        const boundedEnd = Math.max(minEnd, Math.min(maxEnd, snappedEnd));
        const newDuration = boundedEnd - activeMove.currentStartMinutes;

        setActiveMove((prev) => (prev ? { ...prev, durationMinutes: newDuration } : null));
      } else if (activeMove.type === 'resize-top') {
        const fixedEnd = activeMove.currentStartMinutes + activeMove.durationMinutes;
        const maxStart = fixedEnd - 15;
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

    // Ensure at least 30 minutes duration if clicked quickly
    let duration = rawEndMins - startMins;
    if (duration < 15) {
      duration = 60; // default 1 hour
    }

    setEditingBlockId(null);
    setModalStartMinutes(startMins);
    setModalDurationMinutes(duration);

    // Open clean modal with EMPTY fields for new task
    setEditingBlockId(null);
    setModalStartMinutes(startMins);
    setModalDurationMinutes(duration);
    setTaskTitle('');
    setTaskSubject('');
    setSubjectError('');
    setTaskNotes('');
    setNaturalInput('');
    setModalDayOption('today');

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
    setIsModalOpen(true);
  };

  // Global mouseup & mousemove listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging || activeMove) {
        handleGridMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, activeMove]);

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
    } else if (block.dayOfWeek === (selectedDay + 1) % 7) {
      setModalDayOption('tomorrow');
    } else {
      setModalDayOption('custom');
    }

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

  const handleSaveModalTask = (e: React.FormEvent) => {
    e.preventDefault();

    // Subject is MANDATORY (إجباري للمادة فقط)
    if (!taskSubject.trim()) {
      setSubjectError(
        isAr ? 'يرجى اختيار المادة إجبارياً لحفظ المهمة.' : 'Veuillez sélectionner une matière obligatoirement.'
      );
      setIsSubjectDropdownOpen(true);
      return;
    }

    let targetDay = selectedDay;
    if (modalDayOption === 'tomorrow') {
      targetDay = (selectedDay + 1) % 7;
    }

    const startStr = minutesToTime(modalStartMinutes);
    const endStr = minutesToTime(modalStartMinutes + modalDurationMinutes);
    // Title is OPTIONAL - falls back to selected subject name if empty
    const finalTitle = taskTitle.trim() || taskSubject.trim();

    const targetDateKey = computeDateKeyForDay(targetDay);

    if (editingBlockId) {
      const existing = timeBlocks.find((b) => b.id === editingBlockId);
      if (existing) {
        onUpdateTimeBlock({
          ...existing,
          title: finalTitle,
          subject: taskSubject.trim(),
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
        subject: taskSubject.trim(),
        isCompleted: false,
        type: 'study',
        notes: taskNotes.trim(),
        createdAt: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
    setEditingBlockId(null);
    setSubjectError('');
    chimePlayer.playChime('add');
    toast.success(
      isAr ? 'تم الحفظ بنجاح ✓' : editingBlockId ? 'Bloc mis à jour ✓' : 'Bloc ajouté ✓',
      isAr ? 'تم تسجيل الكتلة في جدولك' : `${taskSubject || taskTitle} · ${startStr} – ${endStr}`,
    );
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
  const dragDurationMins = Math.max(5, dragMaxMins - dragMinMins);
  const dragTopPx = minutesToPixelOffset(dragMinMins);
  const dragHeightPx = Math.max(24, minutesToPixelOffset(dragMaxMins) - dragTopPx);

  return (
    <div className="space-y-4 pb-16 select-none font-sans text-slate-100">
      {/* 1. TOP HEADER BAR: PLANNED TIME, SESSIONS, DATE SELECTOR & ADD BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#191515] p-3.5 sm:p-4 rounded-2xl border border-white/5 shadow-md">
        {/* Left: Stats Badges (1h planifiées • 0/1 sessions) & Direct Add Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {plannedStudyMinutes > 0 ? formatDurationLabel(plannedStudyMinutes) : '0h'}{' '}
              {isAr ? 'مخطط' : 'planifiées'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-400">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {completedSessionsCount}/{totalSessionsCount} {isAr ? 'حصص' : 'sessions'}
            </span>
          </div>

          {/* Daily Streak Flame Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${streakData.isTodayCompleted
              ? 'bg-orange-500/20 text-[#FF9600] border border-orange-500/40 shadow-xs'
              : 'bg-white/5 text-slate-400 border border-white/10'
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
              className={`w-3.5 h-3.5 ${streakData.isTodayCompleted ? 'text-[#FF9600] fill-current animate-pulse' : 'text-slate-500'
                }`}
            />
            <span>
              {streakData.currentStreak} {isAr ? 'أيام متتالية' : 'jours'}
            </span>
          </div>

          {/* Today Completed & Calculated Study Hours */}
          {completedStudyMinutes > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {formatDurationLabel(completedStudyMinutes)} {isAr ? 'منجزة ومحسوبة' : 'validées'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleOpenAddNewBlock(8 * 60)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-transform active:scale-95 shadow-sm shadow-teal-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إضافة حصة جديدة' : '+ Bloquer un créneau'}</span>
          </button>
        </div>

        {/* Right: Day Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {DAYS_OF_WEEK.map((d) => {
            const isSelected = selectedDay === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${isSelected
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
              >
                {isAr ? d.nameAr : d.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. "ACTIVITÉS" STICKERS BAR (DRAG & DROP TO TIMETABLE) */}
      <div className="bg-[#191515] p-3 rounded-2xl border border-white/5 shadow-md flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1 shrink-0 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            {isAr ? 'أنشطة (اسحب وضع في الجدول)' : 'ACTIVITÉS (Glisser-Déposer)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {ACTIVITY_STICKERS.map((sticker) => {
            const isBeingDragged = draggingSticker?.type === sticker.type;
            return (
              <div
                key={sticker.type}
                draggable
                onDragStart={(e) => {
                  setDraggingSticker(sticker);
                  e.dataTransfer.setData('text/plain', sticker.type);
                  e.dataTransfer.effectAllowed = 'copy';
                  chimePlayer.playChime('click');
                }}
                onDragEnd={() => {
                  setDraggingSticker(null);
                  setStickerDropY(null);
                  setStickerDropMinutes(null);
                }}
                onClick={() => handlePlaceActivitySticker(sticker)}
                className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border cursor-grab active:cursor-grabbing select-none transition-all duration-150 hover:scale-105 active:scale-95 shadow-xs ${isBeingDragged
                  ? 'opacity-40 scale-95 border-teal-400 ring-2 ring-teal-400/40'
                  : `${sticker.colorClass.bg} ${sticker.colorClass.border} ${sticker.colorClass.text} hover:shadow-md`
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

      {/* 3. FLUID DRAG-TO-BLOCK & DRAG-TO-MOVE TIMETABLE MATRIX */}
      <div className="relative bg-[#191515] rounded-3xl border border-white/5 shadow-2xl p-4 sm:p-6 overflow-hidden">
        {/* Main Coordinate Grid */}
        <div
          ref={gridContainerRef}
          id="timetable-drag-matrix"
          onMouseMove={handleGridMouseMove}
          onMouseDown={handleGridMouseDown}
          onMouseLeave={() => setHoverY(null)}
          onDragOver={(e) => {
            if (!gridContainerRef.current) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
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
          className={`relative min-h-[900px] select-none ${activeMove ? 'cursor-grabbing' : 'cursor-crosshair'
            }`}
          style={{ height: `${(TIMETABLE_END_HOUR - TIMETABLE_START_HOUR) * 2 * SLOT_HEIGHT_PX}px` }}
        >
          {/* Time lines & Background Grid */}
          {TIME_MARKERS.map((time, idx) => {
            const isHour = time.endsWith(':00');
            const topPx = idx * SLOT_HEIGHT_PX;

            return (
              <div
                key={time}
                style={{ top: `${topPx}px` }}
                className="absolute inset-x-0 flex items-center pointer-events-none"
              >
                {/* Left Time label */}
                <div className="w-16 shrink-0 text-right pr-4 font-mono text-xs text-slate-500 font-medium">
                  {isHour ? (
                    <span className="font-bold text-slate-300">{time}</span>
                  ) : (
                    <span className="text-slate-600 text-[10px]">{time}</span>
                  )}
                </div>

                {/* Horizontal Guideline */}
                <div
                  className={`flex-1 border-t ${isHour ? 'border-white/10' : 'border-dashed border-white/5'
                    }`}
                />
              </div>
            );
          })}

          {/* DYNAMIC HOVER TIME TAG & GUIDELINE */}
          {hoverY !== null && !isDragging && !activeMove && !draggingSticker && (
            <div
              style={{ top: `${hoverY}px` }}
              className="absolute inset-x-0 flex items-center pointer-events-none transition-all duration-75"
            >
              {/* Teal Pointed Badge */}
              <div className="w-16 shrink-0 text-right pr-2">
                <span className="inline-block px-1.5 py-0.5 rounded-md bg-teal-500 text-[#141010] font-mono text-[10px] font-extrabold shadow-sm">
                  {hoverTimeStr}
                </span>
              </div>
              {/* Red target dot */}
              <div className="w-2.5 h-2.5 -ml-1.5 rounded-full bg-red-500 border-2 border-[#191515] ring-2 ring-red-500/30" />
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
              className="absolute z-20 rounded-2xl border-2 border-teal-400 bg-teal-500/10 backdrop-blur-2xs shadow-xl flex items-center justify-center transition-all duration-75 pointer-events-none"
            >
              {/* Top guideline time tag */}
              <div
                style={{ top: '-14px', left: '-5rem' }}
                className="absolute flex items-center"
              >
                <span className="px-1.5 py-0.5 rounded-md bg-teal-500 text-[#141010] font-mono text-[10px] font-black">
                  {minutesToTime(dragMinMins)}
                </span>
              </div>

              {/* Center Floating Duration Pill */}
              <div className="px-3.5 py-1.5 rounded-full bg-teal-600 text-white font-mono text-xs font-black shadow-lg shadow-teal-900/50 border border-teal-300/40 animate-pulse">
                {formatDurationLabel(dragDurationMins)}
              </div>

              {/* Bottom Red Circular Drag Handle Following Cursor */}
              <div className="absolute bottom-2 left-6 w-6 h-6 rounded-full border-2 border-red-500 bg-red-500/20 flex items-center justify-center animate-bounce">
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
            </div>
          )}

          {/* DYNAMIC ACTIVE STICKER DRAG-AND-DROP GHOST PREVIEW */}
          {draggingSticker && stickerDropMinutes !== null && (
            <div
              style={{
                top: `${minutesToPixelOffset(stickerDropMinutes)}px`,
                height: `${Math.max(44, draggingSticker.defaultDurationMinutes * PIXELS_PER_MINUTE)}px`,
                left: '4.5rem',
                right: '1rem',
              }}
              className={`absolute z-30 rounded-2xl border-2 border-dashed ${draggingSticker.colorClass.border} ${draggingSticker.colorClass.bg} shadow-2xl backdrop-blur-xs flex items-center justify-between px-4 transition-all duration-75 pointer-events-none animate-pulse`}
            >
              {/* Top guideline time tag */}
              <div
                style={{ top: '-14px', left: '-5rem' }}
                className="absolute flex items-center"
              >
                <span className="px-1.5 py-0.5 rounded-md bg-teal-500 text-[#141010] font-mono text-[10px] font-black">
                  {minutesToTime(stickerDropMinutes)}
                </span>
              </div>

              {/* Left: Sticker icon, label and duration */}
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-black/40 border border-white/10 text-white shadow-inner">
                  {STICKER_ICONS[draggingSticker.type] || <Sparkles className="w-4 h-4 text-teal-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{draggingSticker.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/90 font-mono">
                      {draggingSticker.defaultDurationMinutes} min
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-teal-300">
                    {minutesToTime(stickerDropMinutes)} –{' '}
                    {minutesToTime(
                      Math.min(24 * 60, stickerDropMinutes + draggingSticker.defaultDurationMinutes)
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Drop indicator badge */}
              <div className="px-3 py-1 rounded-full bg-white/20 border border-white/30 text-xs font-bold text-white shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span>{isAr ? 'أفلت للوضع هنا' : 'Lâcher pour placer ici'}</span>
              </div>
            </div>
          )}

          {/* RENDERED TIME BLOCKS ON TIMETABLE */}
          {dayBlocks.map((block) => {
            const isBeingMoved = activeMove?.blockId === block.id;

            const startM = isBeingMoved
              ? activeMove.currentStartMinutes
              : timeToMinutes(block.startTime);
            const duration = isBeingMoved
              ? activeMove.durationMinutes
              : Math.max(15, timeToMinutes(block.endTime) - timeToMinutes(block.startTime));

            const topPx = minutesToPixelOffset(startM);
            const heightPx = Math.max(42, duration * PIXELS_PER_MINUTE);

            const isSticker = block.type === 'sticker_activity';
            const stickerData = isSticker
              ? ACTIVITY_STICKERS.find((s) => s.type === block.stickerType)
              : null;
            const subjectData = BAC_SUBJECTS.find((s) => s.name === block.subject);

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
                className={`time-block-card absolute p-3 rounded-2xl border transition-all select-none flex flex-col justify-between overflow-hidden group cursor-grab active:cursor-grabbing card-hover-elevate ${isBeingMoved
                  ? 'z-40 ring-2 ring-teal-400 shadow-2xl scale-[1.01] opacity-95 bg-[#251e1d]'
                  : isSticker && stickerData
                    ? `${stickerData.colorClass.bg} ${stickerData.colorClass.border} hover:border-teal-400/80 shadow-md`
                    : 'bg-[#231b1a] border-white/10 hover:border-teal-400/80 shadow-md'
                  }`}
              >
                {/* Top Resize Drag Handle */}
                <div
                  onMouseDown={(e) => handleStartMoveBlock(e, block, 'resize-top')}
                  className="absolute top-0 inset-x-0 h-2 cursor-ns-resize hover:bg-teal-400/40 z-30 transition-colors"
                  title="Glisser pour modifier l'heure de début"
                />

                {/* Card Header & Content */}
                <div className="flex items-start justify-between gap-2 pointer-events-auto">
                  <div className="min-w-0 flex items-center gap-2">
                    {/* Move Grip Icon */}
                    <div
                      className="text-slate-500 group-hover:text-teal-400 cursor-grab active:cursor-grabbing shrink-0"
                      title="Glisser pour déplacer à n'importe quelle heure"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Completion Checkbox */}
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
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 border transition-all button-spring ${block.isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white animate-check-pop'
                        : 'border-white/20 hover:border-teal-400 bg-white/5 text-transparent'
                        }`}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </button>

                    <div className="truncate">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">
                          {block.title}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-teal-400 bg-teal-950/60 px-1.5 py-0.5 rounded-md border border-teal-500/30">
                          {formatDurationLabel(duration)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${subjectData?.dotColor || 'bg-teal-400'
                            }`}
                        />
                        <span>{block.subject}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar (Quick Move, Edit, Delete) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Time Range Badge */}
                    <span className="text-[11px] font-mono font-bold text-slate-300 bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                      {startTimeFormatted} - {endTimeFormatted}
                    </span>

                    {/* Quick Shift Up (-30m / -1h) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShiftBlockHours(block, -1);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-white/10 hidden group-hover:inline-flex"
                      title="Avancer d'une heure (-1h)"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Shift Down (+30m / +1h) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShiftBlockHours(block, 1);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-white/10 hidden group-hover:inline-flex"
                      title="Reculer d'une heure (+1h)"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Pencil Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditBlock(block);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-white/10"
                      title="Modifier / Déplacer à une heure précise"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
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
                      className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10"
                      title="Supprimer la tâche"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {block.notes && (
                  <div className="text-[10px] text-slate-400 truncate mt-1">
                    {block.notes}
                  </div>
                )}

                {/* Bottom Resize Drag Handle */}
                <div
                  onMouseDown={(e) => handleStartMoveBlock(e, block, 'resize-bottom')}
                  className="absolute bottom-0 inset-x-0 h-2 cursor-ns-resize hover:bg-teal-400/40 z-30 transition-colors"
                  title="Glisser pour modifier l'heure de fin"
                />
              </div>
            );
          })}
        </div>

        {/* Empty state hint */}
        {dayBlocks.length === 0 && !isDragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-semibold text-slate-600">
              Aucune tâche — cliquez + ou glissez pour bloquer une heure
            </span>
          </div>
        )}
      </div>

      {/* 4. DISMISSIBLE NOTIFICATION CARD AT BOTTOM RIGHT */}
      {isReminderVisible && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm w-full bg-[#241c1c] border border-white/10 rounded-2xl p-4 shadow-2xl animate-fade-in flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Vous n'avez pas étudié <strong>Mathématiques</strong> aujourd'hui.
            </p>
            <button
              onClick={() => {
                setEditingBlockId(null);
                setModalStartMinutes(16 * 60);
                setModalDurationMinutes(90);
                setTaskTitle('Révision Mathématiques');
                setTaskSubject('Mathématiques');
                setIsModalOpen(true);
              }}
              className="mt-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 hover:underline flex items-center gap-1"
            >
              + Ajouter une séance
            </button>
          </div>

          <button
            onClick={() => setIsReminderVisible(false)}
            className="text-slate-500 hover:text-slate-300 p-1"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. "AJOUTER / MODIFIER UNE TÂCHE" MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#211a1a] text-slate-100 rounded-3xl max-w-lg w-full p-6 border border-white/10 shadow-2xl space-y-5 my-8 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-lg font-bold font-['Outfit'] text-white flex items-center gap-2">
                <span>{editingBlockId ? 'Modifier la tâche' : 'Ajouter une tâche'}</span>
                <span className="p-1 rounded-full bg-teal-500/20 text-teal-400">
                  {editingBlockId ? <Move className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                </span>
              </h2>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingBlockId(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Natural Language Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={naturalInput}
                onChange={(e) => setNaturalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyNaturalLanguage()}
                placeholder="Ex: révision maths demain soir 1h30..."
                className="flex-1 px-4 py-2.5 rounded-2xl bg-[#181313] border border-white/10 text-xs font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleApplyNaturalLanguage}
                className="p-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white transition-transform active:scale-95"
                title="Appliquer"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#181313] border border-white/5">
              <button
                type="button"
                onClick={() => setModalMode('rapide')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${modalMode === 'rapide'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Mode Rapide</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('precision')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${modalMode === 'precision'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>🎯 Précision</span>
              </button>
            </div>

            <form onSubmit={handleSaveModalTask} className="space-y-4 text-xs">
              {/* 1. TITRE FIELD (OPTIONNEL / اختياري) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {isAr ? 'العنوان (اختياري)' : 'TITRE (OPTIONNEL)'}
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {isAr ? 'ليس إجباري' : 'Facultatif'}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder={
                    isAr
                      ? 'مثال: مراجعة الرياضيات، حل التمارين... (اختياري)'
                      : 'Ex: Révision Maths, exercices... (optionnel)'
                  }
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181313] border border-white/10 text-slate-100 font-medium placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  {isAr
                    ? '💡 إذا تُرك العنوان فارغاً، سيتم اعتماد اسم المادة تلقائياً.'
                    : '💡 Si vide, le nom de la matière sera utilisé comme titre.'}
                </p>
              </div>

              {/* 2. MATIÈRE FIELD (OBLIGATOIRE / إجباري) */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-teal-400 flex items-center gap-1">
                    <span>{isAr ? 'المادة' : 'MATIÈRE'}</span>
                    <span className="text-rose-400 font-black">*</span>
                    <span className="text-[10px] text-rose-400 font-semibold">
                      ({isAr ? 'إجباري للاعتماد' : 'OBLIGATOIRE'})
                    </span>
                  </label>
                  {subjectError && (
                    <span className="text-[11px] text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      <span>{subjectError}</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                  className={`w-full px-4 py-2.5 rounded-xl bg-[#181313] border text-slate-100 font-medium flex items-center justify-between transition-all ${subjectError
                    ? 'border-rose-500 ring-2 ring-rose-500/30'
                    : taskSubject
                      ? 'border-teal-500/50 hover:border-teal-400'
                      : 'border-white/15 hover:border-white/30'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {taskSubject ? (
                      <>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${BAC_SUBJECTS.find((s) => s.name === taskSubject)?.dotColor || 'bg-teal-500'
                            }`}
                        />
                        <span className="truncate font-semibold text-slate-100">
                          {getSubjectDisplayName(taskSubject)}
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-400/90 font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          {isAr ? 'اختر المادة * (إجباري للاعتماد)' : 'Sélectionner une matière * (Obligatoire)'}
                        </span>
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${isSubjectDropdownOpen ? 'rotate-180 text-teal-400' : ''
                      }`}
                  />
                </button>

                {/* Dropdown Options List */}
                {isSubjectDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#181313] border border-white/10 rounded-2xl max-h-52 overflow-y-auto no-scrollbar shadow-2xl p-1.5 ring-1 ring-black/50">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase border-b border-white/5 mb-1">
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
                        className={`w-full p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between hover:bg-white/10 transition-colors ${taskSubject === s.name
                          ? 'text-teal-300 bg-teal-950/60 border border-teal-500/30'
                          : 'text-slate-300'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${s.dotColor}`} />
                          <span>{getSubjectDisplayName(s.name)}</span>
                        </div>
                        {taskSubject === s.name && <Check className="w-3.5 h-3.5 text-teal-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. JOUR SELECTION */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {isAr ? 'اليوم' : 'JOUR'}
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setModalDayOption('today')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${modalDayOption === 'today'
                      ? 'bg-rose-900/60 border border-rose-500 text-rose-200 shadow-sm'
                      : 'bg-[#181313] border border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {isAr ? 'اليوم' : "Aujourd'hui"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalDayOption('tomorrow')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${modalDayOption === 'tomorrow'
                      ? 'bg-rose-900/60 border border-rose-500 text-rose-200 shadow-sm'
                      : 'bg-[#181313] border border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {isAr ? 'غداً' : 'Demain'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalDayOption('week')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${modalDayOption === 'week'
                      ? 'bg-rose-900/60 border border-rose-500 text-rose-200 shadow-sm'
                      : 'bg-[#181313] border border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <span>{isAr ? 'هذا الأسبوع' : 'Cette semaine'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 4. TIME & DURATION CUSTOMIZATION (HORAIRE ET DURÉE PERSONNALISÉE) */}
              <div className="p-3.5 rounded-2xl bg-[#181313] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تخصيص الوقت والمدة' : 'HORAIRE & DURÉE PERSONNALISÉE'}</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-teal-300">
                    {formatDurationLabel(modalDurationMinutes)}
                  </span>
                </div>

                {/* Start Time & End Time Inputs */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      {isAr ? 'وقت البدء' : 'HEURE DE DÉBUT'}
                    </label>
                    <input
                      type="time"
                      value={minutesToTime(modalStartMinutes)}
                      onChange={(e) => {
                        const mins = timeToMinutes(e.target.value);
                        setModalStartMinutes(mins);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#211a1a] border border-white/10 text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      {isAr ? 'وقت الانتهاء' : 'HEURE DE FIN'}
                    </label>
                    <input
                      type="time"
                      value={minutesToTime(modalStartMinutes + modalDurationMinutes)}
                      onChange={(e) => {
                        const endMins = timeToMinutes(e.target.value);
                        if (endMins > modalStartMinutes) {
                          setModalDurationMinutes(endMins - modalStartMinutes);
                        } else if (endMins < modalStartMinutes) {
                          // Handle crossing midnight or wrap
                          setModalDurationMinutes(Math.max(15, 24 * 60 - modalStartMinutes + endMins));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#211a1a] border border-white/10 text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Live Badges Display (Début -> Durée -> Fin) */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 rounded-xl bg-[#211a1a] border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">
                      {isAr ? 'البداية' : 'DÉBUT'}
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {minutesToTime(modalStartMinutes)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-teal-950/80 border border-teal-500/40 flex flex-col justify-center items-center shadow-xs">
                    <span className="text-[9px] text-teal-400 uppercase font-bold block">
                      {isAr ? 'المدة' : 'DURÉE'}
                    </span>
                    <span className="font-mono text-xs font-black text-teal-200">
                      {formatDurationLabel(modalDurationMinutes)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#211a1a] border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">
                      {isAr ? 'النهاية' : 'FIN'}
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {minutesToTime(modalStartMinutes + modalDurationMinutes)}
                    </span>
                  </div>
                </div>

                {/* Custom Hours and Minutes Direct Number Inputs */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mb-1.5">
                    <span>{isAr ? 'تحديد المدة الدقيقة (ساعات ودقائق)' : 'Durée personnalisée'}</span>
                    <span className="text-teal-400 font-mono font-bold">
                      {modalDurationMinutes} {isAr ? 'دقيقة' : 'min'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5 bg-[#211a1a] p-1.5 rounded-xl border border-white/10">
                      <span className="text-xs font-bold text-slate-400 px-1">
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
                          setModalDurationMinutes(Math.max(5, h * 60 + m));
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-[#181313] text-center font-mono font-bold text-teal-300 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div className="flex-1 flex items-center gap-1.5 bg-[#211a1a] p-1.5 rounded-xl border border-white/10">
                      <span className="text-xs font-bold text-slate-400 px-1">
                        {isAr ? 'دقائق:' : 'Minutes:'}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        step={5}
                        value={modalDurationMinutes % 60}
                        onChange={(e) => {
                          const m = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                          const h = Math.floor(modalDurationMinutes / 60);
                          setModalDurationMinutes(Math.max(5, h * 60 + m));
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-[#181313] text-center font-mono font-bold text-teal-300 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive Duration Slider */}
                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min={5}
                    max={360}
                    step={5}
                    value={modalDurationMinutes}
                    onChange={(e) => setModalDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full accent-teal-500 cursor-pointer h-2 bg-[#211a1a] rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-1">
                    <span>5m</span>
                    <span>1h</span>
                    <span>2h</span>
                    <span>3h</span>
                    <span>4h</span>
                    <span>6h</span>
                  </div>
                </div>

                {/* Quick Duration Presets Chips */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    {isAr ? 'خيارات سريعة للمدة' : 'Raccourcis de durée'}
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { mins: 15, label: '15m' },
                      { mins: 25, label: '25m (Pomodoro)' },
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
                          onClick={() => handleDurationPresetClick(p.mins)}
                          className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold transition-all ${isSelected
                            ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/30 ring-1 ring-teal-400'
                            : 'bg-[#211a1a] border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/20'
                            }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                {editingBlockId ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteTimeBlock(editingBlockId);
                      setIsModalOpen(false);
                      setEditingBlockId(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 font-semibold transition-colors"
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
                    }}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold transition-colors"
                  >
                    {isAr ? 'إلغاء' : 'Annuler'}
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-transform active:scale-95 shadow-lg shadow-teal-900/50"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {editingBlockId
                        ? isAr
                          ? 'تحديث المهمة'
                          : 'Mettre à jour'
                        : isAr
                          ? 'حفظ المهمة'
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
