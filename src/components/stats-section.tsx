"use client";

import { PRAYER_NAMES, PRAYER_ORDER } from "@/lib/data";
import type { PrayerKey } from "@/lib/data";
import { dayCount, levelFromXp } from "@/lib/storage";
import type { Logs } from "@/lib/storage";
import { dayKey, toArabicDigits } from "@/lib/prayer";
import { LEVEL_TITLES } from "@/lib/data";

interface WeekDay {
  key: string;
  label: string;
  log: Record<PrayerKey, boolean>;
  isToday: boolean;
}

/** قسم الإحصائيات: حلقة اليوم، السلسلة، XP، الأسبوع */
export default function StatsSection({
  logs,
  streak,
  bestStreak,
  todayKey,
}: {
  logs: Logs;
  streak: number;
  bestStreak: number;
  todayKey: string;
}) {
  const todayLog = logs[todayKey] ?? { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false };
  const done = dayCount(todayLog);
  const xp = levelFromXp(
    Object.values(logs).reduce(
      (acc, log) => acc + dayCount(log) * 10 + (dayCount(log) >= 5 ? 25 : 0),
      0
    )
  );

  // آخر ٧ أيام (اليوم أولًا)
  const week: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const isToday = k === todayKey;
    week.push({
      key: k,
      label: isToday
        ? "اليوم"
        : new Intl.DateTimeFormat("ar-EG", { weekday: "short" }).format(d),
      log: logs[k] ?? { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      isToday,
    });
  }

  const R = 52;
  const C = 2 * Math.PI * R;
  const progress = done / 5;

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">📊</span>
        <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>
          إنجازك اليوم
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* حلقة التقدم */}
        <div className="relative w-32 h-32 shrink-0" role="img" aria-label={`أديت ${done} من ٥ صلوات اليوم`}>
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="11" />
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke="var(--accent)" strokeWidth="11" strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{
                transition: "stroke-dashoffset 1s cubic-bezier(0.3,1.1,0.4,1)",
                filter: "drop-shadow(0 0 6px var(--glow))",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold" style={{ color: "var(--ink)" }}>
              {toArabicDigits(done)}<span className="text-base" style={{ color: "var(--ink-dim)" }}> / {toArabicDigits(5)}</span>
            </span>
            <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
              {done >= 5 ? "تقبّل الله 🌟" : "صلوات اليوم"}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-4">
          {/* السلاسل */}
          <div className="flex gap-3">
            <div className="chip !rounded-2xl px-4 py-2.5 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
              🔥 <b style={{ color: "var(--accent)" }}>{toArabicDigits(streak)}</b> يوم متتالي
            </div>
            <div className="chip !rounded-2xl px-4 py-2.5 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
              🏅 الأفضل: <b style={{ color: "var(--accent2)" }}>{toArabicDigits(bestStreak)}</b>
            </div>
          </div>

          {/* شريط XP */}
          <div>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--ink-dim)" }}>
              <span>
                المستوى <b style={{ color: "var(--accent)" }}>{toArabicDigits(xp.level)}</b> — {LEVEL_TITLES[Math.min(xp.level - 1, LEVEL_TITLES.length - 1)]}
              </span>
              <span>{toArabicDigits(xp.inLevel)}/{toArabicDigits(xp.needed)} XP</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${(xp.inLevel / xp.needed) * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                  boxShadow: "0 0 12px var(--glow)",
                }}
              />
            </div>
          </div>

          {/* شبكة الأسبوع */}
          <div className="space-y-1.5">
            {week.map((day) => (
              <div key={day.key} className="flex items-center gap-2">
                <span
                  className="w-12 text-xs shrink-0 font-bold"
                  style={{ color: day.isToday ? "var(--accent)" : "var(--ink-dim)" }}
                >
                  {day.label}
                </span>
                <div className="flex gap-1.5 flex-1">
                  {PRAYER_ORDER.map((p) => (
                    <span
                      key={p}
                      title={`${PRAYER_NAMES[p]} — ${day.log[p] ? "مُسجّلة" : "غير مسجّلة"}`}
                      className="flex-1 h-3.5 rounded-full transition-colors"
                      style={{
                        background: day.log[p] ? "var(--accent)" : "var(--surface-2)",
                        border: day.log[p] ? "none" : "1px solid var(--surface-border)",
                        boxShadow: day.log[p] ? "0 0 8px -2px var(--glow)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
