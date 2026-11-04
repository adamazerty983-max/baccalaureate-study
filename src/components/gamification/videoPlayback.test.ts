import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchVideoPlayback } from './videoPlayback';

(globalThis as any).window = globalThis;

class FakeVideo extends EventTarget {
  paused = false;
  readyState = 4;

  play() {
    return Promise.resolve();
  }
}

describe('watchVideoPlayback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to the GIF when a video errors after playback has started', () => {
    vi.useFakeTimers();
    const video = new FakeVideo();
    const onFallback = vi.fn();
    const stopWatching = watchVideoPlayback(video as HTMLVideoElement, onFallback);

    video.dispatchEvent(new Event('playing'));
    video.dispatchEvent(new Event('error'));

    expect(onFallback).toHaveBeenCalledOnce();
    stopWatching();
  });

  it('falls back when playback stalls after starting', () => {
    vi.useFakeTimers();
    const video = new FakeVideo();
    const onFallback = vi.fn();
    const stopWatching = watchVideoPlayback(video as HTMLVideoElement, onFallback);

    video.dispatchEvent(new Event('playing'));
    video.dispatchEvent(new Event('stalled'));

    expect(onFallback).toHaveBeenCalledOnce();
    stopWatching();
  });

  it('does not fall back while the video is playing normally', () => {
    vi.useFakeTimers();
    const video = new FakeVideo();
    const onFallback = vi.fn();
    const stopWatching = watchVideoPlayback(video as HTMLVideoElement, onFallback);

    video.dispatchEvent(new Event('playing'));
    vi.advanceTimersByTime(2500);

    expect(onFallback).not.toHaveBeenCalled();
    stopWatching();
  });
});
