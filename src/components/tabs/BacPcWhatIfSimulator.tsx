import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Award,
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Wand2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppLanguage } from '../../types';
import { chimePlayer } from '../../utils/audio';

interface BacPcWhatIfSimulatorProps {
  language: AppLanguage;
}

export interface PcNationalSubject {
  id: string;
  name: { fr: string; ar: string; en: string };
  coeff: number;
  color: string;
  dotColor: string;
  defaultGrade: number;
}

export const PC_NATIONAL_SUBJECTS: PcNationalSubject[] = [
  {
    id: 'pc',
    name: { fr: 'Physique - Chimie', ar: 'الفيزياء والكيمياء', en: 'Physics & Chemistry' },
    coeff: 7,
    color: 'from-sky-500 to-blue-600',
    dotColor: 'bg-sky-500',
    defaultGrade: 16.0,
  },
  {
    id: 'math',
    name: { fr: 'Mathématiques', ar: 'الرياضيات', en: 'Mathematics' },
    coeff: 7,
    color: 'from-teal-500 to-emerald-600',
    dotColor: 'bg-teal-500',
    defaultGrade: 15.5,
  },
  {
    id: 'svt',
    name: { fr: 'Sciences de la Vie et de la Terre', ar: 'علوم الحياة والأرض', en: 'Life & Earth Sciences' },
    coeff: 5,
    color: 'from-emerald-500 to-green-600',
    dotColor: 'bg-emerald-500',
    defaultGrade: 15.0,
  },
  {
    id: 'anglais',
    name: { fr: 'Anglais (Langue 2)', ar: 'اللغة الإنجليزية', en: 'English' },
    coeff: 2,
    color: 'from-indigo-500 to-violet-600',
    dotColor: 'bg-indigo-500',
    defaultGrade: 15.0,
  },
  {
    id: 'philo',
    name: { fr: 'Philosophie', ar: 'الفلسفة', en: 'Philosophy' },
    coeff: 2,
    color: 'from-purple-500 to-pink-600',
    dotColor: 'bg-purple-500',
    defaultGrade: 13.5,
  },
];

export const TOTAL_PC_NATIONAL_COEFF = 23; // 7 + 7 + 5 + 2 + 2

export interface BacMention {
  id: string;
  minGrade: number;
  title: { fr: string; ar: string; en: string };
  badgeClass: string;
  borderClass: string;
  glowClass: string;
  emoji: string;
}

export const BAC_MENTIONS: BacMention[] = [
  {
    id: 'tres_bien',
    minGrade: 16.0,
    title: { fr: 'Mention Très Bien', ar: 'ميزة حسن جداً', en: 'High Honors (Très Bien)' },
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderClass: 'border-emerald-500/40',
    glowClass: 'from-emerald-500/20 to-teal-500/10',
    emoji: '🏆',
  },
  {
    id: 'bien',
    minGrade: 14.0,
    title: { fr: 'Mention Bien', ar: 'ميزة حسن', en: 'Honors (Bien)' },
    badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    borderClass: 'border-teal-500/40',
    glowClass: 'from-teal-500/20 to-sky-500/10',
    emoji: '🎖️',
  },
  {
    id: 'assez_bien',
    minGrade: 12.0,
    title: { fr: 'Mention Assez Bien', ar: 'ميزة مستحسن', en: 'Good (Assez Bien)' },
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    borderClass: 'border-amber-500/40',
    glowClass: 'from-amber-500/20 to-orange-500/10',
    emoji: '👍',
  },
  {
    id: 'passable',
    minGrade: 10.0,
    title: { fr: 'Admis (Passable)', ar: 'مقبول / نجاح', en: 'Pass (Admis)' },
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    borderClass: 'border-blue-500/40',
    glowClass: 'from-blue-500/20 to-indigo-500/10',
    emoji: '🎓',
  },
];

export const BacPcWhatIfSimulator: React.FC<BacPcWhatIfSimulatorProps> = ({ language }) => {
  const isAr = language === 'ar';

  // 1. Target Mention or Custom Grade
  const [selectedMentionId, setSelectedMentionId] = useState<string>('tres_bien');
  const [targetGrade, setTargetGrade] = useState<number>(16.0);

  // 2. Pillars: Regional (25%) and Continuous Assessment (25%)
  const [regionalGrade, setRegionalGrade] = useState<number>(14.5);
  const [continuousGrade, setContinuousGrade] = useState<number>(15.5);

  // 3. National Exam Subject Predicted Grades (50%)
  const [subjectGrades, setSubjectGrades] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    PC_NATIONAL_SUBJECTS.forEach((s) => {
      init[s.id] = s.defaultGrade;
    });
    return init;
  });

  // Collapsible detailed analysis state
  const [showSubjectDetails, setShowSubjectDetails] = useState(true);

  // Calculations
  const calculations = useMemo(() => {
    // 1. Weighted National Mark
    let totalPoints = 0;
    PC_NATIONAL_SUBJECTS.forEach((s) => {
      const g = subjectGrades[s.id] ?? s.defaultGrade;
      totalPoints += g * s.coeff;
    });
    const nationalAvg = totalPoints / TOTAL_PC_NATIONAL_COEFF;

    // 2. Overall Moroccan Bac Mark
    // Formula: (National * 0.50) + (Regional * 0.25) + (Continuous * 0.25)
    const overallBac = nationalAvg * 0.5 + regionalGrade * 0.25 + continuousGrade * 0.25;

    // 3. Required National average to achieve target
    // target = (reqNat * 0.50) + (regional * 0.25) + (continuous * 0.25)
    // => reqNat = (target - 0.25*reg - 0.25*cont) / 0.50
    const requiredNational = (targetGrade - 0.25 * regionalGrade - 0.25 * continuousGrade) / 0.5;

    // 4. Current Achieved Mention
    let currentMention = BAC_MENTIONS[BAC_MENTIONS.length - 1];
    for (const m of BAC_MENTIONS) {
      if (overallBac >= m.minGrade) {
        currentMention = m;
        break;
      }
    }
    const isPassed = overallBac >= 10.0;
    const isTargetAchieved = overallBac >= targetGrade;

    // 5. Delta from target
    const delta = overallBac - targetGrade;

    return {
      nationalAvg,
      overallBac,
      requiredNational,
      currentMention,
      isPassed,
      isTargetAchieved,
      delta,
      totalPoints,
    };
  }, [subjectGrades, regionalGrade, continuousGrade, targetGrade]);

  // Handle Target Mention Selection
  const handleSelectMention = (mention: BacMention) => {
    setSelectedMentionId(mention.id);
    setTargetGrade(mention.minGrade);
    if (mention.minGrade >= 16) {
      chimePlayer.playChime('simulator_celebrate');
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else {
      chimePlayer.playChime('click');
    }
  };

  // Grade adjustment helper
  const handleSetSubjectGrade = (id: string, val: number) => {
    const clamped = Math.max(0, Math.min(20, Math.round(val * 4) / 4));
    setSubjectGrades((prev) => ({
      ...prev,
      [id]: clamped,
    }));
  };

  // Auto-Distribute Strategy: Balances subjects to hit target required national mark
  const handleAutoDistribute = () => {
    chimePlayer.playChime('simulator_celebrate');
    const req = Math.max(6, Math.min(19.8, calculations.requiredNational));

    // Realistic distribution for PC branch students:
    // PC & Math are primary strengths, SVT solid, Philo usually more conservative
    const baseWeights: Record<string, number> = {
      pc: 1.03, // Strengths
      math: 1.01,
      svt: 0.99,
      anglais: 1.0,
      philo: 0.88, // Typically lower in Morocco
    };

    let weightedSum = 0;
    PC_NATIONAL_SUBJECTS.forEach((s) => {
      weightedSum += baseWeights[s.id] * s.coeff;
    });

    const scale = (req * TOTAL_PC_NATIONAL_COEFF) / weightedSum;

    const newGrades: Record<string, number> = {};
    PC_NATIONAL_SUBJECTS.forEach((s) => {
      const raw = baseWeights[s.id] * scale;
      // Clamp to 0..20 and round to nearest 0.25
      const clamped = Math.max(8, Math.min(20, Math.round(raw * 4) / 4));
      newGrades[s.id] = clamped;
    });

    setSubjectGrades(newGrades);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#0d9488', '#0284c7', '#f59e0b', '#10b981'],
    });
  };

  // Preset: Scientific Excellence Focus (PC 18+, Math 18+)
  const handleScientificExcellencePreset = () => {
    chimePlayer.playChime('streak');
    setSubjectGrades({
      pc: 18.5,
      math: 18.0,
      svt: 16.5,
      anglais: 16.0,
      philo: 13.5,
    });
  };

  // Reset to default
  const handleReset = () => {
    chimePlayer.playChime('delete');
    const init: Record<string, number> = {};
    PC_NATIONAL_SUBJECTS.forEach((s) => {
      init[s.id] = s.defaultGrade;
    });
    setSubjectGrades(init);
    setRegionalGrade(14.5);
    setContinuousGrade(15.5);
    setTargetGrade(16.0);
    setSelectedMentionId('tres_bien');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#091120] via-[#0E182A] to-[#14233D] p-6 sm:p-7 border border-teal-500/25 shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>{isAr ? 'محاكي الامتحان الوطني الذكي' : 'Simulateur National Bac'}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-teal-400/20 text-teal-200 text-[10px] font-black">
                2ème BAC PC
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black font-['Outfit'] tracking-tight">
              {isAr
                ? 'محاكي ميزة البكالوريا — شعبة العلوم التجريبية مسلك العلوم الفيزيائية'
                : 'Simulateur de Mention Bac — Sciences Physiques (PC)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAr
                ? 'حدّد الميزة التي تطمح إليها، وسيقوم النظام بحساب المعدل الوطني المطلوب وتوزيع النقط المثالي على مواد الوطني (الفيزياء 7، الرياضيات 7، العلوم 5، الإنجليزية 2، الفلسفة 2).'
                : 'Définissez votre mention cible. Le simulateur calcule la moyenne requise au National et répartit les notes optimales selon les coefficients officiels de la filière PC.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-all cursor-pointer shadow-xs"
              title={isAr ? 'إعادة تعيين القيم' : 'Réinitialiser'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Select Target Mention */}
      <div className="bg-white dark:bg-[#1A2535] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
              1
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Target className="w-4 h-4 text-teal-500" />
              <span>{isAr ? 'اختر الميزة المستهدفة في البكالوريا' : 'Choisissez votre mention cible'}</span>
            </h3>
          </div>

          {/* Target Grade Display */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isAr ? 'المعدل المستهدف:' : 'Moyenne cible :'}
            </span>
            <span className="text-base font-black font-['Outfit'] text-teal-600 dark:text-teal-400 bg-teal-500/10 px-3 py-0.5 rounded-lg border border-teal-500/20">
              {targetGrade.toFixed(2)} / 20
            </span>
          </div>
        </div>

        {/* Mentions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {BAC_MENTIONS.map((m) => {
            const isSelected = selectedMentionId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMention(m)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? `${m.borderClass} ring-2 ring-teal-500/30 bg-gradient-to-b ${m.glowClass} shadow-md`
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:border-teal-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{m.emoji}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${m.badgeClass}`}
                  >
                    ≥ {m.minGrade}.00
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {m.title[language] || m.title.fr}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {m.id === 'tres_bien'
                      ? isAr
                        ? 'مطلوبة للأقسام التحضيرية والطب'
                        : 'Idéal CPGE, Médecine, ENSA'
                      : m.id === 'bien'
                      ? isAr
                        ? 'تفتح لك أغلب المدارس العليا'
                        : 'Grandes écoles & concours'
                      : m.id === 'assez_bien'
                      ? isAr
                        ? 'نتائج جيدة جداً ومطمئنة'
                        : 'Très bon parcours sécurisé'
                      : isAr
                        ? 'شهادة البكالوريا بنجاح'
                        : 'Obtention du diplôme'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Target Slider */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-teal-500" />
            <span>{isAr ? 'تخصيص معدل مستهدف محدد (سلايدر):' : 'Personnaliser la moyenne cible :'}</span>
          </label>
          <div className="flex items-center gap-3 w-full sm:w-80">
            <input
              type="range"
              min="10.0"
              max="19.5"
              step="0.25"
              value={targetGrade}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setTargetGrade(val);
                setSelectedMentionId('');
              }}
              className="w-full accent-teal-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="text-sm font-black font-['Outfit'] text-slate-800 dark:text-slate-200 min-w-[55px] text-right">
              {targetGrade.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Step 2: Regional & Continuous Assessment Inputs */}
      <div className="bg-white dark:bg-[#1A2535] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
            2
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Award className="w-4 h-4 text-teal-500" />
            <span>{isAr ? 'أدخل نقطتي الجهوي والمراقبة المستمرة' : 'Notes du Régional et du Contrôle Continu'}</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Regional Exam (25%) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'نقطة الامتحان الجهوي (1ère BAC)' : 'Note de l\'Examen Régional (1ère BAC)'}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {isAr ? 'يمثل 25% من المعدل العام' : 'Compte pour 25% de la note finale'}
                </span>
              </div>
              <span className="text-lg font-black font-['Outfit'] text-teal-600 dark:text-teal-400">
                {regionalGrade.toFixed(2)} / 20
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="20"
                step="0.25"
                value={regionalGrade}
                onChange={(e) => setRegionalGrade(parseFloat(e.target.value))}
                className="w-full accent-teal-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                {isAr ? 'المساهمة في الباك:' : 'Apport final :'} +{(regionalGrade * 0.25).toFixed(2)} pts
              </span>
              <div className="flex gap-1">
                {[12, 14, 16, 18].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRegionalGrade(v)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Continuous Assessment (25%) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'معدل المراقبة المستمرة (2ème BAC)' : 'Moyenne Contrôle Continu (2ème BAC)'}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {isAr ? 'يمثل 25% من المعدل العام' : 'Compte pour 25% de la note finale'}
                </span>
              </div>
              <span className="text-lg font-black font-['Outfit'] text-teal-600 dark:text-teal-400">
                {continuousGrade.toFixed(2)} / 20
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="20"
                step="0.25"
                value={continuousGrade}
                onChange={(e) => setContinuousGrade(parseFloat(e.target.value))}
                className="w-full accent-teal-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                {isAr ? 'المساهمة في الباك:' : 'Apport final :'} +{(continuousGrade * 0.25).toFixed(2)} pts
              </span>
              <div className="flex gap-1">
                {[13, 15, 17, 19].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setContinuousGrade(v)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Required National Exam Verdict Callout */}
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-teal-500 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white">
                {isAr ? 'المعدل الوطني الأدنى المطلوب في الامتحان الوطني:' : 'Moyenne minimale requise au National :'}
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {calculations.requiredNational <= 20
                  ? isAr
                    ? `بناءً على نقطتي الجهوي والمراقبة، يلزمك الحصول على ${calculations.requiredNational.toFixed(2)} في الوطني لبلوغ ميزتك.`
                    : `Pour décrocher votre objectif de ${targetGrade.toFixed(2)}, vous devez viser ${calculations.requiredNational.toFixed(2)} au National.`
                  : isAr
                    ? '⚠️ المعدل المطلوب يتجاوز 20/20! حاول رفع تقدير المراقبة المستمرة أو تعديل الهدف.'
                    : '⚠️ Objectif supérieur à 20/20 au national. Ajustez votre contrôle continu ou votre cible.'}
              </span>
            </div>
          </div>
          <div className="shrink-0 font-['Outfit'] font-black text-2xl text-teal-600 dark:text-teal-400 bg-white/80 dark:bg-slate-900/80 px-4 py-1.5 rounded-xl border border-teal-500/30">
            {calculations.requiredNational.toFixed(2)} <span className="text-xs text-slate-400">/ 20</span>
          </div>
        </div>
      </div>

      {/* Step 3: PC National Exam Subject Sliders (50%) */}
      <div className="bg-white dark:bg-[#1A2535] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-teal-500" />
                <span>{isAr ? 'محاكاة نقط مواد الامتحان الوطني (مسلك PC)' : 'Simulation des notes du National (PC)'}</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'معاملات مسلك العلوم الفيزيائية: الفيزياء 7، الرياضيات 7، العلوم 5، الإنجليزية 2، الفلسفة 2 (مجموع 23)' : 'Coefficients officiels PC : PC (7), Maths (7), SVT (5), Anglais (2), Philo (2)'}
              </span>
            </div>
          </div>

          {/* Quick AI Presets Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAutoDistribute}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm shadow-teal-500/20 transition-all cursor-pointer active:scale-95"
              title={isAr ? 'توزيع النقط التلقائي الذكي لبلوغ الهدف' : 'Distribution automatique optimale'}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'توزيع ذكي للميزة' : 'Auto-Balance'}</span>
            </button>

            <button
              type="button"
              onClick={handleScientificExcellencePreset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isAr ? 'نمط التفوق العلمي (18+)' : 'Excellence PC/Math'}</span>
            </button>
          </div>
        </div>

        {/* 5 Subject Sliders */}
        <div className="space-y-3.5">
          {PC_NATIONAL_SUBJECTS.map((sub) => {
            const currentGrade = subjectGrades[sub.id] ?? sub.defaultGrade;
            const pointsContribution = (currentGrade * sub.coeff).toFixed(1);
            const coeffWeightPercent = Math.round((sub.coeff / TOTAL_PC_NATIONAL_COEFF) * 100);

            return (
              <div
                key={sub.id}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 hover:border-teal-500/30 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${sub.dotColor}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {sub.name[language] || sub.name.fr}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded-md">
                          {isAr ? `المعامل ${sub.coeff}` : `Coef ${sub.coeff}`} ({coeffWeightPercent}%)
                        </span>
                        <span>•</span>
                        <span>
                          {isAr
                            ? `المساهمة في المجموع: ${pointsContribution} نقطة`
                            : `Total : ${pointsContribution} pts`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quick increment/decrement */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetSubjectGrade(sub.id, currentGrade - 0.5)}
                        className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-base font-black font-['Outfit'] text-slate-900 dark:text-white min-w-[50px] text-center">
                        {currentGrade.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSetSubjectGrade(sub.id, currentGrade + 0.5)}
                        className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.25"
                  value={currentGrade}
                  onChange={(e) => handleSetSubjectGrade(sub.id, parseFloat(e.target.value))}
                  className="w-full accent-teal-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 4: Final Comprehensive Verdict Card */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 border shadow-2xl transition-all duration-500 ${
          calculations.isTargetAchieved
            ? 'bg-gradient-to-br from-[#061e18] via-[#0b2820] to-[#0f3428] border-emerald-500/40 text-white'
            : 'bg-gradient-to-br from-[#1e1309] via-[#281c0f] to-[#342414] border-amber-500/40 text-white'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Main Grade Big Callout */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-white/10 border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAr ? 'النتيجة المتوقعة للبكالوريا (مسلك PC)' : 'Résultat Estimé du Baccalauréat (PC)'}</span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl sm:text-6xl font-black font-['Outfit'] tracking-tight text-white drop-shadow-md">
                {calculations.overallBac.toFixed(2)}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-300">/ 20</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs ${calculations.currentMention.badgeClass}`}
              >
                {calculations.currentMention.emoji} {calculations.currentMention.title[language] || calculations.currentMention.title.fr}
              </span>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  calculations.isTargetAchieved
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {calculations.isTargetAchieved
                  ? isAr
                    ? `✓ تم بلوغ الهدف بنجاح (+${calculations.delta.toFixed(2)} نقطة)`
                    : `✓ Objectif atteint (+${calculations.delta.toFixed(2)} pts)`
                  : isAr
                    ? `ينقصك ${Math.abs(calculations.delta).toFixed(2)} نقطة لبلوغ ميزتك`
                    : `Il vous manque ${Math.abs(calculations.delta).toFixed(2)} pts pour la mention`}
              </span>
            </div>
          </div>

          {/* 3 Pillars Summary Pillars */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto text-center">
            {/* National Exam Box */}
            <div className="p-3 sm:p-4 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">
                {isAr ? 'الوطني (50%)' : 'National'}
              </span>
              <div className="text-lg sm:text-2xl font-black font-['Outfit'] text-teal-300">
                {calculations.nationalAvg.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                +{(calculations.nationalAvg * 0.5).toFixed(2)} pts
              </span>
            </div>

            {/* Regional Exam Box */}
            <div className="p-3 sm:p-4 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">
                {isAr ? 'الجهوي (25%)' : 'Régional'}
              </span>
              <div className="text-lg sm:text-2xl font-black font-['Outfit'] text-sky-300">
                {regionalGrade.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                +{(regionalGrade * 0.25).toFixed(2)} pts
              </span>
            </div>

            {/* Continuous Assessment Box */}
            <div className="p-3 sm:p-4 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">
                {isAr ? 'المراقبة (25%)' : 'Contrôle'}
              </span>
              <div className="text-lg sm:text-2xl font-black font-['Outfit'] text-indigo-300">
                {continuousGrade.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                +{(continuousGrade * 0.25).toFixed(2)} pts
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
