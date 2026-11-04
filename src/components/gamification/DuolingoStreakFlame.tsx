import React, { useEffect, useRef, useState } from 'react';
import { watchVideoPlayback } from './videoPlayback';

interface DuolingoStreakFlameProps {
  size?: number;
  className?: string;
  isFrozen?: boolean;
}

const VIDEO_SRC = `${import.meta.env.BASE_URL}campfire-streak.webm`;
const GIF_SRC = `${import.meta.env.BASE_URL}campfire-streak.gif`;
const POSTER_SRC = `${import.meta.env.BASE_URL}campfire-streak-poster.png`;

/**
 * Original Baccalaureate Study Hub Campfire Animation
 * Powered by high-definition motion loop (WebM VP9 + transparent GIF fallback).
 * When pending (isFrozen = true), turns mystical blue via hue rotation.
 * When completed (isFrozen = false), burns in original golden-amber campfire flame.
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

    return watchVideoPlayback(video, () => setUseGif(true));
  }, [useGif]);

  const mediaStyle: React.CSSProperties = {
    transform: 'scale(1.15)',
    filter: isFrozen
      ? 'hue-rotate(185deg) saturate(1.35) brightness(1.08) drop-shadow(0 8px 20px rgba(14, 165, 233, 0.4))'
      : 'drop-shadow(0 8px 20px rgba(249, 115, 22, 0.4))',
    transition: 'filter 0.6s ease-in-out, transform 0.3s ease',
  };

  const mediaClass =
    'relative z-10 w-full h-full object-contain pointer-events-none transition-all duration-500 group-hover:scale-105';

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes campfire-glow-breathe {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.12) translateY(-2px); }
        }
      `}</style>

      {/* Ambient glow that breathes with the campfire */}
      <div
        className={`absolute rounded-full blur-2xl pointer-events-none transition-all duration-700 ${
          isFrozen
            ? 'bg-sky-400/25 shadow-[0_0_35px_rgba(14,165,233,0.35)]'
            : 'bg-gradient-to-t from-orange-500/40 via-amber-400/25 to-transparent shadow-[0_0_35px_rgba(245,158,11,0.35)]'
        }`}
        style={{
          inset: size * 0.15,
          animation: 'campfire-glow-breathe 2.4s ease-in-out infinite',
        }}
      />

      {useGif ? (
        <img
          src={GIF_SRC}
          alt="Campfire Streak"
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
