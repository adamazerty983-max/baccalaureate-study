import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, CloudOff, CloudCheck, RefreshCw } from 'lucide-react';
import { offlineManager, OfflineStatus } from '../../utils/offlineManager';

interface OfflineBannerProps {
  language: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ language }) => {
  const [status, setStatus] = useState<OfflineStatus>(offlineManager.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  const isAr = language === 'ar';

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    return () => unsubscribe();
  }, []);

  const handleSync = async () => {
    if (!status.isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      await offlineManager.forceSync();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show banner if online and no pending operations
  if (status.isOnline && status.queueLength === 0) {
    return null;
  }

  return (
    <div
      className={`
        sticky top-0 z-30 w-full px-4 py-2.5
        ${status.isOnline
          ? 'bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50'
          : 'bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800/50'
        }
        transition-all duration-300
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Icon + Message */}
        <div className="flex items-center gap-3">
          {status.isOnline ? (
            status.isSyncing ? (
              <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />
            ) : (
              <CloudCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )
          ) : (
            <CloudOff className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}

          <div className="flex flex-col">
            <span className={`text-sm font-semibold ${
              status.isOnline
                ? 'text-amber-900 dark:text-amber-100'
                : 'text-red-900 dark:text-red-100'
            }`}>
              {status.isOnline ? (
                status.isSyncing ? (
                  isAr ? 'جاري المزامنة...' : 'Synchronisation en cours...'
                ) : (
                  isAr ? `${status.queueLength} عملية في الانتظار` : `${status.queueLength} opération(s) en attente`
                )
              ) : (
                isAr ? 'وضع عدم الاتصال' : 'Mode hors ligne'
              )}
            </span>

            <span className={`text-xs ${
              status.isOnline
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              {status.isOnline ? (
                isAr
                  ? 'سيتم المزامنة تلقائياً عند الاتصال'
                  : 'Les modifications seront synchronisées automatiquement'
              ) : (
                isAr
                  ? 'تعمل بدون اتصال. سيتم المزامنة عند العودة'
                  : 'Vous travaillez hors ligne. Synchro à la reconnexion'
              )}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        {status.isOnline && status.queueLength > 0 && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="
              px-3 py-1.5 rounded-lg text-xs font-medium
              bg-amber-600 hover:bg-amber-700
              dark:bg-amber-500 dark:hover:bg-amber-600
              text-white
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'مزامنة الآن' : 'Synchroniser'}</span>
          </button>
        )}

        {!status.isOnline && (
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">
              {isAr ? 'لا يوجد اتصال' : 'Aucune connexion'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
