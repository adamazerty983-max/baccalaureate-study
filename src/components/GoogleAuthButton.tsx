import React, { useState } from 'react';
import { loginWithGoogle, FirebaseUser } from '../services/firestoreService';
import { chimePlayer } from '../utils/audio';
import { AppLanguage } from '../types';

interface GoogleAuthButtonProps {
  language?: AppLanguage;
  variant?: 'header' | 'default' | 'card' | 'sidebar';
  onSuccess?: (user: FirebaseUser) => void;
  className?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  language = 'fr',
  variant = 'default',
  onSuccess,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAr = language === 'ar';

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await loginWithGoogle();
      if (res.success && res.user) {
        if (onSuccess) {
          onSuccess(res.user);
        }
      } else if (res.error) {
        if (!res.error.toLowerCase().includes('annulée')) {
          setErrorMessage(res.error);
        }
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.toLowerCase().includes('annulée')) {
        setErrorMessage(msg || 'Erreur lors de la connexion Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const GoogleLogo = () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
  );

  if (variant === 'header') {
    return (
      <div className="relative inline-block">
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-60 ${className}`}
          title={isAr ? 'تسجيل الدخول باستخدام حساب Google' : 'Se connecter avec Google'}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleLogo />
          )}
          <span className="hidden sm:inline">
            {isAr ? 'دخول Google' : 'Connexion Google'}
          </span>
        </button>
        {errorMessage && (
          <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-rose-50 dark:bg-rose-950/90 text-rose-600 dark:text-rose-400 text-[11px] font-medium rounded-xl border border-rose-200 dark:border-rose-900 shadow-xl z-50">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="w-full">
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-bold shadow-sm transition-all active:scale-98 disabled:opacity-60 ${className}`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleLogo />
          )}
          <span>{isAr ? 'تسجيل الدخول بـ Google' : 'Connexion Google'}</span>
        </button>
        {errorMessage && (
          <p className="text-[10px] text-rose-400 text-center mt-1 font-medium">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-800 dark:text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-98 disabled:opacity-60 ${className}`}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <GoogleLogo />
        )}
        <span>
          {isAr
            ? 'تسجيل الدخول والمزامنة باستخدام Google'
            : 'Continuer et synchroniser avec Google'}
        </span>
      </button>
      {errorMessage && (
        <div className="mt-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium">
          {errorMessage}
        </div>
      )}
    </div>
  );
};