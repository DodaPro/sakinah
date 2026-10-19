"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * مشغل الأذان — يتعامل مع سياسات التشغيل التلقائي في المتصفحات:
 * - يفتح "القفل الصوتي" عند أول تفاعل من المستخدم
 * - يشغّل الأذان عند وقت الصلاة ويوقفه عند الطلب
 */
export function useAdhanPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  // فتح قفل الصوت عند أول تفاعل (سياسات المتصفح)
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      try {
        const a = new Audio();
        a.muted = true;
        a.volume = 0;
        const p = a.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            a.pause();
            unlockedRef.current = true;
          }).catch(() => {
            // فشل التشغيل التجريبي — سنحاول مجددًا عند التفاعل التالي
          });
        }
      } catch {}
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  /** تشغيل ملف أذان معين */
  const play = useCallback(
    (file: string, volume: number, onEnded?: () => void) => {
      try {
        stop();
        const a = new Audio(file);
        a.volume = Math.max(0, Math.min(1, volume));
        a.onended = () => {
          onEnded?.();
        };
        const p = a.play();
        if (p && typeof p.then === "function") {
          p.catch(() => {
            // المتصفح منع التشغيل — سيظهر زر تشغيل يدوي داخل النافذة
            window.dispatchEvent(new CustomEvent("adhan-blocked"));
          });
        }
        audioRef.current = a;
        unlockedRef.current = true;
      } catch {
        window.dispatchEvent(new CustomEvent("adhan-blocked"));
      }
    },
    [stop]
  );

  /** تشغيل تجريبي من الإعدادات */
  const test = useCallback(
    (file: string, volume: number) => {
      if (audioRef.current) {
        stop();
        return;
      }
      play(file, volume);
    },
    [play, stop]
  );

  useEffect(() => () => stop(), [stop]);

  return { play, stop, test, isPlaying: () => audioRef.current !== null };
}
