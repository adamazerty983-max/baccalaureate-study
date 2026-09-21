import { AppSettings, FullAppData, HomeworkItem, LectureNote, QuizItem, TaskItem, TimeBlock } from '../types';
import {
  INITIAL_GOALS,
  INITIAL_GRADES,
  INITIAL_HABITS,
  INITIAL_HOMEWORK,
  INITIAL_LESSONS,
  INITIAL_NOTES,
  INITIAL_NOTIFICATIONS_PREFERENCES,
  INITIAL_QUIZZES,
  INITIAL_SETTINGS,
  INITIAL_TASKS,
  INITIAL_TIME_BLOCKS,
  INITIAL_WEEKLY_REVIEWS,
} from './constants';

const STORAGE_KEY = 'baccalaureate_study_hub_fresh_v4';

export function getInitialAppData(): FullAppData {
  return {
    version: 4,
    settings: INITIAL_SETTINGS,
    tasks: INITIAL_TASKS,
    quizzes: INITIAL_QUIZZES,
    homework: INITIAL_HOMEWORK,
    notes: INITIAL_NOTES,
    timeBlocks: INITIAL_TIME_BLOCKS,
    grades: INITIAL_GRADES,
    goals: INITIAL_GOALS,
    lessons: INITIAL_LESSONS,
    habits: INITIAL_HABITS,
    habitLogs: {},
    weeklyReviews: INITIAL_WEEKLY_REVIEWS,
    updatedAt: new Date().toISOString(),
  };
}

export function loadStoredAppData(): FullAppData {
  if (typeof window === 'undefined') return getInitialAppData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialAppData();
      saveStoredAppData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<FullAppData>;
    return {
      version: parsed.version || 3,
      settings: {
        ...INITIAL_SETTINGS,
        ...(parsed.settings || {}),
        notifications: {
          ...INITIAL_NOTIFICATIONS_PREFERENCES,
          ...(parsed.settings?.notifications || {}),
          modules: {
            ...INITIAL_NOTIFICATIONS_PREFERENCES.modules,
            ...(parsed.settings?.notifications?.modules || {}),
          },
          quietHours: {
            ...INITIAL_NOTIFICATIONS_PREFERENCES.quietHours,
            ...(parsed.settings?.notifications?.quietHours || {}),
          },
        },
      },
      tasks: parsed.tasks || [],
      quizzes: parsed.quizzes || [],
      homework: parsed.homework || [],
      notes: parsed.notes || [],
      timeBlocks: parsed.timeBlocks || [],
      grades: parsed.grades || [],
      goals: parsed.goals || [],
      lessons: parsed.lessons || [],
      habits: parsed.habits || [],
      habitLogs: parsed.habitLogs || {},
      weeklyReviews: parsed.weeklyReviews || {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error loading app data from localStorage:', err);
    return getInitialAppData();
  }
}

import { saveToIndexedDB, loadFromIndexedDB, getStorageEstimate } from './indexedDB';
export { loadFromIndexedDB, saveToIndexedDB, getStorageEstimate };

export function saveStoredAppData(data: FullAppData): void {
  if (typeof window === 'undefined') return;
  // NOTE: do NOT re-stamp updatedAt here. The stamp belongs to the state that
  // produced it; re-stamping on every mirror write made every save look
  // "newer", which let stale snapshots legally overwrite fresh ones and
  // caused cross-tab merge ping-pong.
  const toSave = data;

  // 1. Primary: Save to IndexedDB (asynchronous, unlimited storage > 500MB)
  saveToIndexedDB(toSave).catch((err) => {
    console.warn('IndexedDB auto-save error:', err);
  });

  // 2. Secondary: Mirror to localStorage for instant synchronous startup cache
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    // Gracefully handled: If data exceeds localStorage 5MB quota, IndexedDB guarantees full persistence
    console.warn('localStorage quota exceeded; full data safely stored in IndexedDB:', err);
  }
}

import { saveStudyRoom, loadStudyRoom } from '../services/supabaseService';

/**
 * Cloud Synchronization Client
 * Communicates with Supabase Database by Sync Room Code
 */
export async function syncWithCloud(
  syncCode: string,
  localData: FullAppData,
  userId: string = 'anonymous'
): Promise<{ success: boolean; data?: FullAppData; message: string }> {
  const code = syncCode.trim().toUpperCase();
  if (!code) {
    return { success: false, message: 'Le code de synchronisation ne peut pas être vide' };
  }

  // 1. Try Supabase First
  try {
    const remoteResult = await loadStudyRoom(code);
    let resolvedData = localData;

    if (remoteResult.success && remoteResult.data) {
      const remoteData = remoteResult.data;
      const localTime = new Date(localData.updatedAt || 0).getTime();
      const remoteTime = new Date(remoteData.updatedAt || 0).getTime();

      if (remoteTime > localTime) {
        resolvedData = remoteData;
      }
    }

    resolvedData.settings.lastSyncedAt = new Date().toISOString();
    resolvedData.settings.cloudSyncCode = code;
    resolvedData.updatedAt = new Date().toISOString();

    await saveStudyRoom(code, resolvedData, userId);
    saveStoredAppData(resolvedData);

    return {
      success: true,
      data: resolvedData,
      message: `Synchronisé avec succès dans la base Supabase [Salle : ${code}]`,
    };
  } catch (err: any) {
    console.warn('Supabase sync failed, attempting local fallback:', err);
  }

  try {
    const cloudRoomKey = `bac_cloud_room_${code}`;
    const remoteRaw = localStorage.getItem(cloudRoomKey);
    let resolvedData = localData;

    if (remoteRaw) {
      const remoteData = JSON.parse(remoteRaw) as FullAppData;
      const localTime = new Date(localData.updatedAt || 0).getTime();
      const remoteTime = new Date(remoteData.updatedAt || 0).getTime();

      if (remoteTime > localTime) {
        resolvedData = remoteData;
      }
    }

    resolvedData.settings.lastSyncedAt = new Date().toISOString();
    resolvedData.settings.cloudSyncCode = code;
    localStorage.setItem(cloudRoomKey, JSON.stringify(resolvedData));
    saveStoredAppData(resolvedData);

    return {
      success: true,
      data: resolvedData,
      message: `Synchronisation locale [Salle : ${code}] (Dernière synchro : ${new Date().toLocaleTimeString()})`,
    };
  } catch (fallbackErr) {
    return {
      success: false,
      message: 'Impossible de synchroniser les données.',
    };
  }
}

/**
 * Export complete application data to a JSON backup file for local safekeeping
 */
export function exportAppDataToFile(data: FullAppData, customFilename?: string): string {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = customFilename || `mybac-studyhub-backup-${dateStr}_${timeStr}.json`;

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);

  return filename;
}
