import React, { useEffect, useRef, useState, useId } from 'react';
import { watchVideoPlayback } from './videoPlayback';

interface DuolingoStreakFlameProps {
  size?: number;
  className?: string;
  isFrozen?: boolean;
}

type FlameVisualMode = 'video' | 'gif' | 'poster' | 'svg';

const BASE = import.meta.env.BASE_URL || '/';
const cleanBase = BASE.endsWith('/') ? BASE : `${BASE}/`;

const VIDEO_SRC = `${cleanBase}campfire-streak.webm`;
const GIF_SRC = `${cleanBase}campfire-streak.gif`;
const POSTER_SRC = `${cleanBase}campfire-streak-poster.png`;

// Alternative relative paths for fallback attempts across various hosting environments
const ALT_GIF_SRCS = [
  GIF_SRC,
  './campfire-streak.gif',
  '/campfire-streak.gif',
];

const ALT_POSTER_SRCS = [
  POSTER_SRC,
  './campfire-streak-poster.png',
  '/campfire-streak-poster.png',
];

/**
 * Procedural Vector SVG Campfire Flame
 * 100% self-contained, zero network requests, zero bundle weight, renders instantly.
 * Features crossed wooden logs, layered glowing flame tongues, and floating ember sparks.
 */
export const CampfireVectorFlame: React.FC<{ size: number; isFrozen?: boolean }> = ({
  size,
  isFrozen = false,
}) => {
  const flameId = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="relative z-10 w-full h-full object-contain pointer-events-none select-none transition-transform duration-500 group-hover:scale-105"
      aria-hidden="true"
    >
      <defs>
        {/* Outer flame gradient */}
        <linearGradient id={`outer-flame-${flameId}`} x1="70" y1="20" x2="70" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4500" />
          <stop offset="45%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#E63900" />
        </linearGradient>

        {/* Mid-tier flame gradient */}
        <linearGradient id={`mid-flame-${flameId}`} x1="70" y1="38" x2="70" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFAA00" />
          <stop offset="60%" stopColor="#FF8800" />
          <stop offset="100%" stopColor="#F55A00" />
        </linearGradient>

        {/* Core flame gradient */}
        <linearGradient id={`core-flame-${flameId}`} x1="70" y1="55" x2="70" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF8DB" />
          <stop offset="40%" stopColor="#FFE066" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>

        {/* Left wooden log gradient */}
        <linearGradient id={`log-left-${flameId}`} x1="28" y1="96" x2="112" y2="116" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6E3A1C" />
          <stop offset="50%" stopColor="#4A2511" />
          <stop offset="100%" stopColor="#2E160A" />
        </linearGradient>

        {/* Right wooden log gradient */}
        <linearGradient id={`log-right-${flameId}`} x1="112" y1="96" x2="28" y2="116" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7D4220" />
          <stop offset="50%" stopColor="#542B14" />
          <stop offset="100%" stopColor="#331A0C" />
        </linearGradient>

        {/* Ember coal glow */}
        <radialGradient id={`coal-glow-${flameId}`} cx="70" cy="104" r="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#CC2E00" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#661400" stopOpacity="0" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes flame-sway-${flameId} {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.02, 0.98) rotate(-1.5deg); }
          50% { transform: scale(0.99, 1.02) rotate(1deg); }
          75% { transform: scale(1.03, 0.97) rotate(0.5deg); }
        }
        @keyframes inner-flicker-${flameId} {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.95; }
          33% { transform: scale(0.97, 1.04) translateY(-1.5px); opacity: 1; }
          66% { transform: scale(1.03, 0.96) translateY(1px); opacity: 0.9; }
        }
        @keyframes ember-rise-1-${flameId} {
          0% { transform: translate(0, 0) scale(1); opacity: 0.9; }
          50% { transform: translate(-3px, -12px) scale(0.8); opacity: 0.7; }
          100% { transform: translate(-6px, -24px) scale(0.3); opacity: 0; }
        }
        @keyframes ember-rise-2-${flameId} {
          0% { transform: translate(0, 0) scale(1); opacity: 0.8; }
          50% { transform: translate(4px, -14px) scale(0.85); opacity: 0.6; }
          100% { transform: translate(7px, -28px) scale(0.2); opacity: 0; }
        }
      `}</style>

      {/* Coal bed ambient glow */}
      <circle cx="70" cy="105" r="26" fill={`url(#coal-glow-${flameId})`} />

      {/* Back Wooden Log (Angled left-to-right) */}
      <g transform="rotate(-18 70 106)">
        <rect x="26" y="100" width="88" height="13" rx="6.5" fill={`url(#log-left-${flameId})`} />
        {/* Wood grain highlight */}
        <line x1="38" y1="104" x2="100" y2="104" stroke="#8A4A24" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <ellipse cx="32" cy="106.5" rx="3" ry="5.5" fill="#3D1C0B" />
        <ellipse cx="32" cy="106.5" rx="1.8" ry="3.5" fill="#5A2E16" />
      </g>

      {/* Front Wooden Log (Angled right-to-left) */}
      <g transform="rotate(18 70 106)">
        <rect x="26" y="100" width="88" height="13" rx="6.5" fill={`url(#log-right-${flameId})`} />
        {/* Wood grain highlight */}
        <line x1="38" y1="104" x2="100" y2="104" stroke="#9E5429" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="108" cy="106.5" rx="3" ry="5.5" fill="#3D1C0B" />
        <ellipse cx="108" cy="106.5" rx="1.8" ry="3.5" fill="#5A2E16" />
      </g>

      {/* Burning coal embers under logs */}
      <circle cx="58" cy="106" r="3.5" fill="#FF5500" />
      <circle cx="70" cy="107" r="4.2" fill="#FFAA00" />
      <circle cx="82" cy="106" r="3.2" fill="#FF4400" />

      {/* Outer Flame Tongue */}
      <g style={{ transformOrigin: '70px 105px', animation: `flame-sway-${flameId} 1.9s ease-in-out infinite` }}>
        <path
          d="M70 20C75 38 88 52 93 68C98 84 92 102 70 105C48 102 42 84 47 68C52 52 65 38 70 20Z"
          fill={`url(#outer-flame-${flameId})`}
        />
        {/* Left flame curl */}
        <path
          d="M50 72C42 78 40 88 47 96C51 90 55 86 58 80C56 77 53 74 50 72Z"
          fill="#FF5500"
          opacity="0.9"
        />
        {/* Right flame curl */}
        <path
          d="M90 70C98 76 100 86 94 94C90 89 86 85 83 79C85 76 88 73 90 70Z"
          fill="#FF6600"
          opacity="0.9"
        />
      </g>

      {/* Mid-tier Radiant Flame Tongue */}
      <g style={{ transformOrigin: '70px 105px', animation: `inner-flicker-${flameId} 1.4s ease-in-out infinite` }}>
        <path
          d="M70 38C74 50 83 62 85 74C88 87 82 99 70 102C58 99 52 87 55 74C57 62 66 50 70 38Z"
          fill={`url(#mid-flame-${flameId})`}
        />
      </g>

      {/* White-Hot Core Flame */}
      <g style={{ transformOrigin: '70px 105px', animation: `flame-sway-${flameId} 1.1s ease-in-out infinite reverse` }}>
        <path
          d="M70 56C72.5 64 78 72 78 81C78 90 74.5 97 70 98C65.5 97 62 90 62 81C62 72 67.5 64 70 56Z"
          fill={`url(#core-flame-${flameId})`}
        />
      </g>

      {/* Floating Ember Sparks */}
      <circle
        cx="62"
        cy="52"
        r="2"
        fill="#FFE066"
        style={{ animation: `ember-rise-1-${flameId} 2.2s ease-out infinite` }}
      />
      <circle
        cx="78"
        cy="46"
        r="2.2"
        fill="#FF9900"
        style={{ animation: `ember-rise-2-${flameId} 1.8s ease-out infinite 0.6s` }}
      />
      <circle
        cx="68"
        cy="34"
        r="1.6"
        fill="#FFD24D"
        style={{ animation: `ember-rise-1-${flameId} 2.6s ease-out infinite 1.2s` }}
      />
    </svg>
  );
};

/**
 * Original Baccalaureate Study Hub Campfire Animation
 * Multi-tier resilient playback architecture:
 * 1. High-definition WebM VP9 motion loop.
 * 2. Animated transparent GIF fallback (`campfire-streak.gif`).
 * 3. Precached high-res poster fallback (`campfire-streak-poster.png`).
 * 4. Procedural Vector SVG campfire flame (guaranteed 100% reliability, zero broken images).
 *
 * When completed (isFrozen = false), burns in original golden-amber campfire flame.
 * When pending (isFrozen = true), shifts to mystical ice-blue campfire via hue-rotation.
 */
export const DuolingoStreakFlame: React.FC<DuolingoStreakFlameProps> = ({
  size = 140,
  className = '',
  isFrozen = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Visual mode state machine with resilient fallback: video -> gif -> poster -> svg
  const [visualMode, setVisualMode] = useState<FlameVisualMode>(() => {
    if (typeof document === 'undefined') return 'svg';
    const probe = document.createElement('video');
    const canPlayWebm = Boolean(probe.canPlayType && probe.canPlayType('video/webm; codecs="vp9"'));
    return canPlayWebm ? 'video' : 'gif';
  });

  const [gifIndex, setGifIndex] = useState(0);
  const [posterIndex, setPosterIndex] = useState(0);

  // Monitor video playback and fallback to GIF if video fails or is unsupported
  useEffect(() => {
    if (visualMode !== 'video') return;
    const video = videoRef.current;
    if (!video) return;

    return watchVideoPlayback(video, () => setVisualMode('gif'), 3500);
  }, [visualMode]);

  // Handle GIF load failure: try next alternative path or switch to poster
  const handleGifError = () => {
    if (gifIndex + 1 < ALT_GIF_SRCS.length) {
      setGifIndex((prev) => prev + 1);
    } else {
      setVisualMode('poster');
    }
  };

  // Handle poster load failure: try next alternative path or switch to SVG
  const handlePosterError = () => {
    if (posterIndex + 1 < ALT_POSTER_SRCS.length) {
      setPosterIndex((prev) => prev + 1);
    } else {
      setVisualMode('svg');
    }
  };

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

      {visualMode === 'video' && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          poster={ALT_POSTER_SRCS[posterIndex] || POSTER_SRC}
          className={mediaClass}
          style={mediaStyle}
          onError={() => setVisualMode('gif')}
        >
          <source src={VIDEO_SRC} type='video/webm; codecs="vp9"' />
          <source src="./campfire-streak.webm" type='video/webm; codecs="vp9"' />
          <source src="/campfire-streak.webm" type='video/webm; codecs="vp9"' />
        </video>
      )}

      {visualMode === 'gif' && (
        <img
          src={ALT_GIF_SRCS[gifIndex] || GIF_SRC}
          alt="Campfire Streak"
          aria-hidden="true"
          draggable={false}
          className={mediaClass}
          style={mediaStyle}
          onError={handleGifError}
        />
      )}

      {visualMode === 'poster' && (
        <img
          src={ALT_POSTER_SRCS[posterIndex] || POSTER_SRC}
          alt="Campfire Streak"
          aria-hidden="true"
          draggable={false}
          className={mediaClass}
          style={mediaStyle}
          onError={handlePosterError}
        />
      )}

      {visualMode === 'svg' && (
        <div className={mediaClass} style={mediaStyle}>
          <CampfireVectorFlame size={size} isFrozen={isFrozen} />
        </div>
      )}
    </div>
  );
};
