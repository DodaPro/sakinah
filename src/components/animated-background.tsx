"use client";

import { useEffect, useRef } from "react";

/* =========================================================
   أنميشن الخلفية — نجوم متلألئة وهالات ضوئية عائمة
   يقرأ ألوان الثيم الحالي ويتتبع تغيّره، ويحترم مفتاح الأنميشنات
   ========================================================= */

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  tw: number; // سرعة الوميض
  phase: number;
  hue: number; // 0 = accent، 1 = accent2
  alpha: number;
}

interface Orb {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export default function AnimatedBackground({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let W = 0;
    let H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let accent = "52, 211, 153";
    let accent2 = "251, 191, 36";
    let isLight = false;

    const particles: Particle[] = [];
    const orbs: Orb[] = [];
    const stars: ShootingStar[] = [];

    const readThemeColors = () => {
      try {
        const s = getComputedStyle(document.documentElement);
        const a = s.getPropertyValue("--accent").trim();
        const b = s.getPropertyValue("--accent2").trim();
        const bg = s.getPropertyValue("--bg1").trim();
        // نحوّل hex إلى rgb string
        const toRgb = (hex: string, fallback: string) => {
          const m = /^#?([0-9a-f]{6})$/i.exec(hex);
          if (!m) return fallback;
          const n = parseInt(m[1], 16);
          return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
        };
        accent = toRgb(a, "52, 211, 153");
        accent2 = toRgb(b, "251, 191, 36");
        // خلفية فاتحة؟
        const m = /^#?([0-9a-f]{6})$/i.exec(bg);
        if (m) {
          const n = parseInt(m[1], 16);
          const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
          isLight = lum > 0.6;
        }
      } catch {}
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const seed = () => {
      particles.length = 0;
      orbs.length = 0;
      const target = Math.min(70, Math.floor((W * H) / 26000));
      for (let i = 0; i < target; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.6 + Math.random() * 1.8,
          vx: (Math.random() - 0.5) * 0.12,
          vy: -(0.05 + Math.random() * 0.22),
          tw: 0.4 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2,
          hue: Math.random() < 0.75 ? 0 : 1,
          alpha: 0.25 + Math.random() * 0.55,
        });
      }
      const orbCount = W < 640 ? 3 : 5;
      for (let i = 0; i < orbCount; i++) {
        orbs.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 120 + Math.random() * 180,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.06,
          hue: i % 2,
        });
      }
    };

    let t = 0;
    const tick = () => {
      if (!running) return;
      if (document.hidden) {
        raf = requestAnimationFrame(tick);
        return;
      }
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      // الهالات الضوئية الكبيرة
      for (const o of orbs) {
        o.x += o.vx;
        o.y += o.vy;
        if (o.x < -o.r) o.x = W + o.r;
        if (o.x > W + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = H + o.r;
        if (o.y > H + o.r) o.y = -o.r;
        const rgb = o.hue === 0 ? accent : accent2;
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        const baseA = isLight ? 0.05 : 0.1;
        g.addColorStop(0, `rgba(${rgb}, ${baseA})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // النجوم المتلألئة
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -8) {
          p.y = H + 8;
          p.x = Math.random() * W;
        }
        if (p.x < -8) p.x = W + 8;
        if (p.x > W + 8) p.x = -8;
        const twinkle = 0.55 + 0.45 * Math.sin(t * p.tw * 2 + p.phase);
        const rgb = p.hue === 0 ? accent : accent2;
        const a = p.alpha * twinkle * (isLight ? 0.55 : 1);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb}, ${a.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r * (0.85 + 0.3 * twinkle), 0, Math.PI * 2);
        ctx.fill();
        // توهج ناعم للنجوم الأكبر
        if (p.r > 1.7) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
          g.addColorStop(0, `rgba(${rgb}, ${(a * 0.35).toFixed(3)})`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // شهب نادرة
      if (Math.random() < 0.0025 && stars.length < 2 && !isLight) {
        const sx = Math.random() * W * 0.7 + W * 0.15;
        const sy = Math.random() * H * 0.3;
        stars.push({
          x: sx,
          y: sy,
          vx: -(2.2 + Math.random() * 2),
          vy: 1.1 + Math.random() * 0.8,
          life: 0,
          maxLife: 60 + Math.random() * 30,
        });
      }
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        const fade = Math.sin((s.life / s.maxLife) * Math.PI);
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 22, s.y - s.vy * 22);
        g.addColorStop(0, `rgba(255,255,255,${(0.75 * fade).toFixed(3)})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 22, s.y - s.vy * 22);
        ctx.stroke();
        if (s.life >= s.maxLife || s.x < -40 || s.y > H + 40) stars.splice(i, 1);
      }

      raf = requestAnimationFrame(tick);
    };

    readThemeColors();
    resize();

    const mo = new MutationObserver(readThemeColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });

    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      mo.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="bg-anim-canvas"
    />
  );
}
