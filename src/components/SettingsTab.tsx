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
} from 'lucide-react';
import { AppLanguage, AppSettings, FontSizeOption, FullAppData, ThemeMode } from '../types';
import { exportAppDataToFile } from '../utils/storage';
import { chimePlayer } from '../utils/audio';
import { getT } from '../utils/i18n';
import { DatabaseSyncState, logoutUser } from '../services/firestoreService';
import { GoogleAuthButton } from './GoogleAuthButton';
import firebaseConfig from '../../firebase-applet-config.json';

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

  const handleDownloadBackup = () => {
    const filename = exportAppDataToFile(fullData);
    setDownloadedBackupInfo({
      filename,
      timestamp: new Date().toLocaleTimeString(),
    });
    setImportError(null);
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

        } else {
          setImportError('Format de données JSON invalide.');
        }
      } catch (err) {
        setImportError('Impossible de lire le fichier JSON.');
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
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
      <section className="bg-white dark:bg-[#1A2535] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t('settings_sound')}</span>
          </h2>
          <button
            onClick={() =>
              onUpdateSettings({ chimeSoundEnabled: !settings.chimeSoundEnabled })
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${settings.chimeSoundEnabled
              ? 'bg-teal-600 text-white'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
          >
            {settings.chimeSoundEnabled ? 'Activé ✓' : 'Désactivé'}
          </button>
        </div>

        {settings.chimeSoundEnabled && (
          <div className="flex items-center gap-4 max-w-sm">
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
              }}
              className="flex-1 accent-teal-600"
            />
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {Math.round((settings.soundVolume ?? 0.65) * 100)}%
            </span>
          </div>
        )}
      </section>

      {/* 5. Data Backup & Export (JSON Download) */}
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
              <Download className="w-4 h-4 animate-bounce" />
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
            onClick={() => setIsResetConfirmOpen(true)}
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
                  onResetData();
                  setIsResetConfirmOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
              >
                Confirmer l'effacement
              </button>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
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