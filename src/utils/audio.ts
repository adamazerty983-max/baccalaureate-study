/**
 * Low-fatigue sound engine for StudyOS.
 * The small Web Audio synth is always available as a fallback; licensed assets are optional.
 */

export type SoundId =
  | 'ui_tick'
  | 'item_completed'
  | 'item_added'
  | 'item_undone'
  | 'item_deleted'
  | 'grade_saved'
  | 'focus_start'
  | 'focus_pause'
  | 'focus_resume'
  | 'focus_end_alarm'
  | 'reminder'
  | 'error'
  | 'warning'
  | 'milestone';

/** Legacy values remain accepted so existing components keep their public API. */
export type SoundEffectType = SoundId | string;

export interface ChimeOptions {
  /** Shared by a semantic sound and its toast to guarantee one cue per action. */
  actionId?: string;
}

type SoundPriority = 1 | 2 | 3 | 4;
type SoundBufferMap = Partial<Record<SoundId, AudioBuffer>>;
export type SoundAssetPaths = Partial<Record<SoundId, string>>;

/**
 * Intentionally empty until reviewed CC0/public-domain samples are supplied.
 * Keeping this separate from the JS bundle lets approved files live in public/sounds/.
 */
export const SOUND_ASSET_PATHS: SoundAssetPaths = {};

/** Fetch and decode each configured file once. Failures are isolated per asset. */
export class SoundBufferLoader {
  private readonly buffers: SoundBufferMap = {};
  private loadPromise: Promise<void> | null = null;

  public constructor(
    private readonly context: Pick<AudioContext, 'decodeAudioData'>,
    private readonly paths: SoundAssetPaths,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  public loadAll(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = Promise.all(Object.entries(this.paths).map(async ([id, url]) => {
      if (!url) return;
      try {
        const response = await this.fetcher(url);
        if (!response.ok) throw new Error(`Sound request failed (${response.status})`);
        const audioBuffer = await this.context.decodeAudioData(await response.arrayBuffer());
        this.buffers[id as SoundId] = audioBuffer;
      } catch {
        // The engine deliberately falls back to its built-in synth for this ID.
      }
    })).then(() => undefined);
    return this.loadPromise;
  }

  public get(id: SoundId): AudioBuffer | undefined {
    return this.buffers[id];
  }
}

const LEGACY_SOUND_IDS: Record<string, SoundId | null> = {
  complete: 'item_completed',
  add: 'item_added',
  uncheck: 'item_undone',
  delete: 'item_deleted',
  focus_finish: 'focus_end_alarm',
  notification: 'reminder',
  toast_error: 'error',
  toast_warning: 'warning',
  error: 'error',
  streak: 'milestone',
  simulator_celebrate: 'milestone',
  // Passive, generic and modal sounds are intentionally silent.
  click: null,
  tab_switch: null,
  modal_open: null,
  modal_close: null,
  toast_success: null,
  praying: null,
  rest: null,
  repas: null,
  sport: null,
  walking: null,
  sleeping: null,
  alert: null,
};

const ACTIVE_SOUND_IDS = new Set<SoundId>([
  'ui_tick', 'item_completed', 'item_added', 'item_undone', 'item_deleted', 'grade_saved',
  'focus_start', 'focus_pause', 'focus_resume', 'focus_end_alarm', 'reminder', 'error', 'warning', 'milestone',
]);

const PRIORITY: Record<SoundId, SoundPriority> = {
  ui_tick: 1,
  focus_start: 2,
  focus_pause: 2,
  focus_resume: 2,
  reminder: 2,
  item_added: 3,
  item_undone: 3,
  item_deleted: 3,
  error: 3,
  warning: 3,
  item_completed: 4,
  grade_saved: 4,
  focus_end_alarm: 4,
  milestone: 4,
};

const DURATION: Record<SoundId, number> = {
  ui_tick: 0.06,
  item_completed: 0.62,
  item_added: 0.18,
  item_undone: 0.2,
  item_deleted: 0.2,
  grade_saved: 0.28,
  focus_start: 0.2,
  focus_pause: 0.16,
  focus_resume: 0.16,
  focus_end_alarm: 0.9,
  reminder: 0.42,
  error: 0.25,
  warning: 0.24,
  milestone: 0.7,
};

export const createAudioActionId = (): string => `audio-action-${Date.now()}-${Math.random().toString(36).slice(2)}`;

type ActiveVoice = { endsAt: number; priority: SoundPriority; gain: GainNode };
type ActionVoice = { priority: SoundPriority; at: number; gain: GainNode };

export class CalmAudioEngine {
  private ctx: AudioContext | null = null;
  private volume = 0.45;
  private enabled = true;
  private lastPlayTime: Partial<Record<SoundId, number>> = {};
  private lastRichSoundTime = Number.NEGATIVE_INFINITY;
  private activeSounds: ActiveVoice[] = [];
  private currentSoundGain: GainNode | null = null;
  private readonly maxPolyphony = 3;
  private readonly actionSounds = new Map<string, ActionVoice>();
  private isListenersInitialized = false;
  private soundLoader: SoundBufferLoader | null = null;

  public setVolume(vol: number): void { this.volume = Math.max(0, Math.min(1, vol)); }
  public setEnabled(enabled: boolean): void { this.enabled = enabled; }
  public isSoundEnabled(): boolean { return this.enabled; }

  private getContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0 || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private getSoundLoader(ctx: AudioContext): SoundBufferLoader {
    if (!this.soundLoader) {
      const base = import.meta.env.BASE_URL || '/';
      const paths = Object.fromEntries(Object.entries(SOUND_ASSET_PATHS).map(([id, path]) => [
        id,
        path ? new URL(`${base}${path.replace(/^\/+/, '')}`, window.location.origin).toString() : '',
      ])) as SoundAssetPaths;
      this.soundLoader = new SoundBufferLoader(ctx, paths);
    }
    return this.soundLoader;
  }

  /** Call only from a real user gesture; loading never delays a sound or startup. */
  private warmSoundAssets(ctx: AudioContext): void {
    void this.getSoundLoader(ctx).loadAll();
  }

  private playTone(freq: number, startTime: number, duration: number, peakGain = 0.12, type: OscillatorType = 'sine'): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    const actualVolume = Math.min(0.15, peakGain) * this.volume;
    gain.gain.setValueAtTime(0.0001, startTime);
    // Short 8 ms attack and exponential release avoid clicks without a long tail.
    gain.gain.linearRampToValueAtTime(actualVolume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.currentSoundGain ?? ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private resolveId(type: string): SoundId | null {
    if (type in LEGACY_SOUND_IDS) return LEGACY_SOUND_IDS[type];
    return ACTIVE_SOUND_IDS.has(type as SoundId) ? type as SoundId : null;
  }

  public playChime(type: SoundEffectType | string = 'item_completed', options: ChimeOptions = {}): void {
    const id = this.resolveId(type);
    if (!id || !this.enabled || this.volume <= 0) return;
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const isBackgroundException = id === 'focus_end_alarm' || id === 'reminder';
    if (hidden && (!isBackgroundException || this.ctx?.state !== 'running')) return;
    const ctx = hidden && this.ctx?.state === 'running' ? this.ctx : this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const priority = PRIORITY[id];
    const actionId = options.actionId;
    const priorActionSound = actionId ? this.actionSounds.get(actionId) : undefined;
    if (priorActionSound) {
      if (priorActionSound.priority >= priority) return;
      priorActionSound.gain.gain.cancelScheduledValues(now);
      priorActionSound.gain.gain.setTargetAtTime(0.0001, now, 0.005);
      priorActionSound.gain.gain.setValueAtTime(0.0001, now + 0.02);
      this.activeSounds = this.activeSounds.filter((sound) => sound.gain !== priorActionSound.gain);
    }

    // The short fallback covers legacy toasts that do not pass the originating action token.
    if (id === 'ui_tick' && now - this.lastRichSoundTime < 0.08) return;
    if ((id === 'error' || id === 'warning') && !actionId && now - this.lastRichSoundTime < 0.15) return;
    if (id !== 'ui_tick') this.lastRichSoundTime = now;

    const minInterval = id === 'ui_tick' ? 0.12 : 0.08;
    if (this.lastPlayTime[id] !== undefined && now - this.lastPlayTime[id]! < minInterval) return;
    this.activeSounds = this.activeSounds.filter((sound) => sound.endsAt > now);
    if (this.activeSounds.length >= this.maxPolyphony) {
      const lowestPriority = Math.min(...this.activeSounds.map((sound) => sound.priority)) as SoundPriority;
      if (priority <= lowestPriority) return;
      const oldestLowest = this.activeSounds.find((sound) => sound.priority === lowestPriority);
      if (!oldestLowest) return;
      oldestLowest.gain.gain.cancelScheduledValues(now);
      oldestLowest.gain.gain.setTargetAtTime(0.0001, now, 0.005);
      oldestLowest.gain.gain.setValueAtTime(0.0001, now + 0.02);
      this.activeSounds = this.activeSounds.filter((sound) => sound !== oldestLowest);
    }

    const voiceGain = ctx.createGain();
    const buffer = this.soundLoader?.get(id);
    const estimatedDuration = buffer?.duration ?? DURATION[id];
    voiceGain.gain.setValueAtTime(buffer ? this.volume : 1, now);
    voiceGain.connect(ctx.destination);
    this.activeSounds.push({ endsAt: now + estimatedDuration, priority, gain: voiceGain });
    if (actionId) {
      this.actionSounds.set(actionId, { priority, at: now, gain: voiceGain });
      for (const [key, value] of this.actionSounds) if (now - value.at > 1) this.actionSounds.delete(key);
    }
    this.lastPlayTime[id] = now;
    this.currentSoundGain = voiceGain;

    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(voiceGain);
      source.start(now);
      this.currentSoundGain = null;
      return;
    }

    this.playSynth(id, ctx, now);
    this.currentSoundGain = null;
  }

  private playSynth(id: SoundId, ctx: AudioContext, now: number): void {
    switch (id) {
      case 'ui_tick': {
        const length = Math.floor(ctx.sampleRate * 0.035);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < length; index++) data[index] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.setValueAtTime(2.2, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.035 * this.volume, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        noise.connect(filter); filter.connect(gain); gain.connect(this.currentSoundGain ?? ctx.destination); noise.start(now);
        this.playTone(523.25, now, 0.03, 0.035, 'sine');
        break;
      }
      case 'item_completed':
      case 'milestone': {
        const notes = id === 'milestone' ? [523.25, 659.25, 783.99] : [523.25, 659.25, 783.99];
        notes.forEach((frequency, index) => this.playTone(frequency, now + index * 0.055, id === 'milestone' ? 0.48 : 0.38, 0.13));
        break;
      }
      case 'item_added':
        this.playTone(523.25, now, 0.12, 0.09);
        this.playTone(659.25, now + 0.045, 0.13, 0.08);
        break;
      case 'item_undone':
        this.playTone(659.25, now, 0.11, 0.075);
        this.playTone(523.25, now + 0.045, 0.12, 0.07);
        break;
      case 'item_deleted':
        this.playTone(523.25, now, 0.12, 0.075);
        this.playTone(392, now + 0.045, 0.14, 0.065);
        break;
      case 'grade_saved':
        this.playTone(523.25, now, 0.17, 0.12);
        this.playTone(659.25, now + 0.055, 0.18, 0.1);
        break;
      case 'focus_start':
        this.playTone(523.25, now, 0.13, 0.09);
        this.playTone(659.25, now + 0.05, 0.14, 0.08);
        break;
      case 'focus_pause':
        this.playTone(659.25, now, 0.11, 0.07);
        this.playTone(523.25, now + 0.045, 0.12, 0.065);
        break;
      case 'focus_resume':
        this.playTone(523.25, now, 0.1, 0.07, 'triangle');
        break;
      case 'focus_end_alarm':
        [523.25, 659.25, 783.99].forEach((frequency, index) => this.playTone(frequency, now + index * 0.075, 0.45, 0.14));
        break;
      case 'reminder':
        this.playTone(659.25, now, 0.22, 0.085);
        this.playTone(783.99, now + 0.07, 0.25, 0.09);
        break;
      case 'error':
        this.playTone(392, now, 0.14, 0.075);
        this.playTone(329.63, now + 0.05, 0.15, 0.07);
        break;
      case 'warning':
        this.playTone(440, now, 0.11, 0.065, 'triangle');
        this.playTone(392, now + 0.05, 0.12, 0.06, 'triangle');
        break;
    }
  }

  /** Resume audio and lazily fetch/decode licensed files after a user gesture. */
  public initGlobalListeners(): void {
    if (this.isListenersInitialized || typeof window === 'undefined') return;
    this.isListenersInitialized = true;
    const unlockAudio = () => {
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume().catch(() => {});
        this.warmSoundAssets(this.ctx);
      }
      else if (!this.ctx && this.enabled) {
        const ctx = this.getContext();
        if (ctx) this.warmSoundAssets(ctx);
      } else if (this.ctx) this.warmSoundAssets(this.ctx);
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    window.addEventListener('click', (event: MouseEvent) => {
      if (!this.enabled || this.volume <= 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-sound="ui_tick"]') && !target.closest('[data-no-sound="true"]')) {
        this.playChime('ui_tick');
      }
    }, { passive: true });
  }
}

export const chimePlayer = new CalmAudioEngine();

if (typeof window !== 'undefined') chimePlayer.initGlobalListeners();
