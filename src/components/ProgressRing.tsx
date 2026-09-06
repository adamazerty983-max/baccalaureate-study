import React from 'react';

interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number; // diameter in pixels (e.g. 56, 72, 96)
  strokeWidth?: number;
  strokeColor?: string;
  trackColor?: string;
  gradientId?: string;
  gradientColors?: { from: string; to: string };
  centerContent?: React.ReactNode;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 64,
  strokeWidth = 6,
  strokeColor = '#0D9488',
  trackColor = 'currentColor',
  gradientId,
  gradientColors,
  centerContent,
  className = '',
}) => {
  const normalizedProgress = Math.min(100, Math.max(0, isNaN(progress) ? 0 : progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 origin-center"
      >
        {gradientColors && gradientId && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors.from} />
              <stop offset="100%" stopColor={gradientColors.to} />
            </linearGradient>
          </defs>
        )}

        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={trackColor}
          fill="none"
          className="opacity-15 dark:opacity-20 transition-colors"
        />

        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={gradientId ? `url(#${gradientId})` : strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
      </svg>

      {/* Centered Content */}
      {centerContent && (
        <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
          {centerContent}
        </div>
      )}
    </div>
  );
};
