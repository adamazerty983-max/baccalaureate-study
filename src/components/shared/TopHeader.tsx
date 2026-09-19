import React, { useState } from 'react';
import {
  Menu,
  PanelLeft,
  Plus,
  Clock,
  Sun,
  Moon,
  Zap,
  Keyboard,
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
  Database,
  Cloud,
  User,
  LogOut,
  Bell,
} from 'lucide-react';
import { AppLanguage, AppSettings } from '../../types';
import { ALL_NAV_TABS, MainTabType } from './Sidebar';
import { getT } from '../../utils/i18n';
import { chimePlayer } from '../../utils/audio';
import { DatabaseSyncState } from '../../services/firestoreService';
import { GoogleAuthButton } from './GoogleAuthButton';

interface TopHeaderProps {
  activeTab: MainTabType;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  isMobileSidebarOpen?: boolean;
  onOpenQuickAdd: () => void;
  onOpenFocusMode: () => void;
  onOpenShortcuts: () => void;
  onOpenDatabaseModal?: () => void;
  syncState?: DatabaseSyncState;
  onRefresh?: () => void;
  settings: AppSettings;
  language: AppLanguage;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  daysRemaining: number;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
  isMobileSidebarOpen = false,
  onOpenQuickAdd,
  onOpenFocusMode,
  onOpenShortcuts,
  onOpenDatabaseModal,
  syncState,
  onRefresh,
  settings,
  language,
  onToggleTheme,
  onToggleSound,
  daysRemaining,
  unreadNotificationCount = 0,
  onOpenNotifications,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const currentTab = ALL_NAV_TABS.find((t) => t.id === activeTab) || ALL_NAV_TABS[0];
  const Icon = currentTab.icon;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const isConnected = syncState?.status === 'synced' || syncState?.status === 'connected';

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#1A2535]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Hamburger & Current View Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* World-class Animated 3-Bar Hamburger Button */}
            <button
              onClick={() => {
                chimePlayer.playChime('click');
                onOpenMobileSidebar();
              }}
              aria-label={isMobileSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMobileSidebarOpen}
              className="md:hidden relative w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800/80 active:scale-90 border border-slate-200 dark:border-slate-700 transition-all duration-200 shrink-0 group shadow-xs cursor-pointer"
            >
              <span
                className={`block h-[2px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] origin-center ${isMobileSidebarOpen
                    ? 'w-5 rotate-45 translate-y-[7px]'
                    : 'w-5 group-hover:scale-x-110'
                  }`}
              />
              <span
                className={`block h-[2px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileSidebarOpen
                    ? 'w-5 opacity-0 scale-x-50'
                    : 'w-4 self-start ms-1 group-hover:w-5'
                  }`}
              />
              <span
                className={`block h-[2px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] origin-center ${isMobileSidebarOpen
                    ? 'w-5 -rotate-45 -translate-y-[7px]'
                    : 'w-5 group-hover:scale-x-110'
                  }`}
              />
            </button>

            <button
              onClick={onToggleSidebar}
              className="hidden md:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
              title="Menu latéral"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black font-['Outfit'] text-slate-900 dark:text-white truncate">
                  {t(currentTab.labelKey)}
                </h1>
              </div>
            </div>
          </div>

          {/* Right: User Account, Status & Action Group */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 1. User Account & Cloud Sync Pill (Unified) */}
            {syncState?.currentUser && !syncState.currentUser.isAnonymous ? (
              <button
                onClick={onOpenDatabaseModal}
                className="h-9 flex items-center gap-2 px-2.5 rounded-xl border border-teal-500/30 bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100/80 dark:hover:bg-teal-900/50 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs group"
                title={isAr ? 'حساب Google وحالة المزامنة السحابية' : 'Compte Google & Synchronisation Cloud active'}
              >
                {syncState.currentUser.photoURL ? (
                  <img
                    src={syncState.currentUser.photoURL}
                    alt="Google Avatar"
                    className="w-5 h-5 rounded-full object-cover border border-teal-500/50 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    {syncState.currentUser.displayName
                      ? syncState.currentUser.displayName.charAt(0).toUpperCase()
                      : syncState.currentUser.email
                        ? syncState.currentUser.email.charAt(0).toUpperCase()
                        : 'U'}
                  </div>
                )}
                <span className="hidden md:inline max-w-[110px] truncate text-slate-900 dark:text-white font-medium">
                  {syncState.currentUser.displayName || syncState.currentUser.email?.split('@')[0] || 'Connecté'}
                </span>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                  ></span>
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <GoogleAuthButton variant="header" language={language} />
                {onOpenDatabaseModal && (
                  <button
                    onClick={onOpenDatabaseModal}
                    className="h-9 hidden sm:flex items-center gap-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300 text-xs font-bold"
                    title="Base de données Cloud Firebase Firestore"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span className="hidden xl:inline">
                      {isAr ? 'قاعدة البيانات' : 'Cloud DB'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* 2. Manual Refresh / Sync Button */}
            <button
              onClick={handleRefreshClick}
              className={`h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shrink-0 ${isRefreshing ? 'animate-spin text-teal-600' : ''
                }`}
              title={isAr ? 'تحديث ومزامنة البيانات' : "Rafraîchir et actualiser l'application"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Subtle Vertical Divider */}
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            {/* 3. Countdown Badge */}
            <div className="hidden sm:flex h-9 items-center gap-2 px-3 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>{daysRemaining}</strong> {t('days')}
              </span>
            </div>

            {/* 4. Focus Mode Trigger */}
            <button
              onClick={onOpenFocusMode}
              className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition-transform active:scale-95 shrink-0"
              title="Lancer le mode concentration (Touche F)"
            >
              <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
              <span className="hidden sm:inline">Focus</span>
            </button>

            {/* 4b. Notification Center Bell Trigger */}
            <button
              type="button"
              onClick={() => {
                chimePlayer.playChime('click');
                if (onOpenNotifications) {
                  onOpenNotifications();
                }
              }}
              className="relative h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shrink-0 cursor-pointer"
              title={t('notif_center_title')}
              aria-label={t('notif_center_title')}
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-teal-500 text-white font-black text-[9px] shadow-sm animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* 5. Keyboard Shortcuts Trigger */}
            <button
              onClick={onOpenShortcuts}
              className="hidden xl:flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
              title="Guide des raccourcis clavier (Touche ?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* 6. Quick Add Button */}
            <button
              onClick={onOpenQuickAdd}
              className="h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all shadow-sm shadow-teal-500/20 shrink-0"
              title="Ajout rapide (+)"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('add')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
