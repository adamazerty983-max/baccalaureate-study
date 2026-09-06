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
  | 'streak';

class CalmAudioEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 0.45; // Gentle default master volume
  private enabled: boolean = true;

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
    filter.frequency.setValueAtTime(1800, startTime);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    const actualVolume = peakGain * this.volume;

    // Smooth ADSR Envelope
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(actualVolume, startTime + 0.025); // Gentle soft attack
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // Smooth organic decay

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Plays a distinct, calm, and soothing sound effect
   */
  public playChime(type: SoundEffectType | string = 'complete'): void {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (type) {
      // 1. Task Completed / Checked: Warm Celesta Chord (C5 -> E5 -> G5)
      case 'complete':
      case 'streak': {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
          this.playTone(freq, now + idx * 0.07, 0.65, 0.22, 'sine');
        });
        break;
      }

      // 2. Uncheck / Reactivate: Gentle subtle wooden tap
      case 'uncheck': {
        this.playTone(392.0, now, 0.18, 0.14, 'triangle');
        break;
      }

      // 3. Add Item / Save Block: Soft tactile bubble pop
      case 'add': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);

        const vol = 0.18 * this.volume;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      // 4. Delete Item: Soft descending warm note
      case 'delete': {
        this.playTone(523.25, now, 0.15, 0.12, 'sine');
        this.playTone(440.0, now + 0.06, 0.22, 0.1, 'sine');
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

      // 10. Click / Drag / Snap: Micro tactile click (subtle haptic feedback)
      case 'click':
      case 'drag':
      case 'camera_snap': {
        this.playTone(480.0, now, 0.04, 0.08, 'triangle');
        break;
      }

      // 11. Alert / Reminder: Soft harmonious 2-tone bell
      case 'alert': {
        this.playTone(523.25, now, 0.45, 0.18, 'sine');
        this.playTone(698.46, now + 0.12, 0.6, 0.16, 'sine');
        break;
      }

      default: {
        this.playTone(523.25, now, 0.4, 0.15, 'sine');
        break;
      }
    }
  }
}

export const chimePlayer = new CalmAudioEngine();
