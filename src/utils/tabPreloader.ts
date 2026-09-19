import { MainTabType } from '../components/shared/Sidebar';

// Centralized dynamic import loaders for all code-split tabs
export const tabLoaders: Record<Exclude<MainTabType, 'dashboard'>, () => Promise<unknown>> = {
  tasks: () => import('../components/tabs/TasksTab'),
  quizzes: () => import('../components/tabs/QuizzesTab'),
  homework: () => import('../components/tabs/HomeworkTab'),
  notes: () => import('../components/tabs/LectureNotesTab'),
  timeblocking: () => import('../components/tabs/TimeBlockingTab'),
  revision: () => import('../components/tabs/RevisionTab'),
  average: () => import('../components/tabs/AverageTab'),
  goals: () => import('../components/tabs/GoalsTab'),
  habits: () => import('../components/tabs/HabitsTab'),
  review: () => import('../components/tabs/WeeklyReviewTab'),
  settings: () => import('../components/tabs/SettingsTab'),
};

// Track which tabs have already been loaded or triggered
const preloadedTabs = new Set<string>();

/**
 * Preload a specific tab chunk on demand (e.g. on hover or focus).
 */
export function preloadTab(tabId: MainTabType | string): void {
  if (tabId === 'dashboard' || preloadedTabs.has(tabId)) return;
  const loader = tabLoaders[tabId as keyof typeof tabLoaders];
  if (loader) {
    preloadedTabs.add(tabId);
    loader().catch((err) => {
      preloadedTabs.delete(tabId);
      console.warn(`[tabPreloader] Failed to prefetch tab "${tabId}":`, err);
    });
  }
}

/**
 * Sequentially preload all secondary tabs during browser idle periods.
 * Uses requestIdleCallback with a 200ms setTimeout fallback.
 */
export function startIdleTabPreloading(delayMs = 800): () => void {
  const prefetchQueue: Array<keyof typeof tabLoaders> = [
    'tasks',
    'timeblocking',
    'quizzes',
    'homework',
    'notes',
    'habits',
    'settings',
    'average',
    'revision',
    'goals',
    'review',
  ];

  let isCancelled = false;
  let idleId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const scheduleNext = (index: number) => {
    if (isCancelled || index >= prefetchQueue.length) return;
    const tab = prefetchQueue[index];

    const runChunkLoad = () => {
      if (isCancelled) return;
      preloadTab(tab);
      // Wait a short slice before scheduling next tab so main thread stays completely free
      if (!isCancelled) {
        timeoutId = setTimeout(() => {
          scheduleNext(index + 1);
        }, 120);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (window as unknown as {
        requestIdleCallback: (cb: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback(
        (deadline) => {
          if (deadline.timeRemaining() > 10 || deadline.didTimeout) {
            runChunkLoad();
          } else {
            scheduleNext(index);
          }
        },
        { timeout: 2500 }
      );
    } else {
      timeoutId = setTimeout(runChunkLoad, 200);
    }
  };

  const initialTimer = setTimeout(() => {
    scheduleNext(0);
  }, delayMs);

  return () => {
    isCancelled = true;
    clearTimeout(initialTimer);
    if (timeoutId !== null) clearTimeout(timeoutId);
    if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
      (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
    }
  };
}
