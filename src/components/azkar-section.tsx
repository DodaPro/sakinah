"use client";

import { useEffect, useMemo, useState } from "react";
import { azkarList, loadAzkarCounts, saveAzkarCounts } from "@/lib/adhkar";
import type { AzkarPeriod } from "@/lib/adhkar";
import { dayKey, toArabicDigits } from "@/lib/prayer";

/* =========================================================
   قسم الأذكار — أذكار الصباح والمساء بعدّاد لكل ذكر
   الدوس على الذكر بيعدّ تلقائيًا، وكل يوم بيبدأ من جديد
   ========================================================= */

export default function AzkarSection({ onToast }: { onToast: (msg: string) => void }) {
  const [period, setPeriod] = useState<AzkarPeriod>(() => (new Date().getHours() < 12 ? "morning" : "evening"));
  const [counts, setCounts] = useState<number[]>([]);
  const todayIso = useMemo(() => dayKey(new Date()), []);

  useEffect(() => {
    setCounts(loadAzkarCounts(period, todayIso));
  }, [period, todayIso]);

  const list = azkarList(period);
  const isMorning = period === "morning";

  const persist = (next: number[]) => {
    setCounts(next);
    saveAzkarCounts(period, todayIso, next);
  };

  const bump = (i: number) => {
    const target = list[i].count;
    const cur = counts[i] ?? 0;
    if (cur >= target) return;
    const next = [...counts];
    next[i] = cur + 1;
    persist(next);
    if (next[i] === target && next.every((c, j) => c >= list[j].count)) {
      onToast(isMorning ? "🌅 ختّمت أذكار الصباح — تقبّل الله 🤍" : "🌙 ختّمت أذكار المساء — تقبّل الله 🤍");
    } else if (next[i] === target) {
      onToast("✅ خلصت الذكر ده — انتقل لللي بعده");
    }
  };

  const resetToday = () => {
    persist(list.map(() => 0));
    onToast("↩️ رجّعنا عدّادات اليوم من الأول");
  };

  const doneCount = list.filter((z, i) => (counts[i] ?? 0) >= z.count).length;
  const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0;
  const allDone = doneCount === list.length && list.length > 0;

  return (
    <div className="space-y-4" aria-label="الأذكار">
      {/* كارت التقدم */}
      <section className="hero-card p-5 sm:p-7 animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--ink-dim)" }}>
              🤲 احفظ لسانك رطبًا بذكر الله — عدّاد لكل ذكر يتجدد كل يوم
            </p>
            <h2 className="font-quran text-2xl sm:text-3xl font-bold" style={{ color: "var(--accent2)" }}>
              {isMorning ? "أذكار الصباح" : "أذكار المساء"}
            </h2>
          </div>
          <span className="chip text-sm">
            {toArabicDigits(doneCount)} / {toArabicDigits(list.length)}
          </span>
        </div>

        {/* شريط التقدم */}
        <div className="q-progress h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
          <div
            className="h-full rounded-full q-progress-fill"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent2))",
            }}
          />
        </div>
        <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
          <p className="text-xs" style={{ color: "var(--ink-dim)" }}>
            {allDone
              ? "🎉 ختّمت الأذكار كلها — تقبّل الله منك 🤍"
              : isMorning
                ? "استقبل يومك بالذكر — الدوس على أي ذكر بيعدّ تلقائيًا"
                : "اختم يومك بالذكر — الدوس على أي ذكر بيعدّ تلقائيًا"}
          </p>
          {doneCount > 0 && (
            <button onClick={resetToday} className="btn-ghost px-3 py-1.5 text-[0.7rem]">
              ↩️ تصفير عدّادات اليوم
            </button>
          )}
        </div>
      </section>

      {/* تبويب صباح/مساء */}
      <div className="sub-tabs" role="tablist" aria-label="فترة الأذكار">
        <button role="tab" aria-selected={isMorning} onClick={() => setPeriod("morning")}>
          🌅 الصباح
        </button>
        <button role="tab" aria-selected={!isMorning} onClick={() => setPeriod("evening")}>
          🌙 المساء
        </button>
      </div>

      {/* أذكار اليوم */}
      <section className="space-y-2.5" aria-label={isMorning ? "أذكار الصباح" : "أذكار المساء"}>
        {list.map((z, i) => {
          const cur = counts[i] ?? 0;
          const done = cur >= z.count;
          return (
            <article
              key={i}
              className="glass-card p-4 sm:p-5 animate-rise"
              style={{
                borderColor: done ? "var(--accent)" : undefined,
                background: done ? "color-mix(in srgb, var(--accent) 10%, var(--surface))" : undefined,
              }}
              aria-label={`ذكر ${i + 1}`}
            >
              <div className="flex items-start gap-3">
                {/* عدّاد دائري */}
                <button
                  onClick={() => bump(i)}
                  disabled={done}
                  className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center leading-none transition-all active:scale-90 disabled:cursor-default"
                  style={{
                    background: done ? "var(--accent)" : "var(--surface-2)",
                    border: done ? "none" : "1.5px dashed var(--surface-border)",
                    color: done ? "var(--on-accent)" : "var(--ink)",
                    boxShadow: done ? "0 0 18px -6px var(--glow)" : "none",
                  }}
                  aria-label={done ? `تم الذكر ${i + 1}` : `عدّ الذكر ${i + 1}، السابق ${cur} من ${z.count}`}
                  title={done ? "تمّ ✅" : `دوس للعدّ (${cur}/${z.count})`}
                >
                  {done ? (
                    <span className="text-2xl">✅</span>
                  ) : (
                    <>
                      <span className="text-lg font-extrabold tabular-nums">{toArabicDigits(cur)}</span>
                      <span className="text-[0.6rem] opacity-75">من {toArabicDigits(z.count)}</span>
                    </>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className="font-quran text-lg sm:text-xl leading-loose"
                    style={{
                      color: "var(--ink)",
                      textDecoration: done ? "line-through" : "none",
                      opacity: done ? 0.75 : 1,
                    }}
                  >
                    {z.text}
                  </p>
                  {z.source && (
                    <p className="text-[0.7rem] mt-2" style={{ color: "var(--accent2)" }}>
                      💫 {z.source}
                    </p>
                  )}
                </div>
              </div>

              {/* عدّاد متعدد المرات */}
              {!done && z.count > 1 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap" aria-hidden>
                  {Array.from({ length: Math.min(z.count, 30) }).map((_, k) => (
                    <span
                      key={k}
                      className="w-2.5 h-2.5 rounded-full transition-all"
                      style={{
                        background: k < cur ? "var(--accent)" : "var(--surface-2)",
                        border: "1px solid var(--surface-border)",
                      }}
                    />
                  ))}
                  {z.count > 30 && <span className="text-[0.6rem] mr-1" style={{ color: "var(--ink-dim)" }}>…</span>}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <p className="text-[0.68rem] text-center" style={{ color: "var(--ink-dim)" }}>
        💡 العدّادات بتتصفّر كل يوم جديد — وبياناتك محفوظة على جهازك فقط
      </p>
    </div>
  );
}
