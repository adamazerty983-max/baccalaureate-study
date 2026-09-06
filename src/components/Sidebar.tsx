import React, { useEffect, useRef } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  CheckSquare,
  HelpCircle,
  BookOpen,
  FileText,
  CalendarClock,
  Settings,
  Sun,
  Moon,
  Brain,
  Calculator,
  Target,
  Flame,
  Sparkles,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Volume2,
  VolumeX,
  User,
  LogOut,
  Cloud,
} from 'lucide-react';
import { AppLanguage, AppSettings, MainTabType } from '../types';
import { getT } from '../utils/i18n';
import { DatabaseSyncState } from '../services/firestoreService';
import { GoogleAuthButton } from './GoogleAuthButton';

export type { MainTabType };

export interface TabItemDef {
  id: MainTabType;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  isSpecial?: boolean;
}

export const ALL_NAV_TABS: TabItemDef[] = [
  { id: 'dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard },
  { id: 'tasks', labelKey: 'nav_tasks', icon: CheckSquare },
  { id: 'quizzes', labelKey: 'nav_exams', icon: HelpCircle },
  { id: 'homework', labelKey: 'nav_homework', icon: BookOpen },
  { id: 'notes', labelKey: 'nav_notes', icon: FileText },
  { id: 'timeblocking', labelKey: 'nav_planner', icon: CalendarClock, isSpecial: true },
  { id: 'revision', labelKey: 'nav_revision', icon: Brain },
  { id: 'average', labelKey: 'nav_average', icon: Calculator },
  { id: 'goals', labelKey: 'nav_goals', icon: Target },
  { id: 'habits', labelKey: 'nav_habits', icon: Flame },
  { id: 'review', labelKey: 'nav_review', icon: BarChart3 },
  { id: 'settings', labelKey: 'nav_settings', icon: Settings },
];

export interface SidebarCounts {
  pendingTasks?: number;
  upcomingQuizzes?: number;
  pendingHomework?: number;
  dueRevisions?: number;
}

interface SidebarProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  settings: AppSettings;
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  daysRemaining: number;
  counts?: SidebarCounts;
  syncState?: DatabaseSyncState;
  onOpenDatabaseModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  settings,
  language,
  onChangeLanguage,
  onToggleTheme,
  onToggleSound,
  daysRemaining,
  counts,
  syncState,
  onOpenDatabaseModal,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';
  const safeCounts: SidebarCounts = counts || {};

  // Swipe to dismiss gesture on mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchCurrentXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchCurrentXRef.current !== null) {
      const deltaX = touchCurrentXRef.current - touchStartXRef.current;
      // In Arabic (RTL, right drawer): swipe to right (deltaX > 50) closes
      // In LTR (left drawer): swipe to left (deltaX < -50) closes
      if (isAr && deltaX > 50) {
        onCloseMobile();
      } else if (!isAr && deltaX < -50) {
        onCloseMobile();
      }
    }
    touchStartXRef.current = null;
    touchCurrentXRef.current = null;
  };

  // Keyboard Escape listener
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  const handleSelectTab = (tabId: MainTabType) => {
    setActiveTab(tabId);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop (Always mounted for smooth fade in & fade out transition) */}
      <div
        onClick={onCloseMobile}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Main Sidebar Container with World-class Smooth Sliding */}
      <aside
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed md:sticky top-0 h-screen z-50 bg-[#0F172A] text-slate-300 transition-all duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] transform-gpu flex flex-col justify-between shrink-0 ${
          isCollapsed ? 'w-20' : 'w-72 sm:w-64'
        } ${
          isAr
            ? 'right-0 border-l border-slate-800 md:border-l-0 md:border-r'
            : 'left-0 border-r border-slate-800'
        } ${
          isMobileOpen
            ? 'translate-x-0 shadow-[0_0_50px_rgba(0,0,0,0.6)]'
            : isAr
            ? 'translate-x-full md:translate-x-0 shadow-none'
            : '-translate-x-full md:translate-x-0 shadow-none'
        }`}
      >
        {/* Top App Brand & Collapse Toggle */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none min-w-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-black text-white font-['Outfit'] truncate tracking-tight">
                  MyBac Tracker
                </div>
                <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider truncate">
                  {t('app_subtitle')}
                </div>
              </div>
            )}
          </div>

          {/* Toggle / Close on mobile */}
          <div className="flex items-center gap-1">
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title={isCollapsed ? 'Développer' : 'Réduire'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {ALL_NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badgeCount =
              tab.id === 'tasks'
                ? safeCounts.pendingTasks
                : tab.id === 'quizzes'
                ? safeCounts.upcomingQuizzes
                : tab.id === 'homework'
                ? safeCounts.pendingHomework
                : tab.id === 'revision'
                ? safeCounts.dueRevisions
                : undefined;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-500/20'
                    : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title={isCollapsed ? t(tab.labelKey) : undefined}
              >
                <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'}`}>
                  <Icon className="w-4 h-4" />
                </span>

                {!isCollapsed && (
                  <span className="truncate flex-1 text-left rtl:text-right">
                    {t(tab.labelKey)}
                  </span>
                )}

                {!isCollapsed && badgeCount && badgeCount > 0 ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      isActive ? 'bg-white text-teal-800' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Footer: User Account, Quick controls & Language selector */}
        <div className="p-3 border-t border-slate-800 bg-[#0B1120] space-y-3">
          {/* User Account / Google Login in Sidebar */}
          {!isCollapsed ? (
            <div>
              {syncState?.currentUser && !syncState.currentUser.isAnonymous ? (
                <div
                  onClick={onOpenDatabaseModal}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 cursor-pointer transition-all group"
                  title="Gérer le compte Google et la synchronisation"
                >
                  {syncState.currentUser.photoURL ? (
                    <img
                      src={syncState.currentUser.photoURL}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-teal-500/40 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-500/30">
                      {syncState.currentUser.displayName
                        ? syncState.currentUser.displayName.charAt(0).toUpperCase()
                        : syncState.currentUser.email
                        ? syncState.currentUser.email.charAt(0).toUpperCase()
                        : 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate group-hover:text-teal-400 transition-colors">
                      {syncState.currentUser.displayName || syncState.currentUser.email?.split('@')[0] || 'Élève Bac'}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>{isAr ? 'متصل ومحفوظ سحابياً' : 'Google Synchronisé'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <GoogleAuthButton variant="sidebar" language={language} />
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              {syncState?.currentUser && !syncState.currentUser.isAnonymous ? (
                <button
                  onClick={onOpenDatabaseModal}
                  className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 overflow-hidden"
                  title={syncState.currentUser.displayName || syncState.currentUser.email || 'Compte Google'}
                >
                  {syncState.currentUser.photoURL ? (
                    <img
                      src={syncState.currentUser.photoURL}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <button
                  onClick={onOpenDatabaseModal}
                  className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-white flex items-center justify-center transition-colors"
                  title="Connexion Google"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Language Selector Pills */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
              {(['fr', 'ar', 'en'] as AppLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onChangeLanguage(lang)}
                  className={`flex-1 py-1 rounded-lg uppercase transition-all ${
                    language === lang
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() =>
                  onChangeLanguage(language === 'fr' ? 'ar' : language === 'ar' ? 'en' : 'fr')
                }
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-teal-400 text-xs font-black uppercase flex items-center justify-center"
                title="Changer de langue"
              >
                {language}
              </button>
            </div>
          )}

          {/* Quick theme & sound icons */}
          <div className="flex items-center justify-around pt-1">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Basculer thème sombre / clair"
            >
              {settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-teal-400" />
              )}
            </button>

            <button
              onClick={onToggleSound}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Activer / Couper effets sonores"
            >
              {settings.chimeSoundEnabled ? (
                <Volume2 className="w-4 h-4 text-teal-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
