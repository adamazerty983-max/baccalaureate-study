import React, { useEffect } from 'react';
import { Sparkles, X, ExternalLink } from 'lucide-react';
import { renderSanitizedReleaseNotes } from '../../utils/releaseNotesSanitizer';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  version?: string;
  releaseNotes?: string;
  language?: string;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({
  isOpen,
  onClose,
  version,
  releaseNotes,
  language = 'fr',
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = isAr
    ? `ما الجديد في الإصدار ${version || ''}`
    : isEn
    ? `What's New in Version ${version || ''}`
    : `Nouveautés de la version ${version || ''}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-notes-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-[#151D2A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="release-notes-title" className="text-sm font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              {version && (
                <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400">
                  v{version}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={isAr ? 'إغلاق' : isEn ? 'Close' : 'Fermer'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-3 text-slate-700 dark:text-slate-300">
          {releaseNotes ? (
            renderSanitizedReleaseNotes(releaseNotes)
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              {isAr
                ? 'لا توجد ملاحظات تفصيلية لهذا الإصدار.'
                : isEn
                ? 'No detailed notes provided for this release.'
                : 'Aucune note détaillée fournie pour cette version.'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
          >
            {isAr ? 'حسناً' : isEn ? 'Got it' : 'Compris'}
          </button>
        </div>
      </div>
    </div>
  );
};
