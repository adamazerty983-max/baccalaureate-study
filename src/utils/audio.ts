/**
 * Ambient, Calm, and Harmonious Web Audio Synthesizer for Baccalaureate Study Hub.
 * Features organic, warm tones (Sine + Low-Pass Filter) with zero harsh frequencies.
 * Inspired by Calm, Apple iOS haptics, and Notion.
 */

export type SoundEffectType =
  | 'complete'
  | 'uncheck'
  | 'add'
  | 'delete'
  | 'praying'
  | 'rest'
  | 'repas'
  | 'sport'
  | 'walking'
  | 'sleeping'
  | 'click'
  | 'ui_tick'
  | 'streak'
  | 'tab_switch'
  | 'modal_open'
  | 'modal_close'
  | 'focus_start'
  | 'focus_pause'
  | 'focus_resume'
  | 'focus_finish'
  | 'grade_saved'
  | 'toast_success'
  | 'toast_warning'
  | 'toast_error'
  | 'error'
  | 'notification'
  | 'simulator_celebrate';

export interface ChimeOptions {
  /** Shared by a semantic sound and its related toast to guarantee one cue per action. */
  actionId?: string;
}

// Only these cues have a current sound design. Legacy API ids remain accepted but resolve silently.
const ACTIVE_SOUND_IDS = new Set([
  'ui_tick',
  'complete',
  'focus_start',
  'focus_finish',
  'notification',
  'toast_error',
  'grade_saved',
]);

export const createAudioActionId = (): string => `audio-action-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class CalmAudioEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 0.45; // Gentle default master volume
  private enabled: boolean = true;
  private lastPlayTime: Record<string, number> = {};
  private lastRichSoundTime: number = Number.NEGATIVE_INFINITY;
  private activeSounds: Array<{ endsAt: number; priority: number; gain: GainNode }> = [];
  private currentSoundGain: GainNode | null = null;
  private readonly maxPolyphony = 3;
  private readonly actionSounds = new Map<string, { priority: number; at: number; gain: GainNode }>();
  private isListenersInitialized: boolean = false;

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Helper: Plays a smooth, low-pass filtered resonant tone
   */
  private playTone(
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number = 0.2,
    type: OscillatorType = 'sine'
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Warm low-pass filter to eliminate harshness
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Leave headroom for overlapping chord voices, including at the 100% volume setting.
    const actualVolume = Math.min(0.15, peakGain) * this.volume;

    // Smooth ADSR Envelope (never target 0, always 0.0001 for Web Audio API safety)
    gain.gain.setValueAtTime(0.0001, startTime);
    // An 8 ms attack and a soft exponential release avoid clicks while keeping UI cues brief.
    gain.gain.linearRampToValueAtTime(actualVolume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // Smooth organic decay

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.currentSoundGain ?? ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  /**
   * Plays a distinct, calm, and soothing sound effect
   */
  public playChime(type: SoundEffectType | string = 'complete', options: ChimeOptions = {}): void {
    // Existing callers use "error"; map that semantic alias onto the approved error cue.
    if (type === 'error') type = 'toast_error';
    if (!ACTIVE_SOUND_IDS.has(type)) return;
    if (!this.enabled || this.volume <= 0) return;
    const isCriticalBackgroundSound = type === 'focus_finish' || type === 'notification';
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      // Background alarms/reminders may use an already unlocked context only.
      if (!isCriticalBackgroundSound || this.ctx?.state !== 'running') return;
    }
    const ctx = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      && this.ctx?.state === 'running'
      ? this.ctx
      : this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const priority = type === 'complete' || type === 'focus_finish' ? 4 : type === 'ui_tick' ? 1 : 3;
    const actionId = options.actionId;
    const priorActionSound = actionId ? this.actionSounds.get(actionId) : undefined;
    if (priorActionSound) {
      if (priorActionSound.priority >= priority) return;
      // A later, more meaningful cue replaces a lower-priority cue from the same action.
      priorActionSound.gain.gain.cancelScheduledValues(now);
      priorActionSound.gain.gain.setTargetAtTime(0.0001, now, 0.005);
      priorActionSound.gain.gain.setValueAtTime(0.0001, now + 0.02);
      this.activeSounds = this.activeSounds.filter((sound) => sound.gain !== priorActionSound.gain);
    }

    // Suppress an optional UI tick if a richer sound just played in the same cycle.
    if (type === 'ui_tick') {
      if (now - this.lastRichSoundTime < 0.08) {
        return;
      }
    } else if (!options.actionId && type.startsWith('toast_') && now - this.lastRichSoundTime < 0.15) {
      // A toast caused by a just-confirmed action should not add a second sound.
      return;
    } else {
      this.lastRichSoundTime = now;
    }

    const minInterval = type === 'ui_tick' ? 0.12 : 0.08;
    if (this.lastPlayTime[type] && now - this.lastPlayTime[type] < minInterval) {
      return;
    }
    this.activeSounds = this.activeSounds.filter((sound) => sound.endsAt > now);
    if (this.activeSounds.length >= this.maxPolyphony) {
      const lowestPriority = Math.min(...this.activeSounds.map((sound) => sound.priority));
      if (priority <= lowestPriority) return;
      const oldestLowest = this.activeSounds.find((sound) => sound.priority === lowestPriority);
      if (!oldestLowest) return;
      oldestLowest.gain.gain.cancelScheduledValues(now);
      oldestLowest.gain.gain.setTargetAtTime(0.0001, now, 0.005);
      oldestLowest.gain.gain.setValueAtTime(0.0001, now + 0.02);
      this.activeSounds = this.activeSounds.filter((sound) => sound !== oldestLowest);
    }
    const durationByType: Record<string, number> = {
      complete: 1, focus_finish: 1.3, notification: 0.6, toast_error: 0.3,
      focus_start: 0.2, grade_saved: 0.2, ui_tick: 0.06,
    };
    const soundGain = ctx.createGain();
    soundGain.gain.setValueAtTime(1, now);
    soundGain.connect(ctx.destination);
    this.activeSounds.push({ endsAt: now + (durationByType[type] ?? 0.4), priority, gain: soundGain });
    if (actionId) {
      this.actionSounds.set(actionId, { priority, at: now, gain: soundGain });
      for (const [key, value] of this.actionSounds) {
        if (now - value.at > 1) this.actionSounds.delete(key);
      }
    }
    this.currentSoundGain = soundGain;
    this.lastPlayTime[type] = now;

    switch (type) {
      // 1. Task Completed / Checked: Warm Celesta Chord (C5 -> E5 -> G5 -> C6)
      case 'complete':
      case 'streak': {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          this.playTone(freq, now + idx * 0.065, 0.75, 0.24, 'sine');
        });
        break;
      }

      // 2. Uncheck / Reactivate: Gentle subtle wooden marimba tap
      case 'uncheck': {
        this.playTone(440.0, now, 0.14, 0.2, 'triangle');
        this.playTone(330.0, now + 0.04, 0.16, 0.14, 'sine');
        break;
      }

      // 3. Add Item / Save Block: Soft tactile bubble pop
      case 'add': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);

        const vol = 0.2 * this.volume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.currentSoundGain ?? ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      // 4. Delete Item: Soft descending warm note
      case 'delete': {
        this.playTone(523.25, now, 0.14, 0.2, 'sine');
        this.playTone(392.0, now + 0.06, 0.22, 0.15, 'sine');
        break;
      }

      // 5. Prayer / Mindfulness: quiet C/G resonance, aligned with the shared tonal center.
      case 'praying': {
        this.playTone(261.63, now, 0.72, 0.18, 'sine');
        this.playTone(392.0, now + 0.02, 0.72, 0.11, 'sine');
        this.playTone(523.25, now + 0.04, 0.65, 0.06, 'sine');
        break;
      }

      // 6. Rest / Coffee Pause: Relaxing warm tea bell
      case 'rest': {
        this.playTone(440.0, now, 0.8, 0.18, 'sine');
        this.playTone(659.25, now + 0.09, 0.9, 0.16, 'sine');
        break;
      }

      // 7. Sport / Walking: Refreshing brisk tone
      case 'sport':
      case 'walking': {
        this.playTone(587.33, now, 0.35, 0.18, 'sine');
        this.playTone(880.0, now + 0.07, 0.5, 0.15, 'sine');
        break;
      }

      // 8. Meal: Cozy soft chime
      case 'repas': {
        this.playTone(493.88, now, 0.5, 0.16, 'sine');
        this.playTone(659.25, now + 0.08, 0.6, 0.14, 'sine');
        break;
      }

      // 9. Sleep: Ambient deep lullaby wave
      case 'sleeping': {
        this.playTone(220.0, now, 1.6, 0.2, 'sine');
        this.playTone(329.63, now + 0.1, 1.4, 0.12, 'sine');
        break;
      }

      // Optional UI tick: quiet filtered noise with a C5 sine transient.
      case 'ui_tick': {
        const bufferSize = Math.floor(ctx.sampleRate * 0.035);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2600, now);
        filter.Q.setValueAtTime(2.2, now);

        const gain = ctx.createGain();
        const clickVol = 0.1 * this.volume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(clickVol, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.currentSoundGain ?? ctx.destination);
        noise.start(now);

        // A C5 sub-transient keeps the optional tick aligned with the shared tonal center.
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);

        const subVol = 0.06 * this.volume;
        oscGain.gain.setValueAtTime(0.0001, now);
        oscGain.gain.linearRampToValueAtTime(subVol, now + 0.008);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

        osc.connect(oscGain);
        oscGain.connect(this.currentSoundGain ?? ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }

      // 11. Tab Switch: Ultra-light tactile iOS-style haptic tap
      case 'tab_switch': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.035);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(1.5, now);

        const vol = 0.08 * this.volume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.currentSoundGain ?? ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      // 12. Modal Open: Airy whoosh ascending sweep
      case 'modal_open': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(920, now + 0.14);

        const vol = 0.12 * this.volume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.currentSoundGain ?? ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      // 13. Modal Close: Soft dismissing sweep
      case 'modal_close': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(360, now + 0.12);

        const vol = 0.1 * this.volume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

        osc.connect(gain);
        gain.connect(this.currentSoundGain ?? ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }

      // Focus session finished.
      case 'focus_finish': {
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((freq, idx) => {
          this.playTone(freq, now + idx * 0.08, 1.05, 0.22, 'sine');
        });
        break;
      }

      // Focus state transitions: start, pause and resume.
      case 'focus_start': {
        this.playTone(523.25, now, 0.16, 0.12, 'sine');
        this.playTone(659.25, now + 0.055, 0.18, 0.1, 'sine');
        break;
      }
      case 'focus_pause': {
        this.playTone(659.25, now, 0.12, 0.1, 'sine');
        this.playTone(523.25, now + 0.045, 0.14, 0.08, 'sine');
        break;
      }
      case 'focus_resume': {
        this.playTone(600, now, 0.03, 0.06, 'triangle');
        break;
      }

      case 'grade_saved': {
        this.playTone(523.25, now, 0.18, 0.12, 'sine');
        this.playTone(659.25, now + 0.06, 0.18, 0.09, 'sine');
        break;
      }

      // 17. Toast Success: Bright, reassuring double-tone
      case 'toast_success': {
        this.playTone(659.25, now, 0.18, 0.14, 'sine');
        this.playTone(880.0, now + 0.08, 0.26, 0.16, 'sine');
        break;
      }

      // 18. Toast Warning: Advisory double pulse
      case 'toast_warning': {
        this.playTone(550.0, now, 0.08, 0.14, 'triangle');
        this.playTone(550.0, now + 0.08, 0.09, 0.14, 'triangle');
        break;
      }

      // Error: a soft descending G-to-E pair in the shared C-major tonal center.
      case 'toast_error':
      case 'error': {
        this.playTone(392.0, now, 0.22, 0.14, 'sine');
        this.playTone(329.63, now + 0.06, 0.2, 0.1, 'sine');
        break;
      }

      // 20. Simulator High Achievement (Mention Très Bien)
      case 'simulator_celebrate': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          this.playTone(freq, now + idx * 0.06, 0.8, 0.2, 'sine');
        });
        break;
      }

      // 21. Alert / Reminder: Soft harmonious 2-tone bell
      // 22. Scheduled Notification Reminder: Crystalline, warm dual chime
      case 'notification': {
        this.playTone(659.25, now, 0.35, 0.18, 'sine');
        this.playTone(783.99, now + 0.08, 0.5, 0.2, 'sine');
        break;
      }

      default: {
        this.playTone(523.25, now, 0.4, 0.15, 'sine');
        break;
      }
    }
    this.currentSoundGain = null;
  }

  /**
   * Unlocks the Web Audio context after a user gesture and ticks only on explicitly opted-in controls.
   */
  public initGlobalListeners(): void {
    if (this.isListenersInitialized || typeof window === 'undefined') return;
    this.isListenersInitialized = true;

    // 1. Resume AudioContext on very first user interaction so no audio is blocked by browser autoplay policies
    const unlockAudio = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      } else if (!this.ctx && this.enabled) {
        this.getContext();
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    // 2. Click sounds are opt-in per control; ordinary interaction stays silent.
    window.addEventListener(
      'click',
      (e: MouseEvent) => {
        if (!this.enabled || this.volume <= 0) return;
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const optedInControl = target.closest('[data-sound="ui_tick"]');
        if (optedInControl && !target.closest('[data-no-sound="true"]')) {
          this.playChime('ui_tick');
        }
      },
      { capture: false, passive: true }
    );
  }
}

export const chimePlayer = new CalmAudioEngine();

// Auto-activate global listeners in browser environment
if (typeof window !== 'undefined') {
  chimePlayer.initGlobalListeners();
}

