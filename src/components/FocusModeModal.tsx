import React, { useState, useEffect } from 'react';
import { Play, Pause, X, CheckCircle, Flame, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import { AppLanguage, TimeBlock } from '../types';
import { BAC_SUBJECTS } from '../utils/constants';
import { chimePlayer } from '../utils/audio';
import { getT } from '../utils/i18n';

interface FocusModeModalProps {
  isOpen: boolean;
  isMinimized: boolean;
  activeBlock: TimeBlock | null;
  language: AppLanguage;
  onClose: () => void;
  onToggleMinimize: () => void;
  onCompleteBlock: (id: string) => void;
  onLogCustomSession?: (subject: string, minutes: number, title?: string) => void;
}

export const FocusModeModal: React.FC<FocusModeModalProps> = ({
  isOpen,
  isMinimized,
  activeBlock,
  language,
  onClose,
  onToggleMinimize,
  onCompleteBlock,
  onLogCustomSession,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  // Selected subject for free session
  const [customSubject, setCustomSubject] = useState<string>(BAC_SUBJECTS[0].name);
  const [customTitle, setCustomTitle] = useState<string>('');

  // Duration in seconds (default 25 min or calculate from block)
  const defaultSeconds = 25 * 60;
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(defaultSeconds);
  const [secondsRemaining, setSecondsRemaining] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(true);

  // Initialize from active block if available
  useEffect(() => {
    if (activeBlock) {
      const [sh, sm] = activeBlock.startTime.split(':').map(Number);
      const [eh, em] = activeBlock.endTime.split(':').map(Number);
      const diffMins = Math.max(10, eh * 60 + em - (sh * 60 + sm));
      const secs = diffMins * 60;
      setTotalDurationSeconds(secs);
      setSecondsRemaining(secs);
      setCustomSubject(activeBlock.subject);
      setCustomTitle(activeBlock.title);
    } else {
      setTotalDurationSeconds(25 * 60);
      setSecondsRemaining(25 * 60);
      setCustomTitle('');
    }
    setIsRunning(true);
  }, [activeBlock, isOpen]);

  // Set preset duration
  const setPresetMinutes = (mins: number) => {
    const secs = mins * 60;
    setTotalDurationSeconds(secs);
    setSecondsRemaining(secs);
    setIsRunning(true);
  };

  // Timer Tick
  useEffect(() => {
    if (!isOpen || !isRunning || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isRunning, secondsRemaining]);

  if (!isOpen) return null;

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const progress = totalDurationSeconds > 0 ? secondsRemaining / totalDurationSeconds : 0;
  const currentSubjectName = activeBlock ? activeBlock.subject : customSubject;
  const subjectInfo = BAC_SUBJECTS.find((s) => s.name === currentSubjectName);

  const handleCompleteAndLog = () => {
    if (activeBlock) {
      onCompleteBlock(activeBlock.id);
    } else if (onLogCustomSession) {
      const elapsedMins = Math.max(
        5,
        Math.round((totalDurationSeconds - secondsRemaining) / 60) || Math.round(totalDurationSeconds / 60)
      );
      onLogCustomSession(
        customSubject,
        elapsedMins,
        customTitle || (isAr ? `جلسة تركيز — ${customSubject}` : `Session Focus — ${customSubject}`)
      );
    }
    onClose();
  };

  // Floating Minimized PIP widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
        <div className="bg-slate-900/95 text-white border border-teal-500/50 shadow-2xl rounded-2xl p-3 flex items-center gap-3 backdrop-blur-md">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="20" cy="20" r="16" className="stroke-slate-800" strokeWidth="3" fill="none" />
              <circle
                cx="20"
                cy="20"
                r="16"
                className="stroke-teal-400 transition-all duration-300"
                strokeWidth="3"
                fill="none"
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - progress)}
              />
            </svg>
            <span className="absolute text-[10px] font-black">{mins}m</span>
          </div>

          <div className="min-w-0 pr-2">
            <div className="text-xs font-bold text-teal-300 truncate max-w-[120px]">
              {activeBlock?.title || 'Session Focus'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono font-bold">{timeFormatted}</div>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onToggleMinimize}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Agrandir"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full Screen Focus Mode
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-teal-900/30 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-lg bg-slate-900 border border-teal-500/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <Flame className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
              {t('fm_focus')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMinimize}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Réduire en widget flottant"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={t('cancel')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task Info */}
        <div className="space-y-3 max-w-md w-full">
          {activeBlock ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold">
                <span className={`w-2 h-2 rounded-full ${subjectInfo?.dotColor || 'bg-teal-400'}`} />
                <span>{activeBlock.subject}</span>
              </div>
              <h2 className="text-xl font-bold font-['Outfit'] text-white">
                {activeBlock.title}
              </h2>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-teal-300 font-bold uppercase tracking-wider">
                  {isAr ? 'اختر المادة الدراسية:' : 'Matière de la session :'}
                </span>
                <select
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="px-3 py-1 rounded-xl bg-slate-800 border border-teal-500/40 text-xs font-bold text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-400"
                >
                  {BAC_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name} className="bg-slate-900 text-white">
                      {s.name} (Coef {s.coefficient})
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Presets */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {[15, 25, 45, 60].map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPresetMinutes(pm)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      totalDurationSeconds === pm * 60
                        ? 'bg-teal-500 text-slate-950 shadow-xs font-black'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {pm}m
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Circular Countdown Progress */}
        <div className="relative w-56 h-56 flex items-center justify-center my-2">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="112"
              cy="112"
              r="98"
              className="stroke-slate-800"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="112"
              cy="112"
              r="98"
              className="stroke-teal-400 transition-all duration-1000 ease-linear shadow-lg"
              strokeWidth="8"
              fill="none"
              strokeDasharray={2 * Math.PI * 98}
              strokeDashoffset={2 * Math.PI * 98 * (1 - progress)}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="text-5xl font-black font-['Outfit'] tracking-tight font-mono text-white">
              {timeFormatted}
            </span>
            <span className="text-xs font-bold text-teal-400/80 uppercase mt-1">
              {t('fm_remaining')}
            </span>
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 border border-slate-700"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? t('pause') : t('resume')}</span>
          </button>

          <button
            onClick={handleCompleteAndLog}
            className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-transform active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isAr ? 'تسجيل كمنجزة' : 'Valider & Enregistrer'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          {t('fm_exit')}
        </button>
      </div>
    </div>
  );
};