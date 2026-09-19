import React, { useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Laptop,
  Calendar,
  Type,
  Download,
  Upload,
  Volume2,
  VolumeX,
  FileCode,
  Globe,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  HardDrive,
  ShieldCheck,
  FileJson,
  Check,
  Copy,
  Sliders,
  Minus,
  Plus,
  GraduationCap,
  Sparkles,
  Bell,
  BellRing,
  BellOff,
  Clock,
  Flame,
  BookOpen,
  CheckSquare,
  Brain,
  Award,
  Target,
  Info,
  Palette,
} from 'lucide-react';
import { AppLanguage, AppSettings, FontSizeOption, FullAppData, ThemeMode, UiStyleMode } from '../../types';
import { BAC_SUBJECTS, BAC_TRACK_PRESETS, BacTrackPreset, getSubjectCoefficient, INITIAL_NOTIFICATIONS_PREFERENCES } from '../../utils/constants';
import { exportAppDataToFile } from '../../utils/storage';
import { chimePlayer } from '../../utils/audio';
import { getT } from '../../utils/i18n';
import { DatabaseSyncState, logoutUser } from '../../services/firestoreService';
import { GoogleAuthButton } from '../shared/GoogleAuthButton';
import { notificationService } from '../../services/notificationService';
import firebaseConfig from '../../../firebase-applet-config.json';

interface SettingsTabProps {
  settings: AppSettings;
  fullData: FullAppData;
  language: AppLanguage;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onImportData: (importedData: FullAppData) => void;
  onResetData: () => void;
  syncState?: DatabaseSyncState;
  onOpenDatabaseModal?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  fullData,
  language,
  onUpdateSettings,
  onImportData,
  onResetData,
  syncState,
  onOpenDatabaseModal,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [downloadedBackupInfo, setDownloadedBackupInfo] = useState<{ filename: string; timestamp: string } | null>(null);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>(() =>
    notificationService.getPermission()
  );
  const [testSent, setTestSent] = useState(false);

  const totalTasks = fullData.tasks.length;
  const totalQuizzes = fullData.quizzes.length;
  const totalHomework = fullData.homework.length;
  const totalNotes = fullData.notes.length;
  const totalLessons = fullData.lessons.length;
  const totalGrades = fullData.grades.length;
  const totalHabits = fullData.habits.length;
  const totalTimeBlocks = fullData.timeBlocks.length;
  const totalItemsCount =
    totalTasks +
    totalQuizzes +
    totalHomework +
    totalNotes +
    totalLessons +
    totalGrades +
    totalHabits +
    totalTimeBlocks;
  const estimatedSizeKb = (new Blob([JSON.stringify(fullData)]).size / 1024).toFixed(1);

  const handleSelectTrackPreset = (preset: BacTrackPreset) => {
    const trackLabel = preset.name[language] || preset.name.fr;
    onUpdateSettings({
      baccalaureateTrack: trackLabel,
      customCoefficients: { ...preset.coefficients },
    });
    if (settings.chimeSoundEnabled) {
      chimePlayer.playChime('click');
    }
  };

  const handleUpdateSubjectCoeff = (subjectName: string, delta: number) => {
    const currentCoeff = getSubjectCoefficient(subjectName, settings.customCoefficients);
    const newCoeff = Math.max(1, Math.min(15, currentCoeff + delta));
    const newMap: Record<string, number> = {
      ...(settings.customCoefficients || {}),
      [subjectName]: newCoeff,
    };
    onUpdateSettings({ customCoefficients: newMap });
    if (settings.chimeSoundEnabled) {
      chimePlayer.playChime('click');
    }
  };

  const handleResetCoefficients = () => {
    const defaultMap: Record<string, number> = {};
    BAC_SUBJECTS.forEach((s) => {
      defaultMap[s.name] = s.coefficient;
    });
    onUpdateSettings({ customCoefficients: defaultMap });
    if (settings.chimeSoundEnabled) {
      chimePlayer.playChime();
    }
  };

  const totalCoefficientsSum = BAC_SUBJECTS.reduce((sum, subj) => {
    return sum + getSubjectCoefficient(subj.name, settings.customCoefficients);
  }, 0);

  const handleDownloadBackup = () => {
    const filename = exportAppDataToFile(fullData);
    setDownloadedBackupInfo({
      filename,
      timestamp: new Date().toLocaleTimeString(),
    });
    setImportError(null);
    chimePlayer.playChime('complete');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as FullAppData;
        if (parsed.tasks && parsed.quizzes) {
          onImportData(parsed);
          setImportError(null);
          chimePlayer.playChime('complete');
        } else {
          setImportError('Format de données JSON invalide.');
          chimePlayer.playChime('error');
        }
      } catch (err) {
        setImportError('Impossible de lire le fichier JSON.');
        chimePlayer.playChime('error');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadStandaloneHtml = () => {
    const htmlBlob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(htmlBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mybac-studyhub-offline.html`;
    document.body.appendChild(a);
    a.click();
    chimePlayer.playChime('complete');
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const isConnected = syncState?.status === 'synced' || syncState?.status === 'connected';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black font-['Outfit'] text-slate-900 dark:text-white">
              {t('settings_title')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'تخصيص لغة الواجهة، المظهر، موعد الامتحان، وقاعدة البيانات السحابية'
                : 'Personnalisez la langue, le thème, la date d\'examen et gérez la base de données cloud'}
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Database (Firebase Firestore) Card */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-teal-500/30 dark:border-teal-500/20 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'قاعدة البيانات السحابية (Firebase Firestore)' : 'Base de Données Cloud (Firebase Firestore)'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Projet : <code className="font-mono text-teal-600 dark:text-teal-400">{firebaseConfig.projectId}</code>
              </p>
            </div>
          </div>

          {onOpenDatabaseModal && (
            <button
              onClick={onOpenDatabaseModal}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm shadow-teal-500/20 transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isAr ? 'إدارة المزامنة' : 'Gérer la base'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block">{isAr ? 'حالة الاتصال' : 'Statut de connexion'}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <strong className="text-xs font-bold text-slate-900 dark:text-white">
                {isConnected ? 'Connecté à Firestore' : 'Initialisation...'}
              </strong>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block">{isAr ? 'المستخدم الحالي' : 'Compte actif'}</span>
            <div className="mt-1 truncate">
              <strong className="text-xs font-bold text-slate-900 dark:text-white">
                {syncState?.currentUser?.displayName || (syncState?.currentUser?.isAnonymous ? 'Compte invité sécurisé' : 'Élève Bac')}
              </strong>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block">{isAr ? 'رمز غرفة المزامنة' : 'Code de salle'}</span>
            <div className="mt-1 font-mono font-bold text-xs text-teal-600 dark:text-teal-400">
              {settings.cloudSyncCode || 'Non configuré'}
            </div>
          </div>
        </div>

        {/* Google Authentication Box */}
        <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {syncState?.currentUser && !syncState.currentUser.isAnonymous ? (
              syncState.currentUser.photoURL ? (
                <img
                  src={syncState.currentUser.photoURL}
                  alt="Google Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-teal-500 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {syncState.currentUser.displayName ? syncState.currentUser.displayName.charAt(0).toUpperCase() : 'G'}
                </div>
              )
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {syncState?.currentUser && !syncState.currentUser.isAnonymous
                  ? (isAr ? 'حساب Google المتصل' : `Compte Google : ${syncState.currentUser.displayName || syncState.currentUser.email}`)
                  : (isAr ? 'الاتصال بحساب Google' : 'Lier un compte Google')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {syncState?.currentUser && !syncState.currentUser.isAnonymous
                  ? (isAr ? 'بياناتك متزامنة ومحفوظة تحت حسابك الشخصي' : syncState.currentUser.email)
                  : (isAr ? 'قم بتسجيل الدخول بـ Google لمزامنة دائمة عبر أجهزتك' : 'Synchronisez vos cours et tâches sur tous vos appareils.')}
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {syncState?.currentUser && !syncState.currentUser.isAnonymous ? (
              <button
                onClick={async () => {
                  await logoutUser();
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20 transition-all"
              >
                {isAr ? 'تسجيل الخروج' : 'Déconnexion'}
              </button>
            ) : (
              <GoogleAuthButton variant="header" language={language} />
            )}
          </div>
        </div>
      </section>

      {/* 1. Language Selection */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t('settings_lang')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'fr', label: 'Français', sub: 'Interface en Français' },
            { id: 'ar', label: 'العربية', sub: 'واجهة باللغة العربية (RTL)' },
            { id: 'en', label: 'English', sub: 'English Interface' },
          ].map((langItem) => {
            const isSelected = settings.language === langItem.id;
            return (
              <button
                key={langItem.id}
                onClick={() => onUpdateSettings({ language: langItem.id as AppLanguage })}
                className={`p-4 rounded-xl border text-left rtl:text-right transition-all ${isSelected
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
              >
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {langItem.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{langItem.sub}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Theme & Appearance */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>{t('settings_dark')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Clair', icon: Sun },
            { id: 'dark', label: 'Sombre', icon: Moon },
            { id: 'system', label: 'Système', icon: Laptop },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = settings.theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onUpdateSettings({ theme: item.id as ThemeMode })}
                className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${isSelected
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
              >
                <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2b. Interface Style — Classic vs MyBac Tracker skin */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t('settings_style')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              id: 'classic' as UiStyleMode,
              label: t('settings_style_classic'),
              sub: t('settings_style_classic_sub'),
              swatch: ['#0F172A', '#14B8A6', '#E2E8F0'],
            },
            {
              id: 'mybac' as UiStyleMode,
              label: t('settings_style_mybac'),
              sub: t('settings_style_mybac_sub'),
              swatch: ['#134848', '#C89B3C', '#F2EDE4'],
            },
          ].map((item) => {
            const isSelected = (settings.uiStyle ?? 'classic') === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onUpdateSettings({ uiStyle: item.id })}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {item.swatch.map((color) => (
                    <span
                      key={color}
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 ml-auto" />
                  )}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</div>
                <div className="text-[11px] text-slate-400 mt-1">{item.sub}</div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400">
          {language === 'ar'
            ? 'يمكنك الرجوع إلى النمط الكلاسيكي في أي وقت من هنا.'
            : language === 'en'
              ? 'You can switch back to the classic look at any time from here.'
              : 'Vous pouvez revenir au style classique à tout moment depuis ici.'}
        </p>
      </section>

      {/* 3. Exam Date Cooldown */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t('settings_exam_date')} & {t('settings_start_date')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t('settings_start_date')}
            </label>
            <input
              type="datetime-local"
              value={settings.academicYearStartDate?.slice(0, 16) || '2026-09-07T08:00'}
              onChange={(e) => onUpdateSettings({ academicYearStartDate: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-teal-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {language === 'ar'
                ? 'ينطلق عداد النسبة المئوية للمسار الدراسي (0%) في هذا اليوم.'
                : 'Le compteur de progression (%) démarre à 0% à cette date.'}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t('settings_exam_date')}
            </label>
            <input
              type="datetime-local"
              value={settings.baccalaureateDate?.slice(0, 16) || '2027-06-10T08:00'}
              onChange={(e) => onUpdateSettings({ baccalaureateDate: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-teal-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {language === 'ar'
                ? 'الموعد النهائي للوصول إلى 100% وانتهاء العد التنازلي.'
                : 'Échéance officielle pour atteindre 100%.'}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Sound Effects */}
      {/* 4. Baccalaureate Track & Subject Coefficients Customization */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {isAr
                    ? 'شعبة البكالوريا وتخصيص معاملات المواد'
                    : language === 'fr'
                    ? 'Filière & Personnalisation des Coefficients'
                    : 'Baccalaureate Track & Subject Coefficients'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  {settings.baccalaureateTrack || (isAr ? 'مسلك مخصص' : 'Personnalisé')}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'اختر مسلك البكالوريا لتطبيق المعاملات الرسمية بنقرة واحدة، أو اضبط معامل كل مادة يدوياً.'
                  : language === 'fr'
                  ? 'Sélectionnez votre filière officielle ou ajustez les coefficients manuellement selon vos besoins.'
                  : 'Select your official track to apply standard coefficients or customize each subject manually.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>
                {isAr ? 'مجموع المعاملات: ' : 'Total: '}
                <strong className="font-mono text-sm">{totalCoefficientsSum}</strong>
              </span>
            </span>
          </div>
        </div>

        {/* Track Preset Selector Buttons */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isAr ? 'نماذج الشعب الرسمية (تطبيق فوري)' : 'Filières officielles du Baccalauréat'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {BAC_TRACK_PRESETS.map((preset) => {
              const currentTrackName = settings.baccalaureateTrack || '';
              const isSelected =
                currentTrackName.includes(preset.shortName[language]) ||
                currentTrackName.includes(preset.shortName.fr) ||
                currentTrackName.includes(preset.badge);

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectTrackPreset(preset)}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all flex flex-col justify-between min-h-[64px] cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'border-teal-500 bg-teal-500/10 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100 shadow-xs ring-1 ring-teal-500/40'
                      : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {preset.badge}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold leading-tight mt-1.5 line-clamp-1">
                    {preset.shortName[language] || preset.shortName.fr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subjects Custom Coefficients Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAr ? 'تخصيص معامل كل مادة بالتفصيل' : 'Coefficients individuels par matière'}
            </label>
            <span className="text-[10px] text-slate-400">
              {isAr ? 'نطاق المعامل من 1 إلى 15' : 'Échelle de 1 à 15'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BAC_SUBJECTS.map((subj) => {
              const currentCoeff = getSubjectCoefficient(subj.name, settings.customCoefficients);
              const isModified =
                settings.customCoefficients?.[subj.name] !== undefined &&
                settings.customCoefficients[subj.name] !== subj.coefficient;

              return (
                <div
                  key={subj.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isModified
                      ? 'border-teal-500/40 bg-teal-50/30 dark:bg-teal-950/20'
                      : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-3 h-3 rounded-full ${subj.dotColor} ring-2 ring-white dark:ring-slate-900 shrink-0 shadow-xs`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {subj.name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>
                          {isAr ? 'الافتراضي:' : 'Défaut:'} {subj.coefficient}
                        </span>
                        {isModified && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                            {isAr ? 'معدل' : 'Modifié'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stepper with 44x44px minimum touch targets */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateSubjectCoeff(subj.name, -1)}
                      disabled={currentCoeff <= 1}
                      aria-label={`${subj.name} - 1`}
                      className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    >
                      <Minus className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    <div className="w-11 h-11 rounded-xl bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold font-mono text-base flex items-center justify-center shrink-0">
                      {currentCoeff}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateSubjectCoeff(subj.name, 1)}
                      disabled={currentCoeff >= 15}
                      aria-label={`${subj.name} + 1`}
                      className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions: Total & Reset to Defaults */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-500 shrink-0" />
            <span>
              {isAr
                ? 'يتم تطبيق المعاملات تلقائياً في حساب المعدل وبطاقات المواد في لوحة التحكم.'
                : 'Les coefficients sont appliqués instantanément au calcul de la moyenne et sur le tableau de bord.'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetCoefficients}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'استعادة المعاملات القياسية' : 'Rétablir par défaut'}</span>
          </button>
        </div>
      </section>

      {/* 5. Sound Effects */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t('settings_sound')}</span>
          </h2>
          <button
            onClick={() => {
              const nextVal = !settings.chimeSoundEnabled;
              onUpdateSettings({ chimeSoundEnabled: nextVal });
              if (nextVal) {
                chimePlayer.setEnabled(true);
                chimePlayer.playChime('complete');
              } else {
                chimePlayer.playChime('click');
                chimePlayer.setEnabled(false);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${settings.chimeSoundEnabled
              ? 'bg-teal-600 text-white'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
          >
            {settings.chimeSoundEnabled ? (isAr ? 'مفعل ✓' : 'Activé ✓') : (isAr ? 'معطل' : 'Désactivé')}
          </button>
        </div>

        {settings.chimeSoundEnabled && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-4 flex-1 max-w-sm">
              <span className="text-xs text-slate-500">{t('settings_volume')}</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={settings.soundVolume ?? 0.65}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  onUpdateSettings({ soundVolume: vol });
                  chimePlayer.setVolume(vol);
                }}
                className="flex-1 accent-teal-600 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-10 text-right">
                {Math.round((settings.soundVolume ?? 0.65) * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => chimePlayer.playChime('complete')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-xs font-semibold transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'تجربة النغمة الهادئة' : 'Tester la mélodie'}</span>
            </button>
          </div>
        )}
      </section>

      {/* 6. Notifications & Smart Reminders Section */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('notif_title')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  PWA & System
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('notif_subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const currentNotifs = settings.notifications || INITIAL_NOTIFICATIONS_PREFERENCES;
              const nextEnabled = !currentNotifs.enabled;
              onUpdateSettings({
                notifications: {
                  ...currentNotifs,
                  enabled: nextEnabled,
                },
              });
              chimePlayer.playChime(nextEnabled ? 'complete' : 'click');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              (settings.notifications?.enabled ?? true)
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {(settings.notifications?.enabled ?? true) ? (
              <>
                <BellRing className="w-3.5 h-3.5" />
                <span>{isAr ? 'مفعل ✓' : 'Activé ✓'}</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5" />
                <span>{isAr ? 'معطل' : 'Désactivé'}</span>
              </>
            )}
          </button>
        </div>

        {/* Browser Permission Status Bar */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('notif_perm_label')} :
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                browserPerm === 'granted'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : browserPerm === 'denied'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  browserPerm === 'granted'
                    ? 'bg-emerald-500'
                    : browserPerm === 'denied'
                      ? 'bg-rose-500'
                      : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span>
                {browserPerm === 'granted'
                  ? t('notif_perm_granted')
                  : browserPerm === 'denied'
                    ? t('notif_perm_denied')
                    : t('notif_perm_default')}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {browserPerm !== 'granted' && notificationService.isSupported() && (
              <button
                type="button"
                onClick={async () => {
                  const perm = await notificationService.requestPermission();
                  setBrowserPerm(perm);
                  if (perm === 'granted') {
                    chimePlayer.playChime('toast_success');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('notif_request_perm')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                await notificationService.sendTestNotification(fullData);
                setTestSent(true);
                setTimeout(() => setTestSent(false), 3000);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-teal-500" />
              <span>{testSent ? t('notif_test_sent') : t('notif_test_btn')}</span>
            </button>
          </div>
        </div>

        {/* Per-Module Notification Toggles */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('notif_modules_title')}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              { id: 'tasks', label: t('notif_module_tasks'), icon: CheckSquare, color: 'text-teal-500' },
              { id: 'quizzes', label: t('notif_module_quizzes'), icon: Award, color: 'text-amber-500' },
              { id: 'homework', label: t('notif_module_homework'), icon: BookOpen, color: 'text-indigo-500' },
              { id: 'lessons', label: t('notif_module_lessons'), icon: Brain, color: 'text-purple-500' },
              { id: 'goals', label: t('notif_module_goals'), icon: Target, color: 'text-emerald-500' },
              { id: 'habits', label: t('notif_module_habits'), icon: Flame, color: 'text-orange-500' },
            ].map((mod) => {
              const currentNotifs = settings.notifications || INITIAL_NOTIFICATIONS_PREFERENCES;
              const isChecked = currentNotifs.modules[mod.id as keyof typeof currentNotifs.modules] !== false;
              const Icon = mod.icon;

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    const nextModules = {
                      ...currentNotifs.modules,
                      [mod.id]: !isChecked,
                    };
                    onUpdateSettings({
                      notifications: {
                        ...currentNotifs,
                        modules: nextModules,
                      },
                    });
                    chimePlayer.playChime('click');
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all text-left rtl:text-right cursor-pointer ${
                    isChecked
                      ? 'border-teal-500/40 bg-teal-50/40 dark:bg-teal-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 ${mod.color} shrink-0`} />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {mod.label}
                    </span>
                  </div>

                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center border text-[11px] font-black transition-all shrink-0 ${
                      isChecked
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lead Time and Habit Daily Reminder Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Advance Reminder Lead Time */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{t('notif_lead_time')}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { min: 15, label: t('notif_lead_15m') },
                { min: 30, label: t('notif_lead_30m') },
                { min: 60, label: t('notif_lead_1h') },
                { min: 120, label: t('notif_lead_2h') },
              ].map((item) => {
                const currentNotifs = settings.notifications || INITIAL_NOTIFICATIONS_PREFERENCES;
                const isSelected = (currentNotifs.leadTimeMinutes ?? 30) === item.min;

                return (
                  <button
                    key={item.min}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({
                        notifications: {
                          ...currentNotifs,
                          leadTimeMinutes: item.min,
                        },
                      });
                      chimePlayer.playChime('click');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.min} min
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evening Habit Reminder Time */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>{t('notif_habit_time')}</span>
            </label>
            <input
              type="time"
              value={settings.notifications?.habitReminderTime || '20:00'}
              onChange={(e) => {
                const currentNotifs = settings.notifications || INITIAL_NOTIFICATIONS_PREFERENCES;
                onUpdateSettings({
                  notifications: {
                    ...currentNotifs,
                    habitReminderTime: e.target.value || '20:00',
                  },
                });
              }}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Quiet Hours Configuration */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {t('notif_quiet_hours_title')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {t('notif_quiet_hours_desc')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const currentNotifs = settings.notifications || INITIAL_NOTIFICATIONS_PREFERENCES;
                const nextQ = !currentNotifs.quietHours?.enabled;
                onUpdateSettings({
                  notifications: {
                    ...currentNotifs,
                    quietHours: {
                      ...currentNotifs.quietHours,
                      enabled: nextQ,
                    },
                  },
                });
                chimePlayer.playChime('click');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                (settings.notifications?.quietHours?.enabled ?? true)
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {(settings.notifications?.quietHours?.enabled ?? true) ? (isAr ? 'مفعل ✓' : 'Activé ✓') : (isAr ? 'معطل' : 'Désactivé')}
            </button>
          </div>

          {(settings.notifications?.quietHours?.enabled ?? true) && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  {t('notif_quiet_from')}
                </label>
                <input
                  type="time"
                  value={settings.notifications?.quietHours?.start || '23:00'}
                  onChange={(e) => {
                    const currentNotifs = settings.notifications || INITIAL_NOTIFICATIONS_PREFERENCES;
                    onUpdateSettings({
                      notifications: {
                        ...currentNotifs,
                        quietHours: {
                          ...currentNotifs.quietHours,
                          start: e.target.value,
                        },
                      },
                    });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  {t('notif_quiet_to')}
                </label>
                <input
                  type="time"
                  value={settings.notifications?.quietHours?.end || '07:00'}
                  onChange={(e) => {
                    const currentNotifs = settings.notifications || INITIAL_NOTIFICATIONS_PREFERENCES;
                    onUpdateSettings({
                      notifications: {
                        ...currentNotifs,
                        quietHours: {
                          ...currentNotifs.quietHours,
                          end: e.target.value,
                        },
                      },
                    });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Platform Limits & PWA Guidance Note */}
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-slate-600 dark:text-slate-300 text-xs leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('notif_platform_limits')}
          </p>
        </div>
      </section>

      {/* 7. Data Backup & Export (JSON Download) */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{isAr ? 'النسخ الاحتياطي وتحميل البيانات' : 'Sauvegarde Locale & Téléchargement'}</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'قم بتحميل نسخة احتياطية كاملة بصيغة JSON لحفظ جميع بياناتك محلياً في جهازك'
                : 'Téléchargez une sauvegarde intégrale au format JSON pour conserver l’ensemble de vos données d’étude en lieu sûr.'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[11px] font-bold self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{totalItemsCount} {isAr ? 'عنصر دراسي' : 'éléments'} ({estimatedSizeKb})</span>
          </span>
        </div>

        {/* Primary Download Backup Banner / Action Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/30 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAr ? 'تحميل النسخة الاحتياطية الكاملة (JSON)' : 'Télécharger la Sauvegarde (Download Backup)'}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {isAr
                  ? 'يحتوي الملف المنزّل على جميع مهامك، واجباتك، بطاقات التكرار المتباعد، الملاحظات، كشوفات النقط، والجدول الزمني.'
                  : 'Exporte l’intégralité de vos tâches, contrôles, devoirs, fiches de révision, notes de cours, calendrier horaire et habitudes dans un fichier .json sécurisé.'}
              </p>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md hover:shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
              title="Télécharger une copie JSON de sauvegarde"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? 'تحميل النسخة الاحتياطية' : 'Télécharger le Backup JSON'}</span>
            </button>
          </div>

          {/* Backup Contents Included Pills */}
          <div className="pt-3 border-t border-teal-500/20 flex flex-wrap gap-2 text-[10px] font-bold text-slate-700 dark:text-slate-300">
            <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-teal-500/20">
              📋 {totalTasks} {isAr ? 'مهام' : 'Tâches'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-teal-500/20">
              📝 {totalHomework} {isAr ? 'واجبات' : 'Devoirs'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-teal-500/20">
              🎯 {totalQuizzes} {isAr ? 'امتحانات' : 'Examens'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-teal-500/20">
              🧠 {totalLessons} {isAr ? 'بطاقات تكرار' : 'Fiches Révision'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-teal-500/20">
              📊 {totalGrades} {isAr ? 'نقط' : 'Notes/Moyenne'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-teal-500/20">
              ⏰ {totalTimeBlocks} {isAr ? 'فترات تخطيط' : 'Plannings'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-teal-500/20">
              🔥 {totalHabits} {isAr ? 'عادات' : 'Habitudes'}
            </span>
          </div>

          {/* Download Success Confirmation Badge */}
          {downloadedBackupInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">
                  {isAr
                    ? `تم تنزيل النسخة الاحتياطية بنجاح: ${downloadedBackupInfo.filename}`
                    : `Sauvegarde téléchargée avec succès : ${downloadedBackupInfo.filename}`}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0 font-mono">
                {downloadedBackupInfo.timestamp}
              </span>
            </div>
          )}
        </div>

        {/* Secondary Actions: Restore Backup & Offline HTML */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Import / Restore JSON */}
          <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-left rtl:text-right transition-all flex flex-col justify-between space-y-2 cursor-pointer group">
            <div className="flex items-center justify-between">
              <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                JSON
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {isAr ? 'استعادة نسخة احتياطية (Importer JSON)' : 'Restaurer une sauvegarde (Importer)'}
              </div>
              <div className="text-[11px] text-slate-400">
                {isAr ? 'اختر ملف .json من جهازك لاسترجاع البيانات' : 'Sélectionnez un fichier .json pour réinjecter vos données.'}
              </div>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Download Offline HTML Snapshot */}
          <button
            onClick={handleDownloadStandaloneHtml}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-left rtl:text-right transition-all flex flex-col justify-between space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <FileCode className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                HTML
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {isAr ? 'تحميل كصفحة ويب مستقلة (HTML)' : 'Instantané Hors-Ligne (HTML)'}
              </div>
              <div className="text-[11px] text-slate-400">
                {isAr ? 'صفحة مستقلة تعمل 100% بدون إنترنت' : 'Fichier HTML complet fonctionnant sans connexion internet.'}
              </div>
            </div>
          </button>
        </div>

        {importError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}
      </section>

      {/* 6. Danger Zone: Reset Data */}
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-900/30">
          <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Zone de Danger</span>
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {t('settings_clear')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Efface les données locales et restaure la configuration d'origine.
            </div>
          </div>

          <button
            onClick={() => {
              setIsResetConfirmOpen(true);
              chimePlayer.playChime('modal_open');
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all active:scale-95 shrink-0"
          >
            {t('delete')}
          </button>
        </div>

        {isResetConfirmOpen && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 space-y-3">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
              Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  chimePlayer.playChime('delete');
                  onResetData();
                  setIsResetConfirmOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
              >
                Confirmer l'effacement
              </button>
              <button
                onClick={() => {
                  chimePlayer.playChime('modal_close');
                  setIsResetConfirmOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};