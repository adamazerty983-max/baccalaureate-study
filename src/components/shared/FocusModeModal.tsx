import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, CheckCircle, Flame, Sparkles, Minimize2, Maximize2, Clock, Calendar, AlertCircle, RotateCcw } from 'lucide-react';
import { AppLanguage, TimeBlock } from '../../types';
import { BAC_SUBJECTS } from '../../utils/constants';
import { chimePlayer } from '../../utils/audio';
import { getT } from '../../utils/i18n';
import {
  getBlockTimestamps,
  isBlockActiveNow,
  calculateFocusProgress,
  saveActiveFocusSession,
  loadActiveFocusSession,
  clearActiveFocusSession,
  saveBlockPauseState,
  loadBlockPauseState,
  clearBlockPauseState,
  StoredFocusSession,
  FocusPauseState,
} from '../../utils/focusSession';

interface FocusModeModalProps {
  isOpen: boolean;
  isMinimized: boolean;
  activeBlock: TimeBlock | null;
  language: AppLanguage;
  onClose: () => void;
  onToggleMinimize: () => void;
  onCompleteBlock: (id: string) => void;
  onLogCustomSession?: (subject: string, minutes: number, title?: string) => void;
  onStartCustomSession?: (block: TimeBlock) => void;
  onDiscardSession?: () => void;
  onNavigateToPlanning?: () => void;
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
  onStartCustomSession,
  onDiscardSession,
  onNavigateToPlanning,
}) => {
  const t = getT(language);
  const isAr = language === 'ar';

  // Live timestamp updated every 1s when modal or PIP is visible
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Form state for creating a free focus session when no task is active
  const [customSubject, setCustomSubject] = useState<string>(BAC_SUBJECTS[0].name);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [selectedPresetMinutes, setSelectedPresetMinutes] = useState<number>(25);

  // Stored custom session from localStorage
  const [savedSession, setSavedSession] = useState<StoredFocusSession | null>(() => loadActiveFocusSession());

  // Block pause state for scheduled blocks
  const [blockPause, setBlockPause] = useState<FocusPauseState | null>(() => {
    return activeBlock ? loadBlockPauseState(activeBlock.id) : null;
  });

  const hasFinishedRef = useRef(false);

  // Synchronize saved session and pause state whenever modal opens or activeBlock changes
  useEffect(() => {
    if (isOpen || isMinimized) {
      setNowMs(Date.now());
      setSavedSession(loadActiveFocusSession());
      if (activeBlock) {
        setBlockPause(loadBlockPauseState(activeBlock.id));
      }
    }
  }, [isOpen, isMinimized, activeBlock]);

  // Real-time clock interval (updates nowMs every 1000ms)
  useEffect(() => {
    if (!isOpen && !isMinimized) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isMinimized]);

  // Determine if there is a scheduled block currently active right now
  const isScheduledActive = Boolean(
    activeBlock && !activeBlock.id.startsWith('focus-') && isBlockActiveNow(activeBlock, new Date(nowMs))
  );

  // Determine if there is an active custom focus session
  const isCustomSessionActive = Boolean(
    savedSession && (nowMs < savedSession.endTimestamp + 60000 || savedSession.isPaused)
  );

  // Active block passed as custom block
  const isCustomBlockProp = Boolean(activeBlock && activeBlock.id.startsWith('focus-'));

  // True if there is an actual task in progress
  const hasActiveTask = isScheduledActive || isCustomSessionActive || isCustomBlockProp;

  // Derive duration, remaining time, elapsed time, and progress
  let totalDurationSeconds = 25 * 60;
  let remainingSeconds = 0;
  let elapsedSeconds = 0;
  let progress = 0;
  let isRunning = false;
  let taskSubject = customSubject;
  let taskTitle = '';

  if (isScheduledActive && activeBlock) {
    const { startMs, durationSeconds } = getBlockTimestamps(activeBlock, new Date(nowMs));
    totalDurationSeconds = durationSeconds;
    taskSubject = activeBlock.subject;
    taskTitle = activeBlock.title;

    const pauseState = blockPause || { isPaused: false, pausedAt: null, totalPausedMs: 0 };
    isRunning = !pauseState.isPaused;

    const res = calculateFocusProgress(startMs, totalDurationSeconds, {
      nowMs,
      isPaused: pauseState.isPaused,
      pausedAt: pauseState.pausedAt,
      totalPausedMs: pauseState.totalPausedMs,
    });

    remainingSeconds = res.remainingSeconds;
    elapsedSeconds = res.elapsedSeconds;
    progress = res.progress;
  } else if (savedSession) {
    totalDurationSeconds = savedSession.durationSeconds;
    taskSubject = savedSession.subject;
    taskTitle = savedSession.title;
    isRunning = !savedSession.isPaused;

    const res = calculateFocusProgress(savedSession.startTimestamp, totalDurationSeconds, {
      nowMs,
      isPaused: savedSession.isPaused,
      pausedAt: savedSession.pausedAt,
      totalPausedMs: savedSession.totalPausedMs,
    });

    remainingSeconds = res.remainingSeconds;
    elapsedSeconds = res.elapsedSeconds;
    progress = res.progress;
  } else if (isCustomBlockProp && activeBlock) {
    const [sh, sm] = (activeBlock.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (activeBlock.endTime || '00:25').split(':').map(Number);
    const diffMins = Math.max(1, (eh * 60 + em) - (sh * 60 + sm));
    totalDurationSeconds = diffMins * 60;
    taskSubject = activeBlock.subject;
    taskTitle = activeBlock.title;

    const startMs = activeBlock.createdAt ? new Date(activeBlock.createdAt).getTime() : nowMs;
    const res = calculateFocusProgress(startMs, totalDurationSeconds, { nowMs });
    remainingSeconds = res.remainingSeconds;
    elapsedSeconds = res.elapsedSeconds;
    progress = res.progress;
    isRunning = true;
  }

  // Play finish sound when remainingSeconds reaches 0
  useEffect(() => {
    if (hasActiveTask && remainingSeconds <= 0 && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      chimePlayer.playChime('focus_finish');
    } else if (remainingSeconds > 0) {
      hasFinishedRef.current = false;
    }
  }, [hasActiveTask, remainingSeconds]);

  // Handler: Start a free custom focus session when no task was scheduled
  const handleStartFreeSession = () => {
    const durationSecs = selectedPresetMinutes * 60;
    const start = Date.now();
    const end = start + durationSecs * 1000;
    const now = new Date(start);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const endTotal = now.getHours() * 60 + now.getMinutes() + selectedPresetMinutes;
    const eh = pad(Math.floor(endTotal / 60) % 24);
    const em = pad(endTotal % 60);

    const titleStr = customTitle.trim() || (isAr ? `جلسة تركيز — ${customSubject}` : `Session Focus — ${customSubject}`);

    const newSession: StoredFocusSession = {
      id: `focus-${start}`,
      title: titleStr,
      subject: customSubject,
      startTimestamp: start,
      durationSeconds: durationSecs,
      endTimestamp: end,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: 0,
    };

    saveActiveFocusSession(newSession);
    setSavedSession(newSession);

    if (onStartCustomSession) {
      onStartCustomSession({
        id: newSession.id,
        title: titleStr,
        subject: customSubject,
        type: 'study',
        startTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        endTime: `${eh}:${em}`,
        dayOfWeek: now.getDay(),
        dateKey: now.toISOString().slice(0, 10),
        isCompleted: false,
        createdAt: now.toISOString(),
      });
    }

    chimePlayer.playChime('timer_tick');
  };

  // Handler: Pause / Resume timer toggle
  const handleTogglePause = () => {
    chimePlayer.playChime('timer_tick');
    const currentTime = Date.now();

    if (savedSession) {
      let updated: StoredFocusSession;
      if (savedSession.isPaused) {
        // Resume
        const pausedDuration = savedSession.pausedAt ? currentTime - savedSession.pausedAt : 0;
        updated = {
          ...savedSession,
          isPaused: false,
          pausedAt: null,
          totalPausedMs: savedSession.totalPausedMs + pausedDuration,
        };
      } else {
        // Pause
        updated = {
          ...savedSession,
          isPaused: true,
          pausedAt: currentTime,
        };
      }
      saveActiveFocusSession(updated);
      setSavedSession(updated);
    } else if (activeBlock) {
      const currentPause = blockPause || { isPaused: false, pausedAt: null, totalPausedMs: 0 };
      let updated: FocusPauseState;
      if (currentPause.isPaused) {
        const pausedDuration = currentPause.pausedAt ? currentTime - currentPause.pausedAt : 0;
        updated = {
          isPaused: false,
          pausedAt: null,
          totalPausedMs: currentPause.totalPausedMs + pausedDuration,
        };
      } else {
        updated = {
          isPaused: true,
          pausedAt: currentTime,
          totalPausedMs: currentPause.totalPausedMs,
        };
      }
      saveBlockPauseState(activeBlock.id, updated);
      setBlockPause(updated);
    }
  };

  // Handler: Complete and Log session
  const handleCompleteAndLog = () => {
    chimePlayer.playChime('complete');

    if (activeBlock && !activeBlock.id.startsWith('focus-')) {
      onCompleteBlock(activeBlock.id);
      clearBlockPauseState(activeBlock.id);
      setBlockPause(null);
    } else {
      const loggedMins = Math.max(5, Math.round(elapsedSeconds / 60) || Math.round(totalDurationSeconds / 60));
      if (onLogCustomSession) {
        onLogCustomSession(taskSubject, loggedMins, taskTitle);
      }
      clearActiveFocusSession();
      setSavedSession(null);
      if (onDiscardSession) onDiscardSession();
    }

    onClose();
  };

  // Handler: Discard / Abandon active session
  const handleDiscardCurrentSession = () => {
    chimePlayer.playChime('delete');
    if (activeBlock && !activeBlock.id.startsWith('focus-')) {
      clearBlockPauseState(activeBlock.id);
      setBlockPause(null);
    } else {
      clearActiveFocusSession();
      setSavedSession(null);
      if (onDiscardSession) onDiscardSession();
    }
  };

  if (!isOpen && !isMinimized) return null;

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeFormatted = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const subjectInfo = BAC_SUBJECTS.find((s) => s.name === taskSubject);

  // ─────────────────────────────────────────────────────────────
  // 1. FLOATING MINIMIZED PIP WIDGET
  // ─────────────────────────────────────────────────────────────
  if (isMinimized) {
    if (!hasActiveTask) {
      return (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div className="bg-slate-900/95 text-white border border-teal-500/50 shadow-2xl rounded-2xl p-3 flex items-center gap-3 backdrop-blur-md">
            <span className="text-xs font-bold text-slate-300">
              {isAr ? 'لا توجد حصة جارية' : 'Aucune séance active'}
            </span>
            <button
              onClick={onToggleMinimize}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-teal-400 hover:text-white cursor-pointer"
              title="Agrandir"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

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
              {taskTitle || taskSubject || 'Focus'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono font-bold">
              {remainingSeconds <= 0 ? (isAr ? 'انتهت الجلسة' : 'Terminé') : timeFormatted}
            </div>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
            {remainingSeconds > 0 && (
              <button
                onClick={handleTogglePause}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title={isRunning ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'استئناف' : 'Reprendre')}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={onToggleMinimize}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              title="Agrandir"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. FULL MODAL VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-teal-900/30 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-lg bg-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
        {/* Top Controls Bar */}
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
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Réduire en widget flottant"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                chimePlayer.playChime('modal_close');
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={t('cancel')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── CASE A: NO ACTIVE TASK ─── */}
        {!hasActiveTask ? (
          <div className="py-2 px-2 flex flex-col items-center max-w-md w-full space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400 shadow-inner">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                {isAr ? 'لا توجد حصة جارية حالياً' : 'Aucune séance en cours'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                {isAr
                  ? 'جدولك الدراسي لا يحتوي على حصة مجدولة في هذا التوقيت. يمكنك بدء جلسة تركيز حرة الآن، أو الانتقال للمخطط.'
                  : "Votre emploi du temps ne contient aucune séance prévue à cette heure. Vous pouvez lancer une session libre ci-dessous ou consulter votre planning."}
              </p>
            </div>

            {/* Quick Free Session Creator Card */}
            <div className="w-full p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                  {isAr ? 'بدء جلسة تركيز حرة' : 'Démarrer une session libre'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedPresetMinutes} min
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300 font-medium block">
                  {isAr ? 'المادة الدراسية:' : 'Matière :'}
                </label>
                <select
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-teal-300 focus:outline-none focus:border-teal-400"
                >
                  {BAC_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name} className="bg-slate-900 text-white">
                      {s.name} (Coef {s.coefficient})
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300 font-medium block">
                  {isAr ? 'المدة المحددة:' : 'Durée de concentration :'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 25, 45, 60].map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setSelectedPresetMinutes(pm)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedPresetMinutes === pm
                          ? 'bg-teal-500 text-slate-950 font-black shadow-md shadow-teal-500/20 scale-[1.02]'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {pm}m
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartFreeSession}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isAr ? 'بدء جلسة التركيز الآن' : 'Démarrer la session de focus'}</span>
              </button>
            </div>

            {onNavigateToPlanning && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToPlanning();
                }}
                className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer pt-1"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{isAr ? 'الانتقال إلى جدول الحصص' : "Consulter l'emploi du temps"}</span>
              </button>
            )}
          </div>
        ) : (
          /* ─── CASE B: ACTIVE TASK IN PROGRESS ─── */
          <>
            {/* Task Info Header */}
            <div className="space-y-2 max-w-md w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold">
                <span className={`w-2 h-2 rounded-full ${subjectInfo?.dotColor || 'bg-teal-400'}`} />
                <span>{taskSubject}</span>
              </div>
              <h2 className="text-xl font-bold font-['Outfit'] text-white">
                {taskTitle || taskSubject}
              </h2>
              {isScheduledActive && activeBlock && (
                <div className="text-[11px] font-mono text-slate-400">
                  {activeBlock.startTime} — {activeBlock.endTime}
                </div>
              )}
            </div>

            {/* Circular Countdown Progress Ring */}
            <div className="relative w-56 h-56 flex items-center justify-center my-1">
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
                  className={`transition-all duration-1000 ease-linear shadow-lg ${
                    remainingSeconds <= 0 ? 'stroke-emerald-400' : isRunning ? 'stroke-teal-400' : 'stroke-amber-400'
                  }`}
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
                  {remainingSeconds <= 0
                    ? (isAr ? 'انتهت الجلسة 🎉' : 'Session terminée 🎉')
                    : isRunning
                    ? t('fm_remaining')
                    : (isAr ? 'موقفة مؤقتاً' : 'En pause')}
                </span>
              </div>
            </div>

            {/* Interactive Controls */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {remainingSeconds > 0 && (
                <button
                  onClick={handleTogglePause}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 border border-slate-700 cursor-pointer"
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isRunning ? t('pause') : t('resume')}</span>
                </button>
              )}

              <button
                onClick={handleCompleteAndLog}
                className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-transform active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isAr ? 'تسجيل كمنجزة' : 'Valider & Enregistrer'}</span>
              </button>

              <button
                onClick={handleDiscardCurrentSession}
                className="px-3 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer border border-transparent hover:border-rose-800/40"
                title={isAr ? 'إلغاء الجلسة' : 'Abandonner la session'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Exit Button */}
        <button
          onClick={() => {
            chimePlayer.playChime('modal_close');
            onClose();
          }}
          className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {t('fm_exit')}
        </button>
      </div>
    </div>
  );
};