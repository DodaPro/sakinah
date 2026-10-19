"use client";

import { useMemo } from "react";
import { ENCOURAGEMENT_ADVICE, ENCOURAGEMENT_VERSES, HADITHS, PRAYER_NAMES } from "@/lib/data";
import type { PrayerKey } from "@/lib/data";
import { toArabicDigits } from "@/lib/prayer";

/**
 * نافذة تأكيد الصلاة — مراحلتان:
 *  ask       : هل صليت؟
 *  encourage : نصائح وآيات للتحفيز
 */
export default function PrayerModal({
  prayer,
  stage,
  timeStr,
  adhanBlocked,
  adhanPlaying,
  onAnswer,
  onGoPray,
  onSnooze,
  onPlayAdhan,
  onStopAdhan,
}: {
  prayer: PrayerKey | null;
  stage: "ask" | "encourage";
  timeStr: string;
  adhanBlocked: boolean;
  adhanPlaying: boolean;
  onAnswer: (yes: boolean) => void;
  onGoPray: () => void;
  onSnooze: () => void;
  onPlayAdhan: () => void;
  onStopAdhan: () => void;
}) {
  // اختيار آية ونصيحة وحديث عشوائي (يتغير مع كل صلاة)
  const picks = useMemo(() => {
    const idx = Math.floor(Math.random() * 100);
    return {
      verse: ENCOURAGEMENT_VERSES[idx % ENCOURAGEMENT_VERSES.length],
      advice: ENCOURAGEMENT_ADVICE[idx % ENCOURAGEMENT_ADVICE.length],
      hadith: HADITHS[idx % HADITHS.length],
    };
  }, [prayer, stage]);

  if (!prayer) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={`تأكيد صلاة ${PRAYER_NAMES[prayer]}`}
    >
      <div
        className="animate-rise glass-card !rounded-[2rem] max-w-md w-full p-6 sm:p-7 relative overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        {stage === "ask" ? (
          <div className="text-center">
            <div className="text-6xl mb-3 animate-pulse-glow rounded-full inline-block px-4 py-3" style={{ border: "2px solid var(--accent)" }}>
              🕌
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold mb-1" style={{ color: "var(--ink)" }}>
              حان الآن وقت صلاة {PRAYER_NAMES[prayer]}
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--ink-dim)" }}>
              الموعد: {timeStr} — الله أكبر الله أكبر
            </p>

            <p className="font-bold text-lg mb-5" style={{ color: "var(--accent)" }}>
              هل صليتها؟ 🤲
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => onAnswer(true)}
                className="btn-accent py-4 text-lg"
              >
                الحمد لله، صليتها ✅
              </button>
              <button
                onClick={() => onAnswer(false)}
                className="btn-ghost py-4 text-lg"
                style={{ borderColor: "var(--accent2)" }}
              >
                لسه ما صليتش ❌
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {adhanBlocked && (
                <button onClick={onPlayAdhan} className="btn-accent px-4 py-2 text-sm">
                  🔊 شغّل الأذان
                </button>
              )}
              {adhanPlaying && (
                <button onClick={onStopAdhan} className="btn-ghost px-4 py-2 text-sm">
                  ⏹ إيقاف الأذان
                </button>
              )}
              <button onClick={onSnooze} className="btn-ghost px-4 py-2 text-sm">
                ⏰ ذكّرني بعد {toArabicDigits(10)} دقايق
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-5xl mb-1">🤲</div>
            <h2 className="text-xl font-extrabold" style={{ color: "var(--accent)" }}>
              قوم اصلي يا صاحبي
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
              {picks.advice}
            </p>

            <div
              className="rounded-2xl p-4 text-right"
              style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}
            >
              <p className="font-quran text-lg leading-loose" style={{ color: "var(--accent2)" }}>
                ﴿ {picks.verse.text} ﴾
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-dim)" }}>
                [{picks.verse.ref}]
              </p>
            </div>

            <p className="text-xs" style={{ color: "var(--ink-dim)" }}>
              {picks.hadith}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button onClick={onGoPray} className="btn-accent py-3.5">
                هقوم أصلّي حالًا بإذن الله 💚
              </button>
              <button onClick={onSnooze} className="btn-ghost py-3.5">
                ⏰ ذكّرني بعد {toArabicDigits(10)} دقايق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
