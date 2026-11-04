export function watchVideoPlayback(
  video: HTMLVideoElement,
  onFallback: () => void,
  timeoutMs = 2000,
): () => void {
  let fallbackTriggered = false;
  let timer: number | undefined;

  const fallback = () => {
    if (fallbackTriggered) return;
    fallbackTriggered = true;
    onFallback();
  };
  const markPlaying = () => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };

  video.addEventListener('playing', markPlaying);
  video.addEventListener('error', fallback);
  video.addEventListener('stalled', fallback);

  video.play().catch(fallback);

  timer = window.setTimeout(() => {
    if (video.paused || video.readyState < 3) fallback();
  }, timeoutMs);

  return () => {
    if (timer !== undefined) window.clearTimeout(timer);
    video.removeEventListener('playing', markPlaying);
    video.removeEventListener('error', fallback);
    video.removeEventListener('stalled', fallback);
  };
}
