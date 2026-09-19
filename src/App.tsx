import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sidebar, MainTabType, ALL_NAV_TABS } from './components/shared/Sidebar';
import { TopHeader } from './components/shared/TopHeader';
import { Dashboard } from './components/Dashboard';
import { TasksTab } from './components/tabs/TasksTab';
import { QuizzesTab } from './components/tabs/QuizzesTab';
import { HomeworkTab } from './components/tabs/HomeworkTab';
import { LectureNotesTab } from './components/tabs/LectureNotesTab';
import { TimeBlockingTab } from './components/tabs/TimeBlockingTab';
import { RevisionTab } from './components/tabs/RevisionTab';
import { AverageTab } from './components/tabs/AverageTab';
import { GoalsTab } from './components/tabs/GoalsTab';
import { HabitsTab } from './components/tabs/HabitsTab';
import { WeeklyReviewTab } from './components/tabs/WeeklyReviewTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { FocusModeModal } from './components/shared/FocusModeModal';
import { KeyboardShortcutsModal } from './components/shared/KeyboardShortcutsModal';
import { QuickAddModal } from './components/shared/QuickAddModal';
import { DatabaseModal } from './components/shared/DatabaseModal';
import { LoadingScreen } from './components/shared/LoadingScreen';
import { NotificationCenterModal } from './components/shared/NotificationCenterModal';
import { NotificationPermissionBanner } from './components/shared/NotificationPermissionBanner';
import { DesktopUpdateBanner } from './components/shared/DesktopUpdateBanner';
import { PlannerCursor } from './components/shared/PlannerCursor';
import { notificationService } from './services/notificationService';
import {
  initAuthListener,
  loadUserDataFromFirestore,
  saveUserDataToFirestore,
  DatabaseSyncState,
} from './services/firestoreService';

import {
  AppLanguage,
  AppSettings,
  FontSizeOption,
  FullAppData,
  GoalItem,
  GradeItem,
  HabitItem,
  HomeworkItem,
  LectureNote,
  LessonItem,
  QuizItem,
  TaskItem,
  ThemeMode,
  TimeBlock,
  WeeklyReviewData,
  MonthlyReviewData,
  InAppNotification,
} from './types';
import {
  getInitialAppData,
  loadStoredAppData,
  saveStoredAppData,
  loadFromIndexedDB,
} from './utils/storage';
import { mergeAppData, stampNow } from './utils/merge';
import { chimePlayer } from './utils/audio';

export default function App() {
  const [appData, setAppData] = useState<FullAppData>(() => loadStoredAppData());
  const [activeTab, setActiveTab] = useState<MainTabType>('dashboard');
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashFading, setIsSplashFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsSplashFading(true);
    }, 450);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 950);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Database and Auth State
  const [syncState, setSyncState] = useState<DatabaseSyncState>({
    status: 'idle',
    currentUser: null,
    lastSyncedAt: null,
    error: null,
  });
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  // Sidebar collapse & mobile state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bac_hub_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Focus Mode State
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [isFocusMinimized, setIsFocusMinimized] = useState(false);
  const [customFocusBlock, setCustomFocusBlock] = useState<TimeBlock | null>(null);

  // Keyboard Shortcuts Modal State
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Quick Add Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDefaultType, setQuickAddDefaultType] = useState<
    'task' | 'quiz' | 'homework' | 'note' | 'timeblock'
  >('task');

  // Notification Center State
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);

  // Initialize Notification Service and background scheduler loop
  useEffect(() => {
    notificationService.init().catch(console.warn);

    const unsubscribe = notificationService.subscribe((list) => {
      setInAppNotifications(list);
    });

    notificationService.startScheduler(appData);

    // Listen to deep-link navigation messages from Service Worker notification clicks
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE_TO_NOTIFICATION') {
        const tab = event.data.tab as MainTabType;
        if (tab && ALL_NAV_TABS.some((t) => t.id === tab)) {
          handleNavigateTab(tab);
        }
      }
    };

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      unsubscribe();
      notificationService.stopScheduler();
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  // Update Notification Service when appData changes
  useEffect(() => {
    notificationService.updateAppData(appData);
  }, [appData]);

  const language = appData.settings.language || 'fr';

  // 0. IndexedDB Dual Hydration: merge (not replace) so a stale snapshot
  // can never erase a completion written by the sync localStorage copy.
  useEffect(() => {
    loadFromIndexedDB()
      .then((idbData) => {
        if (idbData && idbData.updatedAt) {
          setAppData((prev) => mergeAppData(prev, idbData));
        }
      })
      .catch((err) => {
        console.warn('IndexedDB initial hydration note:', err);
      });
  }, []);

  // 0b. Cross-tab protection: if another tab saved while this one was open,
  // merge its snapshot instead of letting the next local save silently drop
  // whatever the other tab changed (completions included).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'baccalaureate_study_hub_fresh_v4' || !e.newValue) return;
      try {
        const incoming = JSON.parse(e.newValue) as FullAppData;
        setAppData((prev) => {
          const merged = mergeAppData(prev, incoming);
          if (merged === prev) {
            // Merge rejected the incoming snapshot as stale — re-assert the
            // winning state so the stale blob cannot win a future boot.
            saveStoredAppData(prev);
            return prev;
          }
          return merged;
        });
      } catch {
        /* malformed write from an old tab — ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 1. Firebase Auth & Initial Cloud Sync Listener
  useEffect(() => {
    const unsubscribe = initAuthListener(
      (user) => {
        if (!user) {
          setSyncState({
            status: 'offline',
            currentUser: null,
            lastSyncedAt: null,
            errorMessage: null,
            isAnonymous: true,
          });
        }
      },
      (remoteData) => {
        if (remoteData) {
          setAppData((prev) => {
            // Merge, don't replace: a stale cloud echo (or our own write re-stamped
            // by the server) must never delete a completion made since.
            const merged = mergeAppData(prev, remoteData);
            return merged === prev ? prev : merged;
          });
        }
      },
      (status) => {
        setSyncState(status);
      }
    );

    return () => unsubscribe();
  }, []);

  // Toggle Sidebar Collapse & Persist
  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bac_hub_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Language Change & Direction
  const handleChangeLanguage = (newLang: AppLanguage) => {
    setAppData((prev) => ({
      ...prev,
      settings: { ...prev.settings, language: newLang },
    }));
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Theme Management (Dark / Light / System)
  useEffect(() => {
    const root = document.documentElement;
    const theme = appData.settings.theme;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [appData.settings.theme]);

  // Interface Style Management (Classic / MyBac Tracker skin)
  // The whole skin lives in src/styles/mybac.css, scoped to this attribute, so
  // switching back to 'classic' is a one-attribute change with no side effects.
  useEffect(() => {
    const style = appData.settings.uiStyle === 'mybac' ? 'mybac' : 'classic';
    document.documentElement.dataset.uiStyle = style;
  }, [appData.settings.uiStyle]);

  // Audio Engine Sound & Volume Sync
  useEffect(() => {
    chimePlayer.setVolume(appData.settings.soundVolume ?? 0.45);
    chimePlayer.setEnabled(appData.settings.chimeSoundEnabled ?? true);
    chimePlayer.initGlobalListeners();
  }, [appData.settings.soundVolume, appData.settings.chimeSoundEnabled]);

  // Persistent LocalStorage & Cloud Database Auto-Save
  // lastPushedRef skips Firestore pushes for states that came FROM the cloud
  // (echoes) — otherwise the echo loop re-stamped the doc and forced every
  // other device to adopt a potentially stale snapshot.
  const lastPushedRef = useRef<FullAppData | null>(null);
  useEffect(() => {
    saveStoredAppData(appData);

    if (syncState.currentUser) {
      if (lastPushedRef.current === appData) return;
      const timer = setTimeout(async () => {
        try {
          lastPushedRef.current = appData;
          await saveUserDataToFirestore(syncState.currentUser!.uid, appData);
          setSyncState((prev) => ({
            ...prev,
            status: 'synced',
            lastSyncedAt: new Date().toLocaleTimeString(),
          }));
        } catch (err: any) {
          console.warn('Firestore auto-save notification:', err);
        }
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [appData, syncState.currentUser?.uid]);

  // 4. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        if (e.key === 'Escape') {
          setIsFocusModeOpen(false);
          setIsShortcutsOpen(false);
          setIsQuickAddOpen(false);
        }
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFocusModeOpen((prev) => !prev);
      } else if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleToggleTheme();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleSound();
      } else if (e.key === 'Escape') {
        setIsFocusModeOpen(false);
        setIsShortcutsOpen(false);
        setIsQuickAddOpen(false);
      } else if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        const tabs: MainTabType[] = [
          'dashboard',
          'quizzes',
          'homework',
          'notes',
          'timeblocking',
          'revision',
          'average',
          'goals',
          'habits',
        ];
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) {
          handleNavigateTab(tabs[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appData.settings.theme, appData.settings.chimeSoundEnabled, activeTab]);

  // Calculate days remaining to Baccalaureate
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(appData.settings.baccalaureateDate || '2026-06-10').getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
    )
  );

  // Directional Navigation with View Transitions API
  const handleNavigateTab = useCallback(
    (newTab: MainTabType) => {
      if (newTab === activeTab) return;

      const currentIndex = ALL_NAV_TABS.findIndex((t) => t.id === activeTab);
      const nextIndex = ALL_NAV_TABS.findIndex((t) => t.id === newTab);
      const isForward = nextIndex > currentIndex;
      const direction = isForward ? 'forward' : 'backward';

      // Feature detect View Transitions API
      if (!('startViewTransition' in document)) {
        setActiveTab(newTab);
        return;
      }

      try {
        // Modern View Transitions API with directional types
        (document as any).startViewTransition({
          update: () => {
            setActiveTab(newTab);
          },
          types: [direction],
        });
      } catch {
        // Fallback for browsers with startViewTransition without types support
        try {
          (document as any).startViewTransition(() => {
            setActiveTab(newTab);
          });
        } catch {
          setActiveTab(newTab);
        }
      }
    },
    [activeTab]
  );

  // Settings & Theme Toggles with View Transitions
  // `origin` = center of the clicked toggle button → the new theme expands as a
  // circular reveal from the button. The old view stays fully visible beneath,
  // so fixed elements like the mobile drawer never flicker.
  const handleToggleTheme = (origin?: { x: number; y: number }) => {
    chimePlayer.playChime('theme_toggle');
    const current = appData.settings.theme;
    const nextTheme: ThemeMode = current === 'dark' ? 'light' : 'dark';
    const updateTheme = () => {
      setAppData((prev) => ({
        ...prev,
        settings: { ...prev.settings, theme: nextTheme },
      }));
    };

    const doc = document as any;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!('startViewTransition' in doc) || prefersReducedMotion) {
      updateTheme();
      return;
    }

    try {
      const transition = doc.startViewTransition({
        update: updateTheme,
        types: ['theme-toggle'],
      });

      transition.ready
        ?.then(() => {
          const x = origin?.x ?? window.innerWidth / 2;
          const y = origin?.y ?? window.innerHeight / 2;
          const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
          );
          doc.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 500,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
        })
        .catch(() => {
          // Transition skipped — nothing to animate
        });
    } catch {
      updateTheme();
    }
  };

  const handleToggleSound = () => {
    const nextVal = !appData.settings.chimeSoundEnabled;
    if (nextVal) {
      chimePlayer.setEnabled(true);
      chimePlayer.playChime('click');
    } else {
      chimePlayer.playChime('click');
      setTimeout(() => chimePlayer.setEnabled(false), 80);
    }
    setAppData((prev) => ({
      ...prev,
      settings: { ...prev.settings, chimeSoundEnabled: nextVal },
    }));
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setAppData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
      updatedAt: new Date().toISOString(),
    }));
  };

  // Task Handlers & Streak Confirmation Logic
  const handleAddTask = (newTask: Omit<TaskItem, 'id' | 'createdAt'>) => {
    const item: TaskItem = {
      ...newTask,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      tasks: [item, ...(prev.tasks || [])],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateTask = (updatedTask: TaskItem) => {
    setAppData((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setAppData((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).filter((t) => t.id !== taskId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleToggleTaskComplete = (taskId: string) => {
    setAppData((prev) => {
      const now = new Date().toISOString();
      const updated = (prev.tasks || []).map((t) => {
        if (t.id !== taskId) return t;
        const isNowCompleted = t.status !== 'completed';
        return stampNow(
          {
            ...t,
            status: (isNowCompleted ? 'completed' : 'todo') as any,
            completedAt: isNowCompleted ? now : undefined,
          },
          now
        );
      });
      return {
        ...prev,
        tasks: updated,
        updatedAt: now,
      };
    });
  };

  // Exam / Quiz Handlers
  const handleAddQuiz = (newQuiz: Omit<QuizItem, 'id' | 'createdAt'>) => {
    const item: QuizItem = {
      ...newQuiz,
      id: `quiz-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      quizzes: [item, ...prev.quizzes],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateQuiz = (updatedQuiz: QuizItem) => {
    setAppData((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((q) => (q.id === updatedQuiz.id ? updatedQuiz : q)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteQuiz = (quizId: string) => {
    setAppData((prev) => ({
      ...prev,
      quizzes: prev.quizzes.filter((q) => q.id !== quizId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleToggleQuizStatus = (quizId: string) => {
    setAppData((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((q) =>
        q.id === quizId
          ? {
            ...q,
            status: q.status === 'completed' ? 'upcoming' : 'completed',
          }
          : q
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Homework Handlers
  const handleAddHomework = (newHw: Omit<HomeworkItem, 'id' | 'createdAt'>) => {
    const item: HomeworkItem = {
      ...newHw,
      id: `hw-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      homework: [item, ...prev.homework],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateHomework = (updatedHw: HomeworkItem) => {
    setAppData((prev) => ({
      ...prev,
      homework: prev.homework.map((h) => (h.id === updatedHw.id ? updatedHw : h)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteHomework = (hwId: string) => {
    setAppData((prev) => ({
      ...prev,
      homework: prev.homework.filter((h) => h.id !== hwId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleToggleHomeworkStatus = (hwId: string) => {
    setAppData((prev) => ({
      ...prev,
      homework: prev.homework.map((h) =>
        h.id === hwId
          ? {
            ...h,
            status: h.status === 'submitted' ? 'pending' : 'submitted',
          }
          : h
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Lecture Note Handlers
  const handleAddNote = (newNote: Omit<LectureNote, 'id' | 'createdAt'>) => {
    const item: LectureNote = {
      ...newNote,
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      notes: [item, ...prev.notes],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateNote = (updatedNote: LectureNote) => {
    setAppData((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === updatedNote.id ? updatedNote : n)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteNote = (noteId: string) => {
    setAppData((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Time Block Handlers
  const handleAddTimeBlock = (newBlock: Omit<TimeBlock, 'id'>) => {
    const today = new Date().toISOString().slice(0, 10);
    const item: TimeBlock = {
      ...newBlock,
      id: `tb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dateKey: newBlock.dateKey || today,
      createdAt: newBlock.createdAt || new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      timeBlocks: [...prev.timeBlocks, item],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateTimeBlock = (updatedBlock: TimeBlock) => {
    setAppData((prev) => ({
      ...prev,
      timeBlocks: prev.timeBlocks.map((b) => (b.id === updatedBlock.id ? stampNow(updatedBlock) : b)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteTimeBlock = (blockId: string) => {
    setAppData((prev) => ({
      ...prev,
      timeBlocks: prev.timeBlocks.filter((b) => b.id !== blockId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleToggleBlockComplete = (blockId: string) => {
    setAppData((prev) => {
      const now = new Date().toISOString();
      const today = new Date().toISOString().slice(0, 10);
      return {
        ...prev,
        timeBlocks: prev.timeBlocks.map((b) => {
          if (b.id !== blockId) return b;
          const willBeCompleted = !b.isCompleted;
          return stampNow(
            {
              ...b,
              isCompleted: willBeCompleted,
              completedAt: willBeCompleted ? new Date().toISOString() : undefined,
              dateKey: b.dateKey || today,
            },
            now
          );
        }),
        updatedAt: now,
      };
    });
  };

  // Lessons (Spaced Repetition) Handlers
  const handleAddLesson = (newLesson: Omit<LessonItem, 'id' | 'createdAt'>) => {
    const item: LessonItem = {
      ...newLesson,
      id: `ls-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      lessons: [item, ...(prev.lessons || [])],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleReviewLesson = (lessonId: string, easeRating: 1 | 2 | 3 | 4 | 5) => {
    setAppData((prev) => {
      const today = new Date().toISOString().slice(0, 10);
      const updated = (prev.lessons || []).map((l) => {
        if (l.id !== lessonId) return l;
        const currentStage = l.stage;
        let nextStage = Math.min(5, currentStage + 1);
        if (easeRating <= 2) {
          nextStage = Math.max(1, currentStage - 1);
        }

        // Intervals in days: J+1, J+3, J+7, J+14, J+30
        const intervalDays = [1, 3, 7, 14, 30][nextStage - 1] || 14;
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

        return {
          ...l,
          stage: nextStage,
          lastReviewed: today,
          nextReviewDate: nextReviewDate.toISOString().slice(0, 10),
          masteryLevel: Math.min(100, Math.max(20, easeRating * 20)),
          isMemorized: nextStage >= 4,
        };
      });
      return { ...prev, lessons: updated, updatedAt: new Date().toISOString() };
    });
  };

  const handleDeleteLesson = (lessonId: string) => {
    setAppData((prev) => ({
      ...prev,
      lessons: (prev.lessons || []).filter((l) => l.id !== lessonId),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Grades Handlers
  const handleAddGrade = (grade: Omit<GradeItem, 'id'>) => {
    const item: GradeItem = { ...grade, id: `gr-${Date.now()}` };
    setAppData((prev) => ({
      ...prev,
      grades: [item, ...(prev.grades || [])],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteGrade = (gradeId: string) => {
    setAppData((prev) => ({
      ...prev,
      grades: (prev.grades || []).filter((g) => g.id !== gradeId),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Goals Handlers
  const handleAddGoal = (goal: Omit<GoalItem, 'id'>) => {
    const item: GoalItem = { ...goal, id: `gl-${Date.now()}` };
    setAppData((prev) => ({
      ...prev,
      goals: [item, ...(prev.goals || [])],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleToggleGoal = (goalId: string) => {
    setAppData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) =>
        g.id === goalId ? { ...g, done: !g.done } : g
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteGoal = (goalId: string) => {
    setAppData((prev) => ({
      ...prev,
      goals: (prev.goals || []).filter((g) => g.id !== goalId),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Habits Handlers
  const handleToggleHabitDay = (habitId: string, dateStr: string) => {
    setAppData((prev) => {
      const updated = (prev.habits || []).map((h) => {
        if (h.id !== habitId) return h;
        const exists = h.history.includes(dateStr);
        const newHistory = exists
          ? h.history.filter((d) => d !== dateStr)
          : [...h.history, dateStr];

        // Recalculate streak
        const streak = newHistory.length;
        return {
          ...h,
          history: newHistory,
          streak,
        };
      });
      return { ...prev, habits: updated, updatedAt: new Date().toISOString() };
    });
  };

  const handleAddHabit = (name: string, subject: string, icon: string) => {
    const item: HabitItem = {
      id: `hb-${Date.now()}`,
      name,
      subject,
      icon,
      streak: 1,
      history: [new Date().toISOString().slice(0, 10)],
      frequency: 'daily',
    };
    setAppData((prev) => ({
      ...prev,
      habits: [...(prev.habits || []), item],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteHabit = (habitId: string) => {
    setAppData((prev) => ({
      ...prev,
      habits: (prev.habits || []).filter((h) => h.id !== habitId),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Weekly & Monthly Review Handlers
  const handleSaveWeeklyReview = (weekMondayKey: string, review: WeeklyReviewData) => {
    setAppData((prev) => ({
      ...prev,
      weeklyReviews: {
        ...(prev.weeklyReviews || {}),
        [weekMondayKey]: review,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSaveMonthlyReview = (monthKey: string, review: MonthlyReviewData) => {
    setAppData((prev) => ({
      ...prev,
      monthlyReviews: {
        ...(prev.monthlyReviews || {}),
        [monthKey]: review,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  // Full Data Import & Reset Handlers
  const handleImportData = (importedData: FullAppData) => {
    setAppData(importedData);
  };

  const handleResetData = () => {
    const initial = getInitialAppData();
    setAppData(initial);
  };

  // Counts for sidebar badges
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueRevisionsCount = useMemo(() => {
    return (appData.lessons || []).filter((l) => l.nextReviewDate <= todayStr).length;
  }, [appData.lessons, todayStr]);

  const itemCounts = useMemo(
    () => ({
      upcomingQuizzes: appData.quizzes.filter((q) => q.status !== 'completed').length,
      pendingHomework: appData.homework.filter((h) => h.status !== 'submitted').length,
      pendingTasks: (appData.tasks || []).filter((t) => t.status !== 'completed').length,
      dueRevisions: dueRevisionsCount,
    }),
    [appData.quizzes, appData.homework, appData.tasks, dueRevisionsCount]
  );

  // Active timeblock for Focus Mode
  const activeFocusBlock = useMemo(() => {
    if (customFocusBlock) return customFocusBlock;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    return (
      appData.timeBlocks.find((b) => {
        const [sh, sm] = b.startTime.split(':').map(Number);
        const [eh, em] = b.endTime.split(':').map(Number);
        const start = sh * 60 + sm;
        const end = eh * 60 + em;
        return currentMins >= start && currentMins < end && !b.isCompleted;
      }) || null
    );
  }, [appData.timeBlocks, customFocusBlock]);

  // Start Focus Mode with optional preset subject
  const handleStartFocusMode = (subjectName?: string) => {
    if (subjectName) {
      const now = new Date();
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const sh = pad(now.getHours());
      const sm = pad(now.getMinutes());
      const endTotal = now.getHours() * 60 + now.getMinutes() + 25;
      const eh = pad(Math.floor(endTotal / 60) % 24);
      const em = pad(endTotal % 60);

      setCustomFocusBlock({
        id: `focus-${Date.now()}`,
        title: `Focus Session — ${subjectName}`,
        subject: subjectName,
        type: 'study',
        startTime: `${sh}:${sm}`,
        endTime: `${eh}:${em}`,
        dayOfWeek: now.getDay(),
        dateKey: now.toISOString().slice(0, 10),
        isCompleted: false,
        createdAt: now.toISOString(),
      });
    } else {
      setCustomFocusBlock(null);
    }
    chimePlayer.playChime('modal_open');
    setIsFocusMinimized(false);
    setIsFocusModeOpen(true);
  };

  // Log custom focus session directly to study hours & planner
  const handleLogCustomSession = (subject: string, minutes: number, title?: string) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const endHours = now.getHours();
    const endMinutes = now.getMinutes();
    const startTotalMins = Math.max(0, endHours * 60 + endMinutes - minutes);
    const startH = Math.floor(startTotalMins / 60);
    const startM = startTotalMins % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    handleAddTimeBlock({
      title: title || `Session Focus — ${subject}`,
      subject,
      type: 'study',
      startTime: `${pad(startH)}:${pad(startM)}`,
      endTime: `${pad(endHours)}:${pad(endMinutes)}`,
      dayOfWeek: now.getDay(),
      dateKey: today,
      isCompleted: true,
      completedAt: now.toISOString(),
      createdAt: now.toISOString(),
    });
    setCustomFocusBlock(null);
  };

  const handleRefreshApp = () => {
    // Merge instead of replace: reads back the persisted copy without letting a
    // stale snapshot erase anything done since it was written.
    const refreshed = loadStoredAppData();
    setAppData((prev) => mergeAppData(prev, refreshed));
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#0E1522] dark:text-slate-100 transition-colors font-['Inter']">
      {/* Smooth trailing cursor — only revealed inside the planner task list */}
      <PlannerCursor />

      {/* 1. Left Vertical Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        settings={appData.settings}
        language={language}
        onChangeLanguage={handleChangeLanguage}
        onToggleTheme={(origin) => handleToggleTheme(origin)}
        onToggleSound={handleToggleSound}
        daysRemaining={daysRemaining}
        counts={itemCounts}
        syncState={syncState}
        onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <TopHeader
          activeTab={activeTab}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebarCollapse}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onOpenQuickAdd={() => {
            chimePlayer.playChime('modal_open');
            setQuickAddDefaultType('task');
            setIsQuickAddOpen(true);
          }}
          onOpenFocusMode={() => {
            chimePlayer.playChime('modal_open');
            setIsFocusMinimized(false);
            setIsFocusModeOpen(true);
          }}
          onOpenShortcuts={() => {
            chimePlayer.playChime('modal_open');
            setIsShortcutsOpen(true);
          }}
          onOpenDatabaseModal={() => {
            chimePlayer.playChime('modal_open');
            setIsDatabaseModalOpen(true);
          }}
          syncState={syncState}
          onRefresh={handleRefreshApp}
          settings={appData.settings}
          language={language}
          onToggleTheme={handleToggleTheme}
          onToggleSound={handleToggleSound}
          daysRemaining={daysRemaining}
          unreadNotificationCount={inAppNotifications.filter((n) => !n.read).length}
          onOpenNotifications={() => {
            setIsNotificationCenterOpen(true);
          }}
        />

        {/* Desktop Application Auto-Update Banner (Electron only) */}
        <DesktopUpdateBanner language={language} />

        {/* Proactive Notification Permission Banner (non-blocking, dismissible) */}
        <NotificationPermissionBanner language={language} />

        {/* Tab View Container with View Transitions API isolation */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 main-tab-content">
          {activeTab === 'dashboard' && (
            <Dashboard
              appData={appData}
              language={language}
              onNavigateTab={(tab) => handleNavigateTab(tab as MainTabType)}
              onToggleHomework={handleToggleHomeworkStatus}
              onToggleTaskComplete={handleToggleTaskComplete}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onOpenFocusMode={() => {
                chimePlayer.playChime('modal_open');
                setIsFocusMinimized(false);
                setIsFocusModeOpen(true);
              }}
              onUpdateBacDate={(newDate, newStartDate) =>
                handleUpdateSettings({
                  baccalaureateDate: newDate,
                  ...(newStartDate ? { academicYearStartDate: newStartDate } : {}),
                })
              }
            />
          )}

          {activeTab === 'tasks' && (
            <TasksTab
              tasks={appData.tasks || []}
              timeBlocks={appData.timeBlocks || []}
              language={language}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onToggleTaskComplete={handleToggleTaskComplete}
            />
          )}

          {activeTab === 'quizzes' && (
            <QuizzesTab
              quizzes={appData.quizzes}
              onAddQuiz={handleAddQuiz}
              onUpdateQuiz={handleUpdateQuiz}
              onDeleteQuiz={handleDeleteQuiz}
              onToggleStatus={handleToggleQuizStatus}
            />
          )}

          {activeTab === 'homework' && (
            <HomeworkTab
              homework={appData.homework}
              onAddHomework={handleAddHomework}
              onUpdateHomework={handleUpdateHomework}
              onDeleteHomework={handleDeleteHomework}
              onToggleStatus={handleToggleHomeworkStatus}
            />
          )}

          {activeTab === 'notes' && (
            <LectureNotesTab
              notes={appData.notes}
              homework={appData.homework}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeTab === 'timeblocking' && (
            <TimeBlockingTab
              timeBlocks={appData.timeBlocks}
              tasks={appData.tasks || []}
              language={language}
              onAddTimeBlock={handleAddTimeBlock}
              onUpdateTimeBlock={handleUpdateTimeBlock}
              onDeleteTimeBlock={handleDeleteTimeBlock}
              onToggleComplete={handleToggleBlockComplete}
            />
          )}

          {activeTab === 'revision' && (
            <RevisionTab
              lessons={appData.lessons || []}
              language={language}
              onAddLesson={handleAddLesson}
              onReviewLesson={handleReviewLesson}
              onDeleteLesson={handleDeleteLesson}
            />
          )}

          {activeTab === 'average' && (
            <AverageTab
              grades={appData.grades || []}
              language={language}
              customCoefficients={appData.settings.customCoefficients}
              onAddGrade={handleAddGrade}
              onDeleteGrade={handleDeleteGrade}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsTab
              goals={appData.goals || []}
              language={language}
              onAddGoal={handleAddGoal}
              onToggleGoal={handleToggleGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {activeTab === 'habits' && (
            <HabitsTab
              habits={appData.habits || []}
              habitLogs={appData.habitLogs || {}}
              tasks={appData.tasks || []}
              timeBlocks={appData.timeBlocks || []}
              language={language}
              onToggleHabitDay={handleToggleHabitDay}
              onToggleHabit={handleToggleHabitDay}
              onAddHabit={handleAddHabit}
              onDeleteHabit={handleDeleteHabit}
            />
          )}

          {activeTab === 'review' && (
            <WeeklyReviewTab
              appData={appData}
              language={language}
              onSaveWeeklyReview={handleSaveWeeklyReview}
              onSaveMonthlyReview={handleSaveMonthlyReview}
              onAddTimeBlock={handleAddTimeBlock}
              onStartFocusMode={handleStartFocusMode}
              onNavigateTab={(tab) => handleNavigateTab(tab)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={appData.settings}
              fullData={appData}
              language={language}
              onUpdateSettings={handleUpdateSettings}
              onImportData={handleImportData}
              onResetData={handleResetData}
              syncState={syncState}
              onOpenDatabaseModal={() => {
                chimePlayer.playChime('modal_open');
                setIsDatabaseModalOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {/* 3. Deep Focus Mode Modal & PIP Widget */}
      <FocusModeModal
        isOpen={isFocusModeOpen}
        isMinimized={isFocusMinimized}
        activeBlock={activeFocusBlock}
        language={language}
        onClose={() => {
          chimePlayer.playChime('modal_close');
          setIsFocusModeOpen(false);
          setCustomFocusBlock(null);
        }}
        onToggleMinimize={() => setIsFocusMinimized(!isFocusMinimized)}
        onCompleteBlock={handleToggleBlockComplete}
        onLogCustomSession={handleLogCustomSession}
      />

      {/* 4. Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        language={language}
        onClose={() => {
          chimePlayer.playChime('modal_close');
          setIsShortcutsOpen(false);
        }}
      />

      {/* 5. Universal Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          chimePlayer.playChime('modal_close');
          setIsQuickAddOpen(false);
        }}
        defaultType={quickAddDefaultType}
        onAddTask={handleAddTask}
        onAddQuiz={handleAddQuiz}
        onAddHomework={handleAddHomework}
        onAddNote={handleAddNote}
        onAddTimeBlock={handleAddTimeBlock}
      />

      {/* 6. Cloud Database & Sync Modal */}
      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => {
          chimePlayer.playChime('modal_close');
          setIsDatabaseModalOpen(false);
        }}
        syncState={syncState}
        appData={appData}
        language={language}
        onDataLoaded={(loadedData) => setAppData(loadedData)}
      />

      {/* 7. In-App Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={inAppNotifications}
        language={language}
        onMarkAsRead={(id) => notificationService.markAsRead(id)}
        onMarkAllAsRead={() => notificationService.markAllAsRead()}
        onClearAll={() => notificationService.clearAll()}
        onNavigateTab={(tab) => handleNavigateTab(tab)}
      />

      {/* 8. Initial App Boot Splash with TwinOrbit */}
      {showSplash && (
        <LoadingScreen
          isArabic={language === 'ar'}
          fadeOut={isSplashFading}
        />
      )}
    </div>
  );
}
