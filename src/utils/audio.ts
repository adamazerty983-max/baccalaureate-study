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
  | 'pause'
  | 'repas'
  | 'sport'
  | 'sleeping'
  | 'click'
  | 'drag'
  | 'camera_snap'
  | 'alert'
  | 'streak'
  | 'tab_switch'
  | 'modal_open'
  | 'modal_close'
  | 'theme_toggle'
  | 'timer_tick'
  | 'focus_finish'
  | 'toast_success'
  | 'toast_warning'
  | 'toast_error'
  | 'notification'
  | 'simulator_celebrate';

class CalmAudioEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 0.45; // Gentle default master volume
  private enabled: boolean = true;
  private lastPlayTime: Record<string, number> = {};
  private lastRichSoundTime: number = 0;
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

    const actualVolume = peakGain * this.volume;

    // Smooth ADSR Envelope (never target 0, always 0.0001 for Web Audio API safety)
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(actualVolume, startTime + 0.02); // Gentle soft attack
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // Smooth organic decay

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  /**
   * Plays a distinct, calm, and soothing sound effect
   */
  public playChime(type: SoundEffectType | string = 'complete'): void {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Suppress generic click if a rich, meaningful chime just played in the same cycle
    if (type === 'click') {
      if (now - this.lastRichSoundTime < 0.08) {
        return;
      }
    } else {
      this.lastRichSoundTime = now;
    }

    // Throttle micro sounds (prevent auditory fatigue on rapid clicking)
    const minInterval = type === 'tab_switch' || type === 'click' ? 0.04 : 0.03;
    if (this.lastPlayTime[type] && now - this.lastPlayTime[type] < minInterval) {
      return;
    }
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

        const vol = 0.26 * this.volume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
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

      // 5. Prayer / Mindfulness: Tibetan Zen Bowl Resonance (432Hz harmonic)
      case 'praying': {
        this.playTone(432.0, now, 2.2, 0.25, 'sine');
        this.playTone(216.0, now, 2.2, 0.15, 'sine');
        this.playTone(864.0, now + 0.02, 1.8, 0.08, 'sine');
        break;
      }

      // 6. Rest / Coffee Pause: Relaxing warm tea bell
      case 'rest':
      case 'pause': {
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

      // 10. Click / Drag / Snap: Luxury Haptic Tactile Tap (Crisp Bandpass Noise + Micro Sine Drop)
      case 'click':
      case 'drag':
      case 'camera_snap': {
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
        const clickVol = 0.28 * this.volume;
        gain.gain.setValueAtTime(clickVol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);

        // Gentle sub-transient for warm tactile body (1100Hz -> 380Hz)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.03);

        const subVol = 0.16 * this.volume;
        oscGain.gain.setValueAtTime(subVol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
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
        gain.connect(ctx.destination);
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
        gain.gain.linearRampToValueAtTime(vol, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
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
        gain.gain.linearRampToValueAtTime(vol, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }

      // 14. Theme Toggle: Dual frequency slide
      case 'theme_toggle': {
        this.playTone(523.25, now, 0.09, 0.12, 'sine');
        this.playTone(783.99, now + 0.05, 0.12, 0.14, 'sine');
        break;
      }

      // 15. Focus Session Finished: Rich celebratory chime
      case 'focus_finish': {
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((freq, idx) => {
          this.playTone(freq, now + idx * 0.1, 1.4, 0.22, 'sine');
        });
        break;
      }

      // 16. Timer Tick: Subtle tick for focus controls
      case 'timer_tick': {
        this.playTone(600, now, 0.03, 0.06, 'triangle');
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

      // 19. Toast Error: Gentle cushioned descending tone
      case 'toast_error': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.2);

        const vol = 0.14 * this.volume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.23);
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
      case 'alert': {
        this.playTone(523.25, now, 0.45, 0.18, 'sine');
        this.playTone(698.46, now + 0.12, 0.6, 0.16, 'sine');
        break;
      }

      // 22. Scheduled Notification Reminder: Crystalline, warm dual chime
      case 'notification': {
        this.playTone(659.25, now, 0.35, 0.18, 'sine');
        this.playTone(880.0, now + 0.08, 0.5, 0.2, 'sine');
        break;
      }

      default: {
        this.playTone(523.25, now, 0.4, 0.15, 'sine');
        break;
      }
    }
  }

  /**
   * Initializes global user-gesture auto-unlock and delegates pleasant tactile click feedback
   * to all interactive buttons, toggles, filter pills, and navigation elements across the whole platform.
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

    // 2. Global event delegation for all interactive elements
    window.addEventListener(
      'click',
      (e: MouseEvent) => {
        if (!this.enabled || this.volume <= 0) return;
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Skip if explicitly marked as silent
        if (target.closest('[data-no-sound="true"]')) return;

        // Detect if clicked element is an interactive button, tab, checkbox, radio, dropdown or clickable item
        const isInteractive = target.closest(
          'button, a[href], summary, [role="button"], [role="tab"], input[type="checkbox"], input[type="radio"], select, .cursor-pointer, .interactive-click'
        );

        if (isInteractive) {
          // Play tactile click (automatically suppressed if a specific richer chime ran in this interaction)
          this.playChime('click');
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

