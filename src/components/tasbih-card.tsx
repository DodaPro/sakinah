"use client";

import { useCallback, useState } from "react";
import { loadTasbih, saveTasbih } from "@/lib/storage";
import { toArabicDigits } from "@/lib/prayer";

const PRESETS = ["سُبْحَانَ اللَّهِ", "الْحَمْدُ لِلَّهِ", "اللَّهُ أَكْبَرُ", "لَا إِلَٰهَ إِلَّا اللَّهُ", "أَسْتَغْفِرُ اللَّهَ"];
const CYCLE_AT = 33;

/** سبحة إلكترونية بعدّاد محفوظ */
export default function TasbihCard() {
  const [state, setState] = useState(() =>
    typeof window === "undefined" ? { total: 0, presetIndex: 0 } : loadTasbih()
  );
  const [pulse, setPulse] = useState(0);
  const [perDhikr, setPerDhikr] = useState(0);

  const tap = useCallback(() => {
    setState((prev) => {
      const next = {
        ...prev,
        total: prev.total + 1,
        presetIndex: perDhikr + 1 >= CYCLE_AT ? (prev.presetIndex + 1) % PRESETS.length : prev.presetIndex,
      };
      saveTasbih(next);
      return next;
    });
    setPerDhikr((p) => (p + 1 >= CYCLE_AT ? 0 : p + 1));
    setPulse((p) => p + 1);
  }, [perDhikr]);

  const reset = useCallback(() => {
    setPerDhikr(0);
    setState((prev) => {
      const next = { ...prev };
      saveTasbih(next);
      return next;
    });
  }, []);

  return (
    <div className="glass-card p-5 sm:p-6 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 self-start">
        <span className="text-2xl">📿</span>
        <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>
          السبحة
        </h3>
        <span className="chip mr-auto">الإجمالي: {toArabicDigits(state.total)}</span>
      </div>

      <p key={state.presetIndex} className="font-quran text-xl font-bold text-center animate-fade-swap" style={{ color: "var(--accent2)" }}>
        {PRESETS[state.presetIndex]}
      </p>

      <button
        onClick={tap}
        aria-label={`سبّح — العد الحالي ${perDhikr}`}
        className="relative w-36 h-36 rounded-full flex items-center justify-center select-none active:scale-95 transition-transform"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, var(--surface-2), var(--surface))",
          border: "2px solid var(--accent)",
          boxShadow: "0 0 30px -8px var(--glow)",
        }}
      >
        <span key={pulse} className="animate-pop-in text-4xl font-extrabold" style={{ color: "var(--accent)" }}>
          {toArabicDigits(perDhikr)}
        </span>
        <span className="absolute bottom-4 text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>
          اضغط للتسبيح
        </span>
      </button>

      <div className="flex items-center gap-2 text-xs w-full justify-between">
        <span style={{ color: "var(--ink-dim)" }}>
          الدورة: {toArabicDigits(perDhikr)} / {toArabicDigits(CYCLE_AT)}
        </span>
        <button onClick={reset} className="btn-ghost px-3 py-1 text-xs">
          تصفير الدورة
        </button>
      </div>
    </div>
  );
}
