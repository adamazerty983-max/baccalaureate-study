import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalmAudioEngine } from './audio';

class FakeParam {
  value = 0;
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
  cancelScheduledValues() {}
  setTargetAtTime(value: number) { this.value = value; }
}

class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  Q = new FakeParam();
  type = 'sine';
  buffer: unknown;
  connect() {}
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  currentTime = 1;
  sampleRate = 1000;
  state = 'running';
  destination = new FakeNode();
  sources: FakeNode[] = [];
  createOscillator() { const n = new FakeNode(); this.sources.push(n); return n; }
  createGain() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(1000) }; }
  createBufferSource() { const n = new FakeNode(); this.sources.push(n); return n; }
  resume() { return Promise.resolve(); }
}

const setup = (visibility: DocumentVisibilityState = 'visible') => {
  const context = new FakeAudioContext();
  const listeners: Record<string, (event: unknown) => void> = {};
  vi.stubGlobal('document', { visibilityState: visibility });
  vi.stubGlobal('window', {
    AudioContext: class extends FakeAudioContext { constructor() { super(); return context as never; } },
    addEventListener: (name: string, cb: (event: unknown) => void) => { listeners[name] = cb; },
  });
  const engine = new CalmAudioEngine();
  engine.initGlobalListeners();
  return { engine, context, listeners };
};

afterEach(() => vi.unstubAllGlobals());

describe('CalmAudioEngine sound policy', () => {
  it('evicts the oldest lowest-priority voice for a higher-priority reward', () => {
    const { engine, context } = setup();
    engine.playChime('ui_tick');
    engine.playChime('focus_start');
    engine.playChime('grade_saved');
    const gains = (engine as unknown as { activeSounds: Array<{ gain: FakeNode }> }).activeSounds;
    const evicted = gains[0].gain.gain;
    engine.playChime('complete');
    expect(evicted.value).toBe(0.0001);
    expect(context.sources.length).toBeGreaterThan(0);
  });

  it('drops equal or lower priority at the polyphony cap and enforces per-id minimum gap', () => {
    const { engine, context } = setup();
    engine.playChime('complete');
    engine.playChime('focus_finish');
    engine.playChime('grade_saved');
    const count = context.sources.length;
    engine.playChime('focus_start');
    expect(context.sources.length).toBe(count);
    const { engine: fresh, context: freshContext } = setup();
    fresh.playChime('ui_tick');
    const once = freshContext.sources.length;
    freshContext.currentTime += 0.01;
    fresh.playChime('ui_tick');
    expect(freshContext.sources.length).toBe(once);
  });

  it('mutes hidden tabs except unlocked focus-end and reminder sounds', () => {
    const { engine, context } = setup('visible');
    engine.playChime('ui_tick'); // Create and unlock the context before hiding the tab.
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    context.sources = [];
    engine.playChime('complete');
    expect(context.sources).toHaveLength(0);
    engine.playChime('focus_finish');
    expect(context.sources.length).toBeGreaterThan(0);
    const beforeReminder = context.sources.length;
    engine.playChime('notification');
    expect(context.sources.length).toBeGreaterThan(beforeReminder);
  });

  it('suppresses a toast tied to an action that already played a stronger cue', () => {
    const { engine, context } = setup();
    engine.playChime('complete', { actionId: 'task-1' });
    const count = context.sources.length;
    engine.playChime('toast_error', { actionId: 'task-1' });
    expect(context.sources.length).toBe(count);
    engine.playChime('toast_error', { actionId: 'other-action' });
    expect(context.sources.length).toBeGreaterThan(count);
  });

  it('replaces a lower-priority sound from the same action with its confirmation', () => {
    const { engine } = setup();
    engine.playChime('ui_tick', { actionId: 'save-1' });
    const voices = (engine as unknown as { activeSounds: Array<{ gain: FakeNode; priority: number }> }).activeSounds;
    const tickVoice = voices[0];
    engine.playChime('toast_error', { actionId: 'save-1' });
    expect(tickVoice.gain.gain.value).toBe(0.0001);
    expect((engine as unknown as { activeSounds: Array<{ priority: number }> }).activeSounds.some((voice) => voice.priority === 3)).toBe(true);
  });

  it('allows a standalone toast, but suppresses one immediately after a semantic cue', () => {
    const { engine, context } = setup();
    context.currentTime = 0.01; // First sound in a freshly unlocked context must not be mistaken for a duplicate.
    engine.playChime('toast_error');
    const standaloneToastSources = context.sources.length;
    expect(standaloneToastSources).toBeGreaterThan(0);
    context.currentTime += 0.2;
    engine.playChime('complete');
    const afterSemanticCue = context.sources.length;
    context.currentTime += 0.01;
    engine.playChime('toast_error');
    expect(context.sources.length).toBe(afterSemanticCue);
  });

  it('maps the legacy error id to the approved toast_error cue', () => {
    const { engine, context } = setup();
    engine.playChime('error');
    expect(context.sources.length).toBeGreaterThan(0);
  });

  it('does not construct a new AudioContext for hidden-tab alarm exceptions', () => {
    const { engine, context } = setup('hidden');
    engine.playChime('focus_finish');
    engine.playChime('notification');
    expect(context.sources).toHaveLength(0);
    expect((engine as unknown as { ctx: FakeAudioContext | null }).ctx).toBeNull();
  });

  it('plays ui_tick only for opted-in controls', () => {
    const { listeners, context } = setup();
    const target = { closest: (selector: string) => selector === '[data-sound="ui_tick"]' ? null : null };
    listeners.click({ target });
    expect(context.sources).toHaveLength(0);
    target.closest = (selector: string) => selector === '[data-sound="ui_tick"]' ? {} as HTMLElement : null;
    listeners.click({ target });
    expect(context.sources.length).toBeGreaterThan(0);
  });

  it('keeps all non-approved legacy sounds silent by default', () => {
    const { engine, context } = setup();
    ['click', 'add', 'delete', 'uncheck', 'praying', 'rest', 'sport', 'repas', 'sleeping',
      'streak', 'tab_switch', 'modal_open', 'modal_close', 'focus_pause', 'focus_resume',
      'toast_success', 'toast_warning', 'simulator_celebrate']
      .forEach((id) => engine.playChime(id));
    expect(context.sources).toHaveLength(0);
  });
});
