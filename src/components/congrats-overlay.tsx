"use client";

import { PRAYER_NAMES } from "@/lib/data";
import type { PrayerKey } from "@/lib/data";
import { toArabicDigits } from "@/lib/prayer";
import { ACHIEVEMENTS } from "@/lib/data";

/** شاشة التهنئة بعد تسجيل الصلاة + الألعاب النارية تُعرض من الأب */
export default function CongratsOverlay({
  show,
  prayer,
  xpGain,
  streak,
  newAchievements,
  onClose,
}: {
  show: boolean;
  prayer: PrayerKey | null;
  xpGain: number;
  streak: number;
  newAchievements: string[];
  onClose: () => void;
}) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="تهنئة بتسجيل الصلاة"
    >
      <div
        className="animate-pop-in glass-card !rounded-[2rem] max-w-md w-full p-8 text-center relative overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        {/* هالة متوهجة */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--glow), transparent 70%)" }}
        />

        <div className="relative">
          <div className="text-7xl mb-3 animate-float">🎉</div>
          <h2 className="text-2xl font-extrabold mb-1.5" style={{ color: "var(--ink)" }}>
            مبروك! تقبّل الله منك
          </h2>
          <p className="text-sm mb-5" style={{ color: "var(--ink-dim)" }}>
            رُصدت لك صلاة{" "}
            <b style={{ color: "var(--accent)" }}>
              {prayer ? PRAYER_NAMES[prayer] : ""}
            </b>{" "}
            في وقتها — جعلها الله نورًا لك
          </p>

          <div className="flex justify-center gap-3 mb-5">
            <div
              className="px-4 py-2.5 rounded-2xl font-extrabold animate-pulse-glow"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              +{toArabicDigits(xpGain)} XP ✨
            </div>
            {streak > 1 && (
              <div className="px-4 py-2.5 rounded-2xl chip" style={{ fontWeight: 700 }}>
                🔥 سلسلة {toArabicDigits(streak)} يوم
              </div>
            )}
          </div>

          {newAchievements.length > 0 && (
            <div className="mb-5 space-y-2">
              {newAchievements.map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                if (!a) return null;
                return (
                  <div
                    key={id}
                    className="animate-rise flex items-center gap-3 p-3 rounded-2xl text-right"
                    style={{ background: "var(--surface)", border: "1px solid var(--accent)" }}
                  >
                    <span className="text-2xl">{a.emoji}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--accent2)" }}>
                        إنجاز جديد: {a.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--ink-dim)" }}>
                        {a.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={onClose} className="btn-accent w-full py-3 text-lg">
            جزاك الله خيرًا 🤍
          </button>
        </div>
      </div>
    </div>
  );
}
