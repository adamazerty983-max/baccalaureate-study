import React, { useEffect, useRef } from 'react';

interface StreakFlameCanvasProps {
  streak: number;
  isBroken?: boolean;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxLife: number;
  life: number;
  swirlPhase: number;
  swirlSpeed: number;
  swirlRadius: number;
  type: 'ember' | 'spark' | 'glint';
  sparkleAngle?: number;
}

export const StreakFlameCanvas: React.FC<StreakFlameCanvasProps> = ({ streak, isBroken = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let running = true;

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const W = 76;
    const H = 106;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const intensity = Math.min(Math.max(streak, 1) / 30, 1);
    const emberCount = isBroken ? 12 : 18 + Math.floor(intensity * 16);

    const embers: EmberParticle[] = [];

    const spawnEmber = (): EmberParticle => {
      const spreadX = 14 + intensity * 8;
      const typeRand = Math.random();
      const type: 'ember' | 'spark' | 'glint' =
        typeRand > 0.88 ? 'glint' : typeRand > 0.65 ? 'spark' : 'ember';

      return {
        x: W / 2 + (Math.random() - 0.5) * spreadX,
        y: H - 22 - Math.random() * 28,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.7 + Math.random() * 1.3) * (0.8 + intensity * 0.4),
        size:
          type === 'glint'
            ? 3.5 + Math.random() * 2.5
            : type === 'spark'
            ? 1.5 + Math.random() * 1.5
            : 2.2 + Math.random() * 2.5 + intensity * 1.2,
        life: 0,
        maxLife: 35 + Math.random() * 45,
        swirlPhase: Math.random() * Math.PI * 2,
        swirlSpeed: 2.5 + Math.random() * 3.5,
        swirlRadius: 1.2 + Math.random() * 2.5,
        type,
        sparkleAngle: Math.random() * Math.PI,
      };
    };

    for (let i = 0; i < emberCount; i++) {
      const p = spawnEmber();
      p.life = Math.floor(Math.random() * p.maxLife); // Stagger initial life
      embers.push(p);
    }

    let time = 0;

    const render = () => {
      if (!running) return;
      time += 0.038;

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const baseY = H - 12;

      // Dynamic breathing physics (squash & stretch)
      const breathe = Math.sin(time * 3.2) * 0.035;
      const microTremor = Math.sin(time * 7.5) * 0.015;
      const scaleX = 1 - (breathe + microTremor) * 0.5;
      const scaleY = 1 + (breathe + microTremor);

      // --- Ambient Radiant Floor / Aura Glow ---
      const auraRadius = 38 + intensity * 12 + Math.sin(time * 2.8) * 4;
      const auraGradient = ctx.createRadialGradient(cx, baseY - 28, 4, cx, baseY - 28, auraRadius);

      if (isBroken) {
        auraGradient.addColorStop(0, 'rgba(0, 210, 255, 0.28)');
        auraGradient.addColorStop(0.5, 'rgba(0, 130, 255, 0.12)');
        auraGradient.addColorStop(1, 'rgba(0, 60, 255, 0)');
      } else {
        auraGradient.addColorStop(0, `rgba(255, 120, 0, ${0.32 + intensity * 0.12})`);
        auraGradient.addColorStop(0.45, `rgba(255, 60, 0, ${0.16 + intensity * 0.08})`);
        auraGradient.addColorStop(0.85, 'rgba(255, 30, 0, 0.04)');
        auraGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      }

      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(cx, baseY - 28, auraRadius, 0, Math.PI * 2);
      ctx.fill();

      // --- Base Ground Heat Ring (Duolingo 3D Pedestal Shadow) ---
      const baseShadow = ctx.createRadialGradient(cx, baseY + 2, 2, cx, baseY + 2, 20);
      if (isBroken) {
        baseShadow.addColorStop(0, 'rgba(0, 160, 240, 0.35)');
        baseShadow.addColorStop(1, 'rgba(0, 100, 200, 0)');
      } else {
        baseShadow.addColorStop(0, 'rgba(230, 60, 0, 0.35)');
        baseShadow.addColorStop(1, 'rgba(200, 20, 0, 0)');
      }
      ctx.fillStyle = baseShadow;
      ctx.beginPath();
      ctx.ellipse(cx, baseY + 1, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Helper function to draw dynamic Duolingo-style flame vector
      const drawFlameLayer = (
        width: number,
        height: number,
        swayAmount: number,
        lickDir: number, // -1 for left lick, 1 for right lick
        fillGradient: CanvasGradient,
        strokeGradient?: CanvasGradient
      ) => {
        ctx.save();
        ctx.translate(cx, baseY);
        ctx.scale(scaleX, scaleY);

        const swayTip = Math.sin(time * 3.5 + swayAmount) * (5 + intensity * 4);
        const swayLick = Math.cos(time * 4.2 + swayAmount) * (4 + intensity * 3);
        const lickLift = Math.sin(time * 3.8 + swayAmount) * 3;

        const hw = width / 2;
        const tipY = -height;
        const tipX = swayTip;

        // Side lick tongue (Duolingo signature playful flick)
        const lickX = lickDir * (hw * 1.18 + Math.abs(swayLick));
        const lickY = -height * 0.48 + lickLift;

        ctx.beginPath();
        // Start bottom center
        ctx.moveTo(0, 0);

        if (lickDir > 0) {
          // Normal curve on left
          ctx.bezierCurveTo(
            -hw * 1.25, 0,
            -hw * 1.15, tipY * 0.38,
            -hw * 0.45 + swayTip * 0.3, tipY * 0.72
          );
          // Left curve to tip
          ctx.quadraticCurveTo(-hw * 0.15 + swayTip * 0.7, tipY * 0.92, tipX, tipY);

          // Tip down towards right lick
          ctx.quadraticCurveTo(
            hw * 0.35 + swayTip * 0.5, tipY * 0.85,
            hw * 0.55 + swayLick * 0.4, tipY * 0.62
          );
          // Lick peak
          ctx.quadraticCurveTo(hw * 0.75 + swayLick * 0.6, tipY * 0.54, lickX, lickY);
          // Lick undercut returning to right hip
          ctx.bezierCurveTo(
            hw * 0.85, lickY + 12,
            hw * 1.2, tipY * 0.18,
            hw * 1.15, 0
          );
          // Bottom close
          ctx.quadraticCurveTo(hw * 0.5, 3, 0, 0);
        } else {
          // Left lick variant
          // Lick on left
          ctx.bezierCurveTo(
            -hw * 1.15, 0,
            -hw * 1.2, tipY * 0.18,
            lickX, lickY + 12
          );
          ctx.quadraticCurveTo(-hw * 0.75 + swayLick * 0.6, tipY * 0.54, lickX, lickY);
          ctx.quadraticCurveTo(
            -hw * 0.55 + swayLick * 0.4, tipY * 0.62,
            -hw * 0.35 + swayTip * 0.5, tipY * 0.85
          );
          // Tip
          ctx.quadraticCurveTo(-hw * 0.15 + swayTip * 0.7, tipY * 0.92, tipX, tipY);
          // Right normal curve
          ctx.quadraticCurveTo(
            hw * 0.45 + swayTip * 0.3, tipY * 0.72,
            hw * 1.15, tipY * 0.38
          );
          ctx.bezierCurveTo(
            hw * 1.25, 0,
            hw * 0.5, 3,
            0, 0
          );
        }

        ctx.closePath();
        ctx.fillStyle = fillGradient;
        ctx.fill();

        if (strokeGradient) {
          ctx.strokeStyle = strokeGradient;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.restore();
      };

      // ==========================================
      // 1. LAYER 1: OUTER SHAPE (Vibrant Red-Orange / Cyan-Ice)
      // ==========================================
      const outerGrad = ctx.createLinearGradient(cx, baseY - 82, cx, baseY);
      if (isBroken) {
        outerGrad.addColorStop(0, '#00C8FF');
        outerGrad.addColorStop(0.35, '#008CFF');
        outerGrad.addColorStop(0.75, '#005CE6');
        outerGrad.addColorStop(1, '#003DAA');
      } else {
        outerGrad.addColorStop(0, '#FF2E00');
        outerGrad.addColorStop(0.28, '#FF4D00');
        outerGrad.addColorStop(0.65, '#FF6B00');
        outerGrad.addColorStop(1, '#FF8A00');
      }
      drawFlameLayer(46 + intensity * 4, 82 + intensity * 6, 0, 1, outerGrad);

      // ==========================================
      // 2. LAYER 2: MID FLAME (Deep Amber / Electric Blue)
      // ==========================================
      const midGrad = ctx.createLinearGradient(cx, baseY - 68, cx, baseY);
      if (isBroken) {
        midGrad.addColorStop(0, '#4DE0FF');
        midGrad.addColorStop(0.4, '#00BFFF');
        midGrad.addColorStop(1, '#007FFF');
      } else {
        midGrad.addColorStop(0, '#FF7700');
        midGrad.addColorStop(0.3, '#FF9400');
        midGrad.addColorStop(0.75, '#FFAE00');
        midGrad.addColorStop(1, '#FFC800');
      }
      drawFlameLayer(35 + intensity * 3, 66 + intensity * 5, 0.45, 1, midGrad);

      // ==========================================
      // 3. LAYER 3: INNER CORE (Bright Gold-Yellow / Frost Cyan)
      // ==========================================
      const innerGrad = ctx.createLinearGradient(cx, baseY - 50, cx, baseY);
      if (isBroken) {
        innerGrad.addColorStop(0, '#B3F2FF');
        innerGrad.addColorStop(0.4, '#66E0FF');
        innerGrad.addColorStop(1, '#1AD1FF');
      } else {
        innerGrad.addColorStop(0, '#FFAE00');
        innerGrad.addColorStop(0.35, '#FFCC00');
        innerGrad.addColorStop(0.75, '#FFE000');
        innerGrad.addColorStop(1, '#FFF04D');
      }
      drawFlameLayer(24 + intensity * 2, 48 + intensity * 4, 0.9, -1, innerGrad);

      // ==========================================
      // 4. LAYER 4: HOT NUCLEUS (Glowing Ivory Heart)
      // ==========================================
      const coreGrad = ctx.createLinearGradient(cx, baseY - 32, cx, baseY);
      if (isBroken) {
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.5, '#E0F8FF');
        coreGrad.addColorStop(1, '#80E5FF');
      } else {
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.4, '#FFFFE0');
        coreGrad.addColorStop(0.8, '#FFEA75');
        coreGrad.addColorStop(1, '#FFCC00');
      }
      drawFlameLayer(14 + intensity * 1.5, 28 + intensity * 2, 1.3, 1, coreGrad);

      // ==========================================
      // 5. 3D GLOSSY SPECULAR HIGHLIGHT (Duolingo Sticker Shine)
      // ==========================================
      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(scaleX, scaleY);
      ctx.beginPath();
      // Curved glossy crescent on the top-left shoulder of the flame
      ctx.ellipse(-12, -44, 4.5, 14, -Math.PI / 7, 0, Math.PI * 2);
      const specGrad = ctx.createLinearGradient(-16, -58, -8, -30);
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      specGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.35)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = specGrad;
      ctx.fill();

      // Tiny glossy circular specular dot
      ctx.beginPath();
      ctx.arc(-8, -60, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      ctx.restore();

      // ==========================================
      // 6. RISING EMBERS, SPARKS & TWINKLE PARTICLES
      // ==========================================
      for (let i = 0; i < embers.length; i++) {
        const p = embers[i];
        p.life++;
        p.y += p.vy;
        p.swirlPhase += p.swirlSpeed * 0.02;
        p.x += p.vx + Math.sin(p.swirlPhase) * (p.swirlRadius * 0.3);

        const progress = p.life / p.maxLife;
        const currentAlpha = Math.sin(progress * Math.PI) * (isBroken ? 0.75 : 0.95);
        const currentSize = p.size * (1 - progress * 0.6);

        if (p.life >= p.maxLife || p.y < 0) {
          embers[i] = spawnEmber();
          continue;
        }

        if (p.type === 'glint') {
          // 4-Point Twinkle Star Sparkle
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.sparkleAngle || 0) + time * 2);
          const gSize = currentSize * 1.5;

          ctx.fillStyle = isBroken
            ? `rgba(220, 245, 255, ${currentAlpha})`
            : `rgba(255, 250, 210, ${currentAlpha})`;

          ctx.beginPath();
          // Draw 4-point star
          ctx.moveTo(0, -gSize);
          ctx.quadraticCurveTo(0, 0, gSize, 0);
          ctx.quadraticCurveTo(0, 0, 0, gSize);
          ctx.quadraticCurveTo(0, 0, -gSize, 0);
          ctx.quadraticCurveTo(0, 0, 0, -gSize);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'spark') {
          // High-energy fast spark
          const spkGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
          if (isBroken) {
            spkGrad.addColorStop(0, `rgba(255, 255, 255, ${currentAlpha})`);
            spkGrad.addColorStop(0.5, `rgba(120, 225, 255, ${currentAlpha * 0.8})`);
            spkGrad.addColorStop(1, 'rgba(0, 160, 255, 0)');
          } else {
            spkGrad.addColorStop(0, `rgba(255, 255, 240, ${currentAlpha})`);
            spkGrad.addColorStop(0.5, `rgba(255, 200, 50, ${currentAlpha * 0.8})`);
            spkGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');
          }

          ctx.fillStyle = spkGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Soft fluid ember
          const embGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
          if (isBroken) {
            embGrad.addColorStop(0, `rgba(180, 240, 255, ${currentAlpha})`);
            embGrad.addColorStop(0.6, `rgba(0, 150, 255, ${currentAlpha * 0.6})`);
            embGrad.addColorStop(1, 'rgba(0, 80, 200, 0)');
          } else {
            embGrad.addColorStop(0, `rgba(255, 240, 160, ${currentAlpha})`);
            embGrad.addColorStop(0.45, `rgba(255, 140, 20, ${currentAlpha * 0.85})`);
            embGrad.addColorStop(0.85, `rgba(255, 40, 0, ${currentAlpha * 0.4})`);
            embGrad.addColorStop(1, 'rgba(200, 0, 0, 0)');
          }

          ctx.fillStyle = embGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [streak, isBroken]);

  return (
    <div className="relative flex items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        className={`block transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer ${
          isBroken
            ? 'filter drop-shadow-[0_4px_16px_rgba(0,180,255,0.45)]'
            : 'filter drop-shadow-[0_6px_20px_rgba(255,90,0,0.5)]'
        }`}
      />
    </div>
  );
};
