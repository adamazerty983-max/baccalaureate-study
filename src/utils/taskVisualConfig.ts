import React from 'react';
import {
  BookOpen,
  GraduationCap,
  Target,
  Zap,
  Brain,
  Sparkles,
  Clock,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { AppLanguage, PriorityLevel, TaskType } from '../types';

export interface TaskTypeVisual {
  type: TaskType;
  labelFr: string;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  bgTint: string;
  borderAccent: string;
  dotColor: string;
}

export const TASK_TYPES_VISUAL: Record<TaskType, TaskTypeVisual> = {
  homework: {
    type: 'homework',
    labelFr: 'Devoir Maison',
    labelAr: 'واجب منزلي',
    labelEn: 'Homework',
    icon: BookOpen,
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
    bgTint: 'bg-teal-50/50 dark:bg-teal-950/15',
    borderAccent: 'border-teal-500/40',
    dotColor: 'bg-teal-500',
  },
  project: {
    type: 'project',
    labelFr: 'Projet / Devoir Prof',
    labelAr: 'مشروع / مهمة أستاذ',
    labelEn: 'Teacher Project',
    icon: GraduationCap,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    bgTint: 'bg-amber-50/50 dark:bg-amber-950/15',
    borderAccent: 'border-amber-500/40',
    dotColor: 'bg-amber-500',
  },
  exam: {
    type: 'exam',
    labelFr: 'Examen / Bac',
    labelAr: 'امتحان / بكالوريا',
    labelEn: 'Exam / Bac',
    icon: Target,
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    bgTint: 'bg-indigo-50/50 dark:bg-indigo-950/15',
    borderAccent: 'border-indigo-500/40',
    dotColor: 'bg-indigo-500',
  },
  quiz: {
    type: 'quiz',
    labelFr: 'Contrôle Continu',
    labelAr: 'فرض محروس',
    labelEn: 'Class Quiz',
    icon: Zap,
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    bgTint: 'bg-rose-50/50 dark:bg-rose-950/15',
    borderAccent: 'border-rose-500/40',
    dotColor: 'bg-rose-500',
  },
  revision: {
    type: 'revision',
    labelFr: 'Révision & Synthèse',
    labelAr: 'مراجعة وتلخيص',
    labelEn: 'Revision',
    icon: Brain,
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    bgTint: 'bg-sky-50/50 dark:bg-sky-950/15',
    borderAccent: 'border-sky-500/40',
    dotColor: 'bg-sky-500',
  },
  uncommon: {
    type: 'uncommon',
    labelFr: 'Date Limite Exceptionnelle',
    labelAr: 'موعد استثنائي',
    labelEn: 'Special Deadline',
    icon: Sparkles,
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    bgTint: 'bg-purple-50/50 dark:bg-purple-950/15',
    borderAccent: 'border-purple-500/40',
    dotColor: 'bg-purple-500',
  },
};

export type UrgencyGrade = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later';

export interface TaskUrgencyInfo {
  grade: UrgencyGrade;
  diffDays: number;
  label: string;
  badgeClass: string;
  borderLeftClass: string;
  cardBgClass: string;
  isUrgentAttention: boolean;
}

export function evaluateTaskUrgency(
  dueDate: string,
  dueTime?: string,
  priority: PriorityLevel = 'medium',
  language: AppLanguage = 'fr'
): TaskUrgencyInfo {
  const isAr = language === 'ar';
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      grade: 'overdue',
      diffDays,
      label: isAr ? `متأخر (${daysLate} يوم)` : `En retard (-${daysLate}j)`,
      badgeClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse font-bold',
      borderLeftClass: 'border-l-4 border-l-rose-500 rtl:border-l-0 rtl:border-r-4 rtl:border-r-rose-500',
      cardBgClass: 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300/80 dark:border-rose-900/60 shadow-rose-500/5',
      isUrgentAttention: true,
    };
  }

  if (diffDays === 0) {
    return {
      grade: 'today',
      diffDays,
      label: isAr ? 'يستحق اليوم ⏰' : "Aujourd'hui ⏰",
      badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold',
      borderLeftClass: 'border-l-4 border-l-amber-500 rtl:border-l-0 rtl:border-r-4 rtl:border-r-amber-500',
      cardBgClass: 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-900/60 shadow-amber-500/5',
      isUrgentAttention: true,
    };
  }

  if (diffDays === 1) {
    return {
      grade: 'tomorrow',
      diffDays,
      label: isAr ? 'غداً' : 'Demain',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium',
      borderLeftClass: 'border-l-3 border-l-amber-400 rtl:border-l-0 rtl:border-r-3 rtl:border-r-amber-400',
      cardBgClass: 'bg-white dark:bg-[#1A2535] border-slate-200/90 dark:border-slate-800',
      isUrgentAttention: priority === 'high' || priority === 'urgent',
    };
  }

  if (diffDays <= 3) {
    return {
      grade: 'soon',
      diffDays,
      label: isAr ? `بعد ${diffDays} أيام` : `Dans ${diffDays}j`,
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      borderLeftClass: priority === 'high' || priority === 'urgent'
        ? 'border-l-3 border-l-teal-500 rtl:border-l-0 rtl:border-r-3 rtl:border-r-teal-500'
        : 'border-l border-l-slate-200 dark:border-l-slate-800',
      cardBgClass: 'bg-white dark:bg-[#1A2535] border-slate-200/90 dark:border-slate-800',
      isUrgentAttention: priority === 'urgent',
    };
  }

  return {
    grade: 'later',
    diffDays,
    label: dueDate,
    badgeClass: 'bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/80',
    borderLeftClass: 'border-l border-l-slate-200 dark:border-l-slate-800',
    cardBgClass: 'bg-white dark:bg-[#1A2535] border-slate-200/80 dark:border-slate-800',
    isUrgentAttention: false,
  };
}
