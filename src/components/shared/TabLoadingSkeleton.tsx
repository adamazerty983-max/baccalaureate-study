import React from 'react';

interface TabLoadingSkeletonProps {
  title?: string;
}

export const TabLoadingSkeleton: React.FC<TabLoadingSkeletonProps> = ({ title }) => {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-150 select-none pointer-events-none" aria-busy="true">
      {/* 1. Header Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-3.5 w-72 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-9 w-32 rounded-xl bg-teal-500/20 dark:bg-teal-500/10 border border-teal-500/20 animate-pulse" />
        </div>
      </div>

      {/* 2. Filter / Category Chips Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="h-8 w-20 rounded-xl bg-teal-500/20 dark:bg-teal-500/15 border border-teal-500/30 shrink-0 animate-pulse" />
        <div className="h-8 w-24 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0 animate-pulse" />
        <div className="h-8 w-24 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0 animate-pulse" />
        <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0 animate-pulse" />
      </div>

      {/* 3. Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/80 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-4 w-12 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
            <div className="h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-1.5 pt-1">
              <div className="h-3 w-full rounded-md bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-3 w-4/5 rounded-md bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabLoadingSkeleton;
