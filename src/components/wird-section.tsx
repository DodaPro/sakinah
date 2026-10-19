"use client";

import { useMemo, useState } from "react";
import {
  QURAN_PAGES,
  loadWird,
  saveWird,
  wirdPace,
  wirdProjection,
  wirdStreak,
  wirdTotal,
} from "@/lib/wird";
import type { WirdState } from "@/lib/wird";
import { dayKey, toArabicDigits } from "@/lib/prayer";

/* =========================================================
   ورد القرآن — خطة ختمة يومية مع تتبع وسلسلة وتوقع الختم
   ========================================================= */

const PRESETS: { value: number; label: string; desc: string }[] = [
  { value: 20, label: "جزء يومي", desc: "ختمة في شهر تقريبًا" },
  { value: 10, label: "نص جزء", desc: "ختمة في شهرين" },
  { value: 5, label: "٥ صفحات", desc: "ختمة في ٤ شهور" },
  { value: 2, label: "صفحتين", desc: "ختمة في ١٠ شهور" },
  { value: 1, label: "صفحة يومية", desc: "ختمة في سنتين — خطوة ثابتة" },
];

function dmOf(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const M = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${d.getDate()} ${M[d.getMonth()]}`;
}

export default function WirdSection({
  onToast,
  onCelebrate,
}: {
  onToast: (msg: string) => void;
  onCelebrate?: () => void;
}) {
  const [wird, setWird] = useState<WirdState | null>(() => loadWird());
  const [custom, setCustom] = useState("");
  const [celebratedDays, setCelebratedDays] = useState<Set<string>>(new Set());

  const todayIso = useMemo(() => dayKey(new Date()), []);

  const commit = (w: WirdState | null) => {
    setWird(w);
    saveWird(w);
  };

  /* ---------------- شاشة إنشاء الخطة ---------------- */
  if (!wird) {
    const startPlan = (target: number) => {
      if (target < 1 || target > 200) return;
      commit({ target, startedAt: todayIso, log: {} });
      onToast(`📗 بدأت خطة ورد ${toArabicDigits(target)} صفحة في اليوم — بالتوفيق! 🤍`);
    };

    return (
      <div className="space-y-4" aria-label="خطة ورد القرآن">
        <section className="hero-card p-6 sm:p-8 animate-rise text-center">
          <div className="text-5xl mb-3 animate-float">📗</div>
          <h2 className="font-quran text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--accent2)" }}>
            خطة ورد القرآن
          </h2>
          <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: "var(--ink-dim)" }}>
            خطة ختمة يومية بتتابع صفحاتك وسلسلتك وموعد ختمك المتوقع — خفيف على نفسك وثابت عليه،
            «أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهُ وَإِنْ قَلَّ»
          </p>
        </section>

        <section className="glass-card p-5" aria-label="اختار هدفك اليومي">
          <h3 className="font-bold mb-3" style={{ color: "var(--ink)" }}>
            ⚖️ اختار الورد اليومي المناسب لك
          </h3>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => startPlan(p.value)}
                className="p-4 rounded-2xl text-right transition-all hover:-translate-y-0.5"
                style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}
                aria-label={`خطة ${p.label} — ${p.desc}`}
              >
                <span className="block font-bold text-sm" style={{ color: "var(--accent)" }}>
                  📄 {p.label} <span className="text-xs font-normal" style={{ color: "var(--ink-dim)" }}>({toArabicDigits(p.value)} صفحة/يوم)</span>
                </span>
                <span className="block text-xs mt-1" style={{ color: "var(--ink-dim)" }}>
                  {p.desc}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <input
              type="number"
              min={1}
              max={200}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="أو حدد عدد صفحات مخصص…"
              className="flex-1 min-w-0 p-3 rounded-2xl text-sm"
              style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", color: "var(--ink)" }}
              aria-label="عدد صفحات مخصص"
            />
            <button
              onClick={() => startPlan(Number(custom))}
              disabled={!custom || Number(custom) < 1}
              className="btn-accent px-5 py-3 text-sm shrink-0 disabled:opacity-50"
            >
              ابدأ
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* ---------------- الخطة شغالة ---------------- */
  const todayPages = wird.log[todayIso] || 0;
  const doneToday = todayPages >= wird.target;
  const totalRead = wirdTotal(wird);
  const pct = Math.min(100, Math.round((totalRead / QURAN_PAGES) * 100));
  const streak = wirdStreak(wird, todayIso);
  const pace = wirdPace(wird, todayIso);
  const finishIso = wirdProjection(wird, todayIso);
  const finished = totalRead >= QURAN_PAGES;

  const addPages = (n: number) => {
    const prev = todayPages;
    const next = Math.max(0, Math.min(QURAN_PAGES, prev + n));
    const updated: WirdState = { ...wird, log: { ...wird.log, [todayIso]: next } };
    commit(updated);
    if (next >= wird.target && prev < wird.target && !celebratedDays.has(todayIso)) {
      setCelebratedDays((s) => new Set(s).add(todayIso));
      onToast(`🎉 كمّلت ورد النهاردة (${toArabicDigits(wird.target)} صفحة) — تقبّل الله 🤍`);
      onCelebrate?.();
    }
  };

  const setTarget = (t: number) => {
    if (t < 1 || t > 200) return;
    commit({ ...wird, target: t });
    onToast(`🎯 الورد اليومي بقى ${toArabicDigits(t)} صفحة`);
  };

  // آخر ١٤ يوم للعرض
  const last14 = (() => {
    const arr: { iso: string; pages: number }[] = [];
    const d = new Date(todayIso + "T00:00:00");
    for (let i = 13; i >= 0; i--) {
      const dd = new Date(d);
      dd.setDate(dd.getDate() - i);
      const iso = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
      arr.push({ iso, pages: wird.log[iso] || 0 });
    }
    return arr;
  })();

  return (
    <div className="space-y-4" aria-label="ورد القرآن">
      {/* تقدم الختمة */}
      <section className="hero-card p-5 sm:p-7 animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--ink-dim)" }}>
              📗 وردك اليومي من القرآن — {toArabicDigits(wird.target)} صفحة في اليوم
            </p>
            <h2 className="font-quran text-2xl sm:text-3xl font-bold" style={{ color: "var(--accent2)" }}>
              {finished ? "🎉 ختمت المصحف كاملًا!" : "ختمة قرآنية جارية"}
            </h2>
          </div>
          <span className="chip text-sm">🔥 سلسلة {toArabicDigits(streak)} يوم</span>
        </div>

        {/* شريط التقدم الكلي */}
        <div className="q-progress h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
          <div
            className="h-full rounded-full q-progress-fill"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }}
          />
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 mt-2 text-xs" style={{ color: "var(--ink-dim)" }}>
          <span>
            <b style={{ color: "var(--accent)" }}>{toArabicDigits(totalRead)}</b> / {toArabicDigits(QURAN_PAGES)} صفحة ({toArabicDigits(pct)}٪)
          </span>
          <span>باقي {toArabicDigits(Math.max(0, QURAN_PAGES - totalRead))} صفحة</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
          <div className="p-3 rounded-2xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
            <p className="text-lg font-extrabold" style={{ color: "var(--accent)" }}>
              {finishIso ? dmOf(finishIso) : "—"}
            </p>
            <p className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>الختم المتوقع</p>
          </div>
          <div className="p-3 rounded-2xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
            <p className="text-lg font-extrabold" style={{ color: "var(--accent2)" }}>
              {toArabicDigits(pace > 0 ? Math.round(pace * 10) / 10 : wird.target)}
            </p>
            <p className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>صفحة/يوم (وتيرتك)</p>
          </div>
          <div className="p-3 rounded-2xl text-center col-span-2 sm:col-span-1" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
            <p className="text-lg font-extrabold" style={{ color: "var(--accent)" }}>
              {toArabicDigits(Math.ceil((QURAN_PAGES - totalRead) / wird.target))}
            </p>
            <p className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>يوم على الختم (بهدفك)</p>
          </div>
        </div>
      </section>

      {/* ورد النهاردة */}
      <section
        className="glass-card p-5 sm:p-6 animate-rise"
        aria-label="ورد النهاردة"
        style={{
          borderColor: doneToday ? "var(--accent)" : undefined,
          background: doneToday ? "color-mix(in srgb, var(--accent) 10%, var(--surface))" : undefined,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-bold" style={{ color: "var(--ink)" }}>
            {doneToday ? "✅ كمّلت ورد النهاردة — ما شاء الله!" : "📖 ورد النهاردة"}
          </h3>
          <span className="chip">
            {toArabicDigits(todayPages)} / {toArabicDigits(wird.target)} صفحة
          </span>
        </div>

        {/* شريط اليوم */}
        <div className="q-progress h-2 rounded-full overflow-hidden mb-4" style={{ background: "var(--surface-2)" }}>
          <div
            className="h-full rounded-full q-progress-fill"
            style={{
              width: `${Math.min(100, (todayPages / wird.target) * 100)}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent2))",
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => addPages(1)} className="btn-ghost px-4 py-2.5 text-sm" aria-label="أضف صفحة">
            + ١ صفحة
          </button>
          <button onClick={() => addPages(5)} className="btn-ghost px-4 py-2.5 text-sm" aria-label="أضف ٥ صفحات">
            + ٥
          </button>
          <button onClick={() => addPages(10)} className="btn-ghost px-4 py-2.5 text-sm" aria-label="أضف ١٠ صفحات">
            + ١٠
          </button>
          <button onClick={() => addPages(20)} className="btn-accent px-4 py-2.5 text-sm" aria-label="أضف ٢٠ صفحة (جزء)">
            + ٢٠ (جزء)
          </button>
          {todayPages > 0 && (
            <button onClick={() => addPages(-todayPages)} className="btn-ghost px-3 py-2.5 text-xs mr-auto" aria-label="تصفير ورد اليوم">
              ↩️ تصفير اليوم
            </button>
          )}
        </div>
      </section>

      {/* آخر ١٤ يوم */}
      <section className="glass-card p-5" aria-label="تتبع آخر أسبوعين">
        <h3 className="font-bold mb-3 text-sm" style={{ color: "var(--ink)" }}>
          📅 آخر ١٤ يوم
        </h3>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1" dir="rtl">
          {last14.map((d) => {
            const met = d.pages >= wird.target;
            const isToday = d.iso === todayIso;
            return (
              <div
                key={d.iso}
                className="shrink-0 w-12 p-2 rounded-xl text-center"
                style={{
                  background: met ? "color-mix(in srgb, var(--accent) 16%, var(--surface))" : "var(--surface-2)",
                  border: isToday ? "1.5px solid var(--accent2)" : "1px solid var(--surface-border)",
                }}
                title={`${d.iso}: ${d.pages} صفحة`}
              >
                <span className="block text-[0.6rem]" style={{ color: "var(--ink-dim)" }}>
                  {d.iso.slice(8)}
                </span>
                <span className="block text-sm font-extrabold" style={{ color: met ? "var(--accent)" : "var(--ink-dim)" }}>
                  {met ? "✓" : toArabicDigits(d.pages)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* إدارة الخطة */}
      <section className="glass-card p-4 flex flex-wrap items-center gap-2" aria-label="إعدادات الخطة">
        <span className="text-xs font-bold" style={{ color: "var(--ink-dim)" }}>🎯 تعديل الهدف:</span>
        {[1, 5, 10, 20].map((t) => (
          <button
            key={t}
            onClick={() => setTarget(t)}
            className="btn-ghost px-3 py-1.5 text-xs"
            style={wird.target === t ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
            aria-pressed={wird.target === t}
          >
            {toArabicDigits(t)} صفحة
          </button>
        ))}
        <button
          onClick={() => {
            commit(null);
            onToast("تم إلغاء خطة الورد — تقدر تبدأ خطة جديدة في أي وقت");
          }}
          className="btn-ghost px-3 py-1.5 text-xs mr-auto"
          style={{ color: "#f87171", borderColor: "rgba(239,68,68,0.4)" }}
          aria-label="إلغاء خطة الورد"
        >
          🗑️ إلغاء الخطة
        </button>
      </section>
    </div>
  );
}
