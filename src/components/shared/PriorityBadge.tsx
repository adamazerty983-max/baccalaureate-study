import React from 'react';
import { Flame, AlertTriangle, Clock, Check } from 'lucide-react';
import { PriorityLevel } from '../../types';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  showIcon?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true, className = '' }) => {
  switch (priority) {
    case 'urgent':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 shadow-xs shadow-purple-500/10 ${className}`}
        >
          {showIcon && <Flame className="w-3 h-3 text-purple-600 dark:text-purple-400 fill-purple-500/20 animate-pulse" />}
          <span>Urgent</span>
        </span>
      );
    case 'high':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 ${className}`}
        >
          {showIcon && <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
          <span>High</span>
        </span>
      );
    case 'medium':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 ${className}`}
        >
          {showIcon && <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
          <span>Medium</span>
        </span>
      );
    case 'low':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 ${className}`}
        >
          {showIcon && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
          <span>Low</span>
        </span>
      );
  }
};
