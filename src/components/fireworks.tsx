"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  color: string;
}

const PALETTE_FALLBACK = ["#34d399", "#fbbf24", "#ffffff", "#fde68a", "#a7f3d0"];

/**
 * ألعاب نارية على Canvas — تتوقف تلقائيًا بعد المدة المحددة
 * ويتم تلوينها من ألوان الثيم الحالي.
 */
export default function Fireworks({
  active,
  durationMs = 9000,
  onDone,
}: {
  active: boolean;
  durationMs?: number;
  onDone?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);
  const paletteRef = useRef<string[]>(PALETTE_FALLBACK);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // قراءة ألوان الثيم الحالي
    if (typeof getComputedStyle !== "undefined") {
      const cs = getComputedStyle(document.documentElement);
      const accent = cs.getPropertyValue("--accent").trim() || "#34d399";
      const accent2 = cs.getPropertyValue("--accent2").trim() || "#fbbf24";
      paletteRef.current = [accent, accent2, "#ffffff", accent2, accent];
    }

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const spawnRocket = () => {
      const palette = paletteRef.current;
      const color = palette[Math.floor(Math.random() * palette.length)];
      rocketsRef.current.push({
        x: width * (0.15 + Math.random() * 0.7),
        y: height + 10,
        targetY: height * (0.12 + Math.random() * 0.35),
        vy: -(9 + Math.random() * 4),
        color,
      });
    };

    const explode = (x: number, y: number, color: string) => {
      const count = 70 + Math.floor(Math.random() * 50);
      const palette = paletteRef.current;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 2 + Math.random() * 5.5;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 55 + Math.random() * 45,
          color: Math.random() < 0.75 ? color : palette[Math.floor(Math.random() * palette.length)],
          size: 1.5 + Math.random() * 2.5,
          gravity: 0.045 + Math.random() * 0.03,
        });
      }
    };

    const start = performance.now();
    let lastRocket = 0;

    const tick = (t: number) => {
      const elapsed = t - start;
      // إطلاق صواريخ على فترات متفاوتة
      if (elapsed - lastRocket > 260 + Math.random() * 500 && elapsed < durationMs - 1500) {
        lastRocket = elapsed;
        spawnRocket();
        if (Math.random() < 0.4) spawnRocket();
      }

      ctx.clearRect(0, 0, width, height);

      // تحديث الصواريخ
      rocketsRef.current = rocketsRef.current.filter((r) => {
        r.y += r.vy;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        if (r.y <= r.targetY) {
          explode(r.x, r.y, r.color);
          return false;
        }
        return true;
      });

      // تحديث الجزيئات
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.vy *= 0.985;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (alpha <= 0.01) return false;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        return true;
      });

      if (elapsed < durationMs || particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
        onDone?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      particlesRef.current = [];
      rocketsRef.current = [];
      ctx.clearRect(0, 0, width, height);
    };
  }, [active, durationMs, onDone]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[90] pointer-events-none"
      aria-hidden="true"
    />
  );
}
