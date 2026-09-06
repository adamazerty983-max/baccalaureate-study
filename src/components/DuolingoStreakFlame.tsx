import React, { useEffect, useRef, useState } from 'react';

interface DuolingoStreakFlameProps {
  size?: number;
  className?: string;
  isFrozen?: boolean;
}

const VIDEO_SRC = '/campfire-streak.webm';
const GIF_SRC = '/campfire-streak.gif';
const POSTER_SRC = '/campfire-streak-poster.png';

/**
 * Daily streak campfire — geometric motion-design loop.
 * Primary: transparent WebM. If the browser cannot decode/autoplay it within a
 * short grace period, we swap to the animated transparent GIF so the fire
 * always moves.
 */
export const DuolingoStreakFlame: React.FC<DuolingoStreakFlameProps> = ({
  size = 140,
  className = '',
  isFrozen = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [useGif, setUseGif] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const probe = document.createElement('video');
    return !probe.canPlayType('video/webm; codecs="vp9"');
  });

  useEffect(() => {
    if (useGif) return;
    const video = videoRef.current;
    if (!video) return;

    let settled = false;
    const fallback = () => {
      if (settled) return;
      settled = true;
      setUseGif(true);
    };
    const markPlaying = () => {
      settled = true;
    };

    video.addEventListener('playing', markPlaying);
    video.addEventListener('error', fallback);

    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(fallback);
    }

    // Autoplay-policy or codec problems: if nothing is moving soon, use the GIF.
    const timer = window.setTimeout(() => {
      if (video.paused || video.readyState < 3) fallback();
    }, 2000);

    return () => {
      window.clearTimeout(timer);
      video.removeEventListener('playing', markPlaying);
      video.removeEventListener('error', fallback);
    };
  }, [useGif]);

  const mediaStyle: React.CSSProperties = {
    transform: 'scale(1.18)',
    filter: isFrozen ? 'hue-rotate(185deg) saturate(1.2) brightness(1.1)' : undefined,
  };
  const mediaClass =
    'relative z-10 w-full h-full object-contain pointer-events-none drop-shadow-[0_8px_18px_rgba(249,115,22,0.35)] transition-all duration-500 group-hover:scale-105';

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <style>{`
        @keyframes campfire-glow-breathe {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12) translateY(-3px); }
        }
      `}</style>

      {/* Ambient glow that breathes with the fire */}
      <div
        className={`absolute rounded-full blur-2xl pointer-events-none transition-colors duration-700 ${isFrozen
            ? 'bg-cyan-400/25'
            : 'bg-gradient-to-t from-orange-500/40 via-amber-400/25 to-transparent'
          }`}
        style={{
          inset: size * 0.18,
          animation: 'campfire-glow-breathe 2.4s ease-in-out infinite',
        }}
      />

      {useGif ? (
        <img
          src={GIF_SRC}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={mediaClass}
          style={mediaStyle}
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          poster={POSTER_SRC}
          className={mediaClass}
          style={mediaStyle}
        >
          <source src={VIDEO_SRC} type='video/webm; codecs="vp9"' />
        </video>
      )}
    </div>
  );
};
