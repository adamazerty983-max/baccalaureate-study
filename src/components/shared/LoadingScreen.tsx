import React from 'react';
import { TwinOrbit } from './TwinOrbit';
import { GraduationCap } from 'lucide-react';

interface LoadingScreenProps {
  messageFr?: string;
  messageAr?: string;
  isArabic?: boolean;
  fadeOut?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  messageFr = 'Chargement de votre espace de travail...',
  messageAr = 'جاري تحضير فضاء العمل والمذاكرة...',
  isArabic = false,
  fadeOut = false,
}) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0C121E] text-slate-100 select-none overflow-hidden transition-opacity duration-500 ease-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle Ambient Radial Glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, #0d9488 0%, #4f46e5 50%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm">
        {/* Brand Icon with Glow */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-teal-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0C121E]/95 rounded-[22px] flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-teal-400" />
            </div>
          </div>
          {/* Subtle Outer Glow */}
          <div className="absolute -inset-1 rounded-3xl bg-teal-500/20 blur-sm -z-10" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-black font-['Outfit'] tracking-tight text-white mb-1.5">
          MyBac Study Hub
        </h1>
        <p className="text-xs text-slate-400 font-medium mb-8">
          {isArabic ? messageAr : messageFr}
        </p>

        {/* TwinOrbit Animation Component */}
        <div className="flex items-center justify-center h-12 mb-6">
          <div className="text-teal-400 drop-shadow-[0_0_12px_rgba(20,184,166,0.6)]">
            <TwinOrbit className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Progress Shimmer Track */}
        <div className="w-48 h-1 bg-slate-800/80 rounded-full overflow-hidden relative">
          <div
            className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-teal-400 to-transparent rounded-full"
            style={{
              animation: 'loading-ui-shimmer 1.6s ease-in-out infinite',
            }}
          />
        </div>

        {/* Inline style for the shimmer bar */}
        <style>{`
          @keyframes loading-ui-shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoadingScreen;
