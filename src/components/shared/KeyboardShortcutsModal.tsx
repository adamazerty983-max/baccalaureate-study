import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { AppLanguage } from '../../types';
import { getT } from '../../utils/i18n';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  language: AppLanguage;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  language,
  onClose,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  if (!isOpen) return null;

  const shortcuts = [
    { key: '1 - 9', desc: isAr ? 'التنقل السريع بين الأقسام والصفحات' : 'Naviguer rapidement entre les onglets' },
    { key: 'F', desc: isAr ? 'فتح أو تصغير وضع التركيز العميق (Focus Mode)' : 'Ouvrir / réduire le mode Concentration' },
    { key: 'D', desc: isAr ? 'التبديل بين الوضع الليلي والنهاري' : 'Basculer le mode sombre / clair' },
    { key: 'M', desc: isAr ? 'تشغيل أو كتم المؤثرات الصوتية' : 'Activer / couper les effets sonores' },
    { key: '?', desc: isAr ? 'عرض نافذة اختصارات لوحة المفاتيح' : 'Afficher ce guide des raccourcis' },
    { key: 'Esc', desc: isAr ? 'إغلاق النوافذ المنبثقة والتركيز' : 'Fermer les fenêtres modales' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Keyboard className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold font-['Outfit']">
              {isAr ? 'اختصارات لوحة المفاتيح' : 'Raccourcis Clavier'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {shortcuts.map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">{item.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200 shadow-xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
          >
            {isAr ? 'حسناً، فهمت' : 'Compris'}
          </button>
        </div>
      </div>
    </div>
  );
};
