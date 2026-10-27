import React from 'react';

export const StudyHoursChartSkeleton: React.FC = () => {
  return (
    <div className="bento-card relative rounded-3xl bg-white/95 dark:bg-[#10192A]/95 border border-slate-200/80 dark:border-white/[0.08] shadow-xs p-5 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1">
            <div className="w-32 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="w-48 h-3 rounded-md bg-slate-100 dark:bg-slate-800/60" />
          </div>
        </div>
        <div className="w-40 h-8 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>

      <div className="w-full h-[240px] rounded-2xl bg-slate-100/50 dark:bg-slate-800/30 flex items-center justify-center">
        <div className="w-3/4 h-24 border-b border-l border-slate-200 dark:border-slate-800" />
      </div>
    </div>
  );
};
