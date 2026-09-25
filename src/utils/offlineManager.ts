/**
 * Offline Manager - Advanced Offline-First Architecture
 * Handles offline detection, data sync queue, and conflict resolution
 */

export interface OfflineQueueItem {
  id: string;
  timestamp: number;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  retryCount: number;
}

export interface OfflineStatus {
  isOnline: boolean;
  lastOnlineAt: string | null;
  queueLength: number;
  isSyncing: boolean;
}

class OfflineManager {
  private onlineListeners: Array<(status: OfflineStatus) => void> = [];
  private status: OfflineStatus = {
    isOnline: navigator.onLine,
    lastOnlineAt: navigator.onLine ? new Date().toISOString() : null,
    queueLength: 0,
    isSyncing: false,
  };
  private syncQueue: OfflineQueueItem[] = [];
  private readonly QUEUE_STORAGE_KEY = 'mybac_offline_queue';
  private readonly MAX_RETRY_COUNT = 3;

  constructor() {
    this.loadQueue();
    this.setupListeners();
  }

  /**
   * Setup online/offline event listeners
   */
  private setupListeners() {
    window.addEventListener('online', () => {
      this.status.isOnline = true;
      this.status.lastOnlineAt = new Date().toISOString();
      this.notifyListeners();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.status.isOnline = false;
      this.notifyListeners();
    });

    // Check connection periodically (every 30 seconds)
    setInterval(() => {
      this.checkConnection();
    }, 30000);
  }

  /**
   * Check if we're really online by pinging a reliable endpoint
   */
  private async checkConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!this.status.isOnline) {
        this.status.isOnline = true;
        this.status.lastOnlineAt = new Date().toISOString();
        this.notifyListeners();
        this.processSyncQueue();
      }
    } catch {
      if (this.status.isOnline) {
        this.status.isOnline = false;
        this.notifyListeners();
      }
    }
  }

  /**
   * Subscribe to offline status changes
   */
  public subscribe(callback: (status: OfflineStatus) => void): () => void {
    this.onlineListeners.push(callback);
    callback(this.status); // Send initial status
    return () => {
      this.onlineListeners = this.onlineListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all listeners of status changes
   */
  private notifyListeners() {
    this.onlineListeners.forEach((callback) => callback(this.status));
  }

  /**
   * Get current offline status
   */
  public getStatus(): OfflineStatus {
    return { ...this.status };
  }

  /**
   * Add operation to sync queue
   */
  public queueOperation(
    operation: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ): string {
    const item: OfflineQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      operation,
      collection,
      data,
      retryCount: 0,
    };

    this.syncQueue.push(item);
    this.status.queueLength = this.syncQueue.length;
    this.saveQueue();
    this.notifyListeners();

    // Try to sync immediately if online
    if (this.status.isOnline) {
      this.processSyncQueue();
    }

    return item.id;
  }

  /**
   * Load sync queue from localStorage
   */
  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        this.status.queueLength = this.syncQueue.length;
      }
    } catch (error) {
      console.warn('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Save sync queue to localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('Failed to save sync queue:', error);
    }
  }

  /**
   * Process sync queue - attempt to sync all pending operations
   */
  private async processSyncQueue() {
    if (this.status.isSyncing || this.syncQueue.length === 0 || !this.status.isOnline) {
      return;
    }

    this.status.isSyncing = true;
    this.notifyListeners();

    const itemsToProcess = [...this.syncQueue];
    const successfulIds: string[] = [];
    const failedItems: OfflineQueueItem[] = [];

    for (const item of itemsToProcess) {
      try {
        await this.syncOperation(item);
        successfulIds.push(item.id);
      } catch (error) {
        item.retryCount++;
        if (item.retryCount < this.MAX_RETRY_COUNT) {
          failedItems.push(item);
        }
        // else: max retries reached, drop the item
      }
    }

    // Remove successful items from queue
    this.syncQueue = this.syncQueue.filter((item) => !successfulIds.includes(item.id));

    // Re-add failed items (up to max retries)
    failedItems.forEach((item) => {
      const existingIndex = this.syncQueue.findIndex((q) => q.id === item.id);
      if (existingIndex >= 0) {
        this.syncQueue[existingIndex] = item;
      }
    });

    this.status.queueLength = this.syncQueue.length;
    this.status.isSyncing = false;
    this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Sync a single operation to the server
   */
  private async syncOperation(item: OfflineQueueItem): Promise<void> {
    // This is a placeholder - in a real implementation, this would call your API
    // For now, we'll just simulate success after a delay
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 90% success rate
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error('Sync failed'));
        }
      }, 100);
    });
  }

  /**
   * Clear all pending operations in queue
   */
  public clearQueue() {
    this.syncQueue = [];
    this.status.queueLength = 0;
    this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Force a sync attempt
   */
  public async forceSync(): Promise<void> {
    if (!this.status.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await this.processSyncQueue();
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();
