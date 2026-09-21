import React, { useState } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Share2,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  Mail,
  Lock,
  Key,
  Smartphone,
  Copy,
  Check,
  X,
  Sparkles,
  HardDrive,
} from 'lucide-react';
import { AppLanguage, FullAppData } from '../../types';
import { DatabaseSyncState, loginWithGoogle, loginWithEmail, registerWithEmail, logoutUser } from '../../services/firestoreService';
import { saveUserData as saveUserDataToSupabase } from '../../services/supabaseService';
import { syncWithCloud, getStorageEstimate } from '../../utils/storage';
import { chimePlayer } from '../../utils/audio';
import firebaseConfig from '../../../firebase-applet-config.json';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: DatabaseSyncState;
  appData: FullAppData;
  language: AppLanguage;
  onDataLoaded: (data: FullAppData) => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  syncState,
  appData,
  language,
  onDataLoaded,
}) => {
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'status' | 'room' | 'auth'>('status');
  const [roomCodeInput, setRoomCodeInput] = useState(appData.settings.cloudSyncCode || '');
  const [isSyncingRoom, setIsSyncingRoom] = useState(false);
  const [roomMessage, setRoomMessage] = useState<string | null>(null);
  const [isCopiedCode, setIsCopiedCode] = useState(false);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [manualSaveMessage, setManualSaveMessage] = useState<string | null>(null);

  const [storageInfo, setStorageInfo] = useState<{
    usageFormatted: string;
    quotaFormatted: string;
    percentage: number;
    isIndexedDBSupported: boolean;
  }>({
    usageFormatted: '...',
    quotaFormatted: '...',
    percentage: 0,
    isIndexedDBSupported: true,
  });

  React.useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
  }, []);

  if (!isOpen) return null;

  const handleManualSave = async () => {
    if (!syncState.currentUser) return;
    setIsManualSaving(true);
    setManualSaveMessage(null);
    try {
      const res = await saveUserDataToSupabase(syncState.currentUser.uid, appData);
      if (res.success) {
        
        setManualSaveMessage(
          isAr
            ? 'تم حفظ ومزامنة قاعدة البيانات السحابية بنجاح!'
            : 'Base de données Supabase synchronisée avec succès !'
        );
      } else {
        setManualSaveMessage(res.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err: any) {
      setManualSaveMessage(err.message || 'Erreur inconnue');
    } finally {
      setIsManualSaving(false);
    }
  };

  const handleRoomSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    setIsSyncingRoom(true);
    setRoomMessage(null);

    const res = await syncWithCloud(
      roomCodeInput,
      appData,
      syncState.currentUser?.uid || 'anonymous'
    );
    setIsSyncingRoom(false);

    if (res.success) {
      
      setRoomMessage(res.message);
      if (res.data) {
        onDataLoaded(res.data);
      }
    } else {
      setRoomMessage(res.message);
    }
  };

  const handleGenerateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BAC-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomCodeInput(code);
  };

  const handleCopyCode = () => {
    if (!roomCodeInput) return;
    navigator.clipboard.writeText(roomCodeInput);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2000);
  };

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    const res = await loginWithGoogle();
    setIsAuthLoading(false);
    if (res.success) {
      
      setActiveTab('status');
    } else if (res.error && !res.error.toLowerCase().includes('annulée')) {
      setAuthError(res.error || 'Connexion Google échouée');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsAuthLoading(true);
    setAuthError(null);

    if (authMode === 'signup') {
      const res = await registerWithEmail(email, password, displayName);
      setIsAuthLoading(false);
      if (res.success) {
        
        setActiveTab('status');
      } else {
        setAuthError(res.error || 'Erreur lors de la création du compte');
      }
    } else {
      const res = await loginWithEmail(email, password);
      setIsAuthLoading(false);
      if (res.success) {
        
        setActiveTab('status');
      } else {
        setAuthError(res.error || 'Identifiants invalides');
      }
    }
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1A2535] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black font-['Outfit'] text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'قاعدة البيانات والمزامنة السحابية' : 'Base de Données Cloud & Synchronisation'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Firestore
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'حفظ وتحديث بياناتك الدراسية على السحابة ومشاركتها عبر أجهزتك'
                  : 'Sauvegarde automatique en temps réel sur Firebase Firestore'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-2 gap-2 bg-slate-50/30 dark:bg-slate-900/20">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{isAr ? 'حالة السحابة' : 'État de la Base'}</span>
          </button>

          <button
            onClick={() => setActiveTab('room')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'room'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'مزامنة برمز الغرفة' : 'Code Multi-Appareils'}</span>
          </button>

          <button
            onClick={() => setActiveTab('auth')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'auth'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{isAr ? 'الحساب والمستخدم' : 'Compte & Connexion'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* TAB 1: STATUS & CLOUD HEALTH */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Firestore Status Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {isAr ? 'اتصال قاعدة البيانات نشط' : 'Connexion Firestore Active'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Projet : <code className="font-mono text-teal-600 dark:text-teal-400">{firebaseConfig.projectId}</code>
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'متصل ومحمي' : 'En Ligne'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'المهام' : 'Tâches'}</span>
                    <strong className="text-xs text-slate-900 dark:text-white font-['Outfit'] font-black">
                      {(appData.tasks || []).length}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'الدروس' : 'Notes/Fiches'}</span>
                    <strong className="text-xs text-slate-900 dark:text-white font-['Outfit'] font-black">
                      {(appData.notes || []).length}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'الجدول' : 'Blocs Temps'}</span>
                    <strong className="text-xs text-slate-900 dark:text-white font-['Outfit'] font-black">
                      {(appData.timeBlocks || []).length}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'العادات' : 'Habitudes'}</span>
                    <strong className="text-xs text-slate-900 dark:text-white font-['Outfit'] font-black">
                      {(appData.habits || []).length}
                    </strong>
                  </div>
                </div>
              </div>

              {/* IndexedDB Local Engine Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-teal-500/5 to-emerald-500/5 border border-teal-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <HardDrive className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{isAr ? 'محرك التخزين المحلي IndexedDB' : 'Moteur de Stockage Local IndexedDB'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {isAr ? 'نشط (غير محدود)' : 'Actif (Illimité)'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isAr
                          ? 'تخزين متطور غير متزامن يحمي بياناتك بدون حد الـ 5MB الخاص بـ localStorage'
                          : 'Stockage asynchrone haute capacité remplaçant la limite 5MB de localStorage'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-500" />
                    <span>{isAr ? 'المساحة المستخدمة:' : 'Espace utilisé :'}</span>
                    <strong className="text-teal-600 dark:text-teal-400 font-mono">{storageInfo.usageFormatted}</strong>
                  </span>
                  <span>
                    {isAr ? 'الحصة المتوفرة:' : 'Quota total :'} <strong className="font-mono">{storageInfo.quotaFormatted}</strong>
                  </span>
                </div>
              </div>

              {/* Realtime Sync Details */}
              <div className="p-4 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-300">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'مزامنة لحظية تلقائية' : 'Synchronisation Temps Réel Firestore'}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'يتم حفظ كل تعديل، إكمال مهمة، أو إضافة ملاحظة تلقائياً في قاعدة البيانات السحابية، وتكون متاحة فوراً على جميع أجهزتك.'
                    : 'Toutes vos modifications, tâches complétées et fiches sont automatiquement synchronisées sur votre base Cloud Firestore.'}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    {syncState.lastSyncedAt
                      ? `${isAr ? 'آخر مزامنة:' : 'Dernière synchro :'} ${syncState.lastSyncedAt}`
                      : `${isAr ? 'تاريخ التحديث:' : 'Mis à jour :'} ${new Date(appData.updatedAt || Date.now()).toLocaleTimeString()}`}
                  </span>

                  <button
                    onClick={handleManualSave}
                    disabled={isManualSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isManualSaving ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'مزامنة فورية' : 'Forcer Sauvegarde'}</span>
                  </button>
                </div>

                {manualSaveMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    {manualSaveMessage}
                  </div>
                )}
              </div>

              {/* Current User Pill */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {syncState.currentUser?.displayName || (syncState.currentUser?.isAnonymous ? 'Compte Invité Sécurisé' : 'Élève Bac')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      UID: {syncState.currentUser?.uid?.slice(0, 12)}...
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('auth')}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {syncState.currentUser?.isAnonymous ? 'Associer un compte' : 'Gérer'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-DEVICE ROOM CODE */}
          {activeTab === 'room' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'مزامنة فورية بين الهاتف والحاسوب' : 'Synchroniser entre Téléphone et Ordinateur'}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'أنشئ رمزاً خاصاً لحسابك، ثم أدخل نفس الرمز على هاتفك أو جهازك الآخر لاستيراد ومزامنة نفس البيانات فوراً.'
                    : 'Entrez un code de salle pour synchroniser vos données entre votre PC, tablette ou téléphone via Firestore.'}
                </p>

                <form onSubmit={handleRoomSync} className="space-y-3 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: BAC-8X9Y2"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />

                    <button
                      type="button"
                      onClick={handleCopyCode}
                      disabled={!roomCodeInput}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 shrink-0"
                      title="Copier le code"
                    >
                      {isCopiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateRoomCode}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-teal-600 dark:text-teal-400 text-xs font-bold shrink-0"
                    >
                      Générer
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSyncingRoom || !roomCodeInput.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all active:scale-98 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingRoom ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'مزامنة مع هذه الغرفة' : 'Synchroniser avec la Salle'}</span>
                  </button>
                </form>

                {roomMessage && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <span>{roomMessage}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT / AUTH */}
          {activeTab === 'auth' && (
            <div className="space-y-4">
              {syncState.currentUser && !syncState.currentUser.isAnonymous ? (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-center">
                  {syncState.currentUser.photoURL ? (
                    <img
                      src={syncState.currentUser.photoURL}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-teal-500 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto text-lg font-bold border-2 border-teal-500/30 shadow-md">
                      {syncState.currentUser.displayName ? syncState.currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                      <span>{syncState.currentUser.displayName || 'Élève Connecté'}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{syncState.currentUser.email}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                    {isAr
                      ? 'بياناتك وملاحظاتك الدراسية متصلة ومحفوظة تلقائياً في حساب Google الخاص بك على Firestore.'
                      : 'Vos données et notes sont sauvegardées en temps réel sur votre compte Google personnel Firestore.'}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20 transition-all mx-auto"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تسجيل الخروج' : 'Se déconnecter'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Google Login Button */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isAuthLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-white text-xs font-bold shadow-xs transition-all active:scale-98"
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
                    <span>{isAr ? 'تسجيل الدخول باستخدام Google' : 'Continuer avec Google'}</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Ou avec e-mail</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  </div>

                  {/* Email/Password form */}
                  <form onSubmit={handleEmailAuth} className="space-y-3">
                    {authMode === 'signup' && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">
                          Nom complet ou Pseudo
                        </label>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Ex: Adam B."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Adresse e-mail</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="mon.bac@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Mot de passe</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    {authError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all active:scale-98 disabled:opacity-50"
                    >
                      {authMode === 'signup' ? 'Créer mon compte Bac' : 'Se connecter'}
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                        setAuthError(null);
                      }}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      {authMode === 'signin'
                        ? "Pas encore de compte ? S'inscrire"
                        : 'Déjà un compte ? Se connecter'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-teal-500" />
            <span>Sécurisé avec Firebase Firestore & SSL</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
