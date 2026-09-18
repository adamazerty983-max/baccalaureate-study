import React, { useState, useMemo } from 'react';
import { Calculator, Plus, Trash2, TrendingUp, Award, CheckCircle, X, Sparkles } from 'lucide-react';
import { BacPcWhatIfSimulator } from './BacPcWhatIfSimulator';
import { AppLanguage, GradeItem } from '../types';
import { BAC_SUBJECTS, getSubjectCoefficient } from '../utils/constants';
import { chimePlayer } from '../utils/audio';
import { getT } from '../utils/i18n';

interface AverageTabProps {
  grades: GradeItem[];
  language: AppLanguage;
  customCoefficients?: Record<string, number>;
  onAddGrade: (grade: Omit<GradeItem, 'id'>) => void;
  onDeleteGrade: (id: string) => void;
}

export const AverageTab: React.FC<AverageTabProps> = ({
  grades,
  language,
  customCoefficients,
  onAddGrade,
  onDeleteGrade,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'grades' | 'simulator'>('grades');
  const [subject, setSubject] = useState(BAC_SUBJECTS[0].name);
  const [gradeValue, setGradeValue] = useState('17.5');
  const [coeffValue, setCoeffValue] = useState(() =>
    String(getSubjectCoefficient(BAC_SUBJECTS[0].name, customCoefficients))
  );
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().slice(0, 10));
  const [notesValue, setNotesValue] = useState('');

  // Weighted Average Calculation
  const stats = useMemo(() => {
    if (grades.length === 0) return { weightedAverage: 0, totalCoeff: 0, highestGrade: 0, lowestGrade: 0 };
    let totalPoints = 0;
    let totalCoeff = 0;
    let highest = 0;
    let lowest = 20;

    grades.forEach((g) => {
      totalPoints += g.grade * g.coeff;
      totalCoeff += g.coeff;
      if (g.grade > highest) highest = g.grade;
      if (g.grade < lowest) lowest = g.grade;
    });

    const weightedAverage = totalCoeff > 0 ? totalPoints / totalCoeff : 0;
    return {
      weightedAverage,
      totalCoeff,
      highestGrade: highest,
      lowestGrade: lowest === 20 && grades.length === 0 ? 0 : lowest,
    };
  }, [grades]);

  const mention = useMemo(() => {
    if (grades.length === 0) {
      return {
        text: isAr ? 'في انتظار إدخال النقط' : 'En attente de notes',
        color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
      };
    }
    const avg = stats.weightedAverage;
    if (avg >= 16) return { text: isAr ? 'ميزة حسن جداً' : 'Mention Très Bien', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' };
    if (avg >= 14) return { text: isAr ? 'ميزة حسن' : 'Mention Bien', color: 'text-teal-500 bg-teal-500/10 border-teal-500/30' };
    if (avg >= 12) return { text: isAr ? 'ميزة مستحسن' : 'Mention Assez Bien', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
    if (avg >= 10) return { text: isAr ? 'مقبول' : 'Passable', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' };
    return { text: isAr ? 'غير كافٍ' : 'Insuffisant', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' };
  }, [stats.weightedAverage, grades.length, isAr]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const gNum = parseFloat(gradeValue);
    const cNum = parseInt(coeffValue, 10);
    if (isNaN(gNum) || isNaN(cNum) || gNum < 0 || gNum > 20 || cNum <= 0) return;

    onAddGrade({
      subject,
      grade: gNum,
      coeff: cNum,
      date: dateValue,
      notes: notesValue.trim() || undefined,
    });

    chimePlayer.playChime('add');
    setIsModalOpen(false);
    setNotesValue('');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Mode Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-[#0E182A] rounded-2xl border border-slate-200 dark:border-slate-700/60">
        <button
          onClick={() => setActiveMode('grades')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeMode === 'grades'
              ? 'bg-white dark:bg-[#1A2535] text-teal-600 dark:text-teal-400 shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>{isAr ? 'سجل الفروض والنقط' : 'Saisie des notes'}</span>
        </button>
        <button
          onClick={() => setActiveMode('simulator')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeMode === 'simulator'
              ? 'bg-white dark:bg-[#1A2535] text-violet-600 dark:text-violet-400 shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAr ? 'محاكي ميزة الباك — علوم فيزيائية' : 'Simulateur Mention Bac (PC)'}</span>
          <span className="px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-500 dark:text-violet-400 text-[10px] font-black">PC</span>
        </button>
      </div>

      {/* Simulator View */}
      {activeMode === 'simulator' && (
        <BacPcWhatIfSimulator language={language} />
      )}

      {/* Grades View */}
      {activeMode === 'grades' && (<>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Calculator className="w-5 h-5" />
            </span>
            <span>{t('weighted_avg')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? 'حساب المعدل العام الموزون بالمعاملات حسب المسلك' : 'Calcul en temps réel de votre moyenne pondérée'}
          </p>
        </div>

        <button
          onClick={() => {
            setCoeffValue(String(getSubjectCoefficient(subject, customCoefficients)));
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add_grade')}</span>
        </button>
      </div>

      {/* Main Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Large Score Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-teal-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-teal-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
              {t('weighted_avg')}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${mention.color}`}>
              {mention.text}
            </span>
          </div>

          <div className="my-4 flex items-baseline gap-2">
            <span className="text-5xl font-black font-['Outfit'] tracking-tight text-white">
              {stats.weightedAverage.toFixed(2)}
            </span>
            <span className="text-xl font-bold text-teal-400/80">/ 20</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span>
              {isAr ? `إجمالي المعاملات: ${stats.totalCoeff}` : `Total Coeff: ${stats.totalCoeff}`}
            </span>
            <span>•</span>
            <span>
              {isAr ? `${grades.length} نقطة مسجلة` : `${grades.length} notes`}
            </span>
          </div>
        </div>

        {/* Highest Grade */}
        <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>{isAr ? 'أعلى نقطة' : 'Meilleure Note'}</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-['Outfit']">
              {stats.highestGrade.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-slate-400"> / 20</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isAr ? 'أداء ممتاز' : 'Performance max'}
          </span>
        </div>

        {/* Lowest Grade */}
        <div className="bg-white dark:bg-[#1A2535] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>{isAr ? 'أدنى نقطة' : 'Note Minimale'}</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 font-['Outfit']">
              {stats.lowestGrade.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-slate-400"> / 20</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isAr ? 'فرصة للتحسين' : 'Matière à renforcer'}
          </span>
        </div>
      </div>

      {/* Grades List Table */}
      <div className="bg-white dark:bg-[#1A2535] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isAr ? 'سجل النقاط والفروض' : 'Relevé des notes et contrôles'} ({grades.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {grades.map((item) => {
            const subjectInfo = BAC_SUBJECTS.find((s) => s.name === item.subject);
            return (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${subjectInfo?.dotColor || 'bg-teal-500'
                      }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.subject}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>{item.date}</span>
                      {item.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate">{item.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white font-['Outfit']">
                      {item.grade.toFixed(2)} <span className="text-[11px] text-slate-400">/20</span>
                    </div>
                    <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                      Coeff: {item.coeff} (Total: {(item.grade * item.coeff).toFixed(1)} pts)
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      chimePlayer.playChime('delete');
                      onDeleteGrade(item.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {grades.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              {t('no_grades')}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Grade */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold font-['Outfit']">{t('add_grade')}</h3>
              <button
                onClick={() => {
                  chimePlayer.playChime('modal_close');
                  setIsModalOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('subject')}
                </label>
                <select
                  value={subject}
                  onChange={(e) => {
                    const newSubj = e.target.value;
                    setSubject(newSubj);
                    setCoeffValue(String(getSubjectCoefficient(newSubj, customCoefficients)));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500"
                >
                  {BAC_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    {t('grade_label')}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    required
                    value={gradeValue}
                    onChange={(e) => setGradeValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    {t('coeff')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={coeffValue}
                    onChange={(e) => setCoeffValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('date')}
                </label>
                <input
                  type="date"
                  required
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('notes_lbl')} (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: الفرض الأول، إعداد ممتاز' : 'Ex: Contrôle Continu #1'}
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-500/20"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>)}
    </div>
  );
};
