import { FullAppData } from '../types';

const DB_NAME = 'BaccalaureateStudyHubDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data_store';
const RECORD_KEY = 'full_app_data';

/**
 * Open and initialize IndexedDB with object store
 */
export function openStudyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Save full app data directly to IndexedDB (asynchronously, unlimited quota)
 */
export async function saveToIndexedDB(data: FullAppData): Promise<void> {
  try {
    const db = await openStudyDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, RECORD_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB:', err);
  }
}

/**
 * Load full app data from IndexedDB
 */
export async function loadFromIndexedDB(): Promise<FullAppData | null> {
  try {
    const db = await openStudyDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Failed to load from IndexedDB:', err);
    return null;
  }
}

/**
 * Clear the IndexedDB database
 */
export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openStudyDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(RECORD_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
  }
}

/**
 * Get current browser storage estimate (used bytes & total quota)
 */
export async function getStorageEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentage: number;
  isIndexedDBSupported: boolean;
}> {
  const isSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  if (!isSupported || !navigator.storage || !navigator.storage.estimate) {
    return {
      usageBytes: 0,
      quotaBytes: 0,
      usageFormatted: '0 KB',
      quotaFormatted: 'Non disponible',
      percentage: 0,
      isIndexedDBSupported: isSupported,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 1;
    const percentage = Math.round((usage / quota) * 100);

    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    return {
      usageBytes: usage,
      quotaBytes: quota,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota),
      percentage,
      isIndexedDBSupported: true,
    };
  } catch {
    return {
      usageBytes: 0,
      quotaBytes: 0,
      usageFormatted: '0 KB',
      quotaFormatted: 'N/A',
      percentage: 0,
      isIndexedDBSupported: isSupported,
    };
  }
}
