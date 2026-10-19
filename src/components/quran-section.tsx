"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RECITERS,
  SURAHS,
  DEFAULT_RECITER_ID,
  findReciter,
  surahAudioUrl,
  loadReciterId,
  saveReciterId,
  loadLastSurah,
  saveLastSurah,
  loadFavorites,
  saveFavorites,
} from "@/lib/quran";
import type { ReciterDef } from "@/lib/quran";
import { toArabicDigits } from "@/lib/prayer";

/* =========================================================
   تبويب القرآن الكريم: قراء كتير + كل السور + مشغل تلاوات
   ========================================================= */

type PlayState = "idle" | "loading" | "playing" | "paused" | "error";

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function QuranSection({ onToast }: { onToast: (msg: string) => void }) {
  const [reciterId, setReciterId] = useState(DEFAULT_RECITER_ID);
  const [surahNum, setSurahNum] = useState(1);
  const [state, setState] = useState<PlayState>("idle");
  const [current, setCurrent] = useState<{ surah: number; reciter: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [query, setQuery] = useState("");
  const [showReciters, setShowReciters] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [autoNext, setAutoNext] = useState(true);
  const [showFavs, setShowFavs] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(false);

  const reciter = useMemo(() => findReciter(reciterId), [reciterId]);
  const surah = useMemo(() => SURAHS[(surahNum || 1) - 1], [surahNum]);

  /* ---------------- التحميل الأولي ---------------- */
  useEffect(() => {
    // تحميل الاختيارات المحفوظة من localStorage بعد أول رندر (نمط hydration آمن للـ SSR)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReciterId(loadReciterId());
     
    setSurahNum(loadLastSurah());
     
    setFavorites(loadFavorites());
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const persistSurah = useCallback((n: number) => {
    saveLastSurah(n);
  }, []);

  /* ---------------- التشغيل ---------------- */
  const play = useCallback(
    (surahN: number, rec: ReciterDef) => {
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      const url = surahAudioUrl(rec, surahN);
      audio.pause();
      audio.src = url;
      audio.load();
      setState("loading");
      setCurrent({ surah: surahN, reciter: rec.id });
      audio
        .play()
        .then(() => setState("playing"))
        .catch(() => {
          // غالبًا السياسة تمنع التشغيل التلقائي أو انقطع النت
          setState("error");
          onToast("⚠️ مش قادر يشغّل التلاوة — اتأكد من النت وجرب تاني");
        });
    },
    [onToast]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      play(surahNum, reciter);
      return;
    }
    // لو المختار حاليًا مختلف عن الشغال — شغّل الجديد
    if (current && (current.surah !== surahNum || current.reciter !== reciterId)) {
      play(surahNum, reciter);
      return;
    }
    if (audio.paused) {
      if (!audio.src) {
        play(surahNum, reciter);
      } else {
        audio
          .play()
          .then(() => setState("playing"))
          .catch(() => setState("error"));
      }
    } else {
      audio.pause();
      setState("paused");
    }
  }, [current, surahNum, reciterId, reciter, play]);

  const stopAll = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setState("idle");
    setProgress(0);
    setCurrentTime(0);
  }, []);

  const skip = useCallback(
    (dir: 1 | -1) => {
      const next = Math.min(114, Math.max(1, surahNum + dir));
      setSurahNum(next);
      persistSurah(next);
      play(next, reciter);
    },
    [surahNum, reciter, play, persistSurah]
  );

  /* ---------------- تقديم/رجوع بالثواني (مسافة صغيرة) ---------------- */
  const seekBy = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Infinity;
    const next = Math.min(Math.max(0, audio.currentTime + delta), max);
    audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  /* ---------------- أحداث الصوت ---------------- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setProgress(audio.currentTime / audio.duration);
      }
    };
    const onEnded = () => {
      if (autoNext && current) {
        const nextN = current.surah >= 114 ? 1 : current.surah + 1;
        const rec = findReciter(current.reciter);
        setSurahNum(nextN);
        saveLastSurah(nextN);
        play(nextN, rec);
        onToast(`▶️ التالية: سورة ${SURAHS[nextN - 1].name}`);
      } else {
        setState("idle");
        setProgress(0);
      }
    };
    const onErr = () => {
      setState("error");
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onErr);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onErr);
    };
  }, [autoNext, current, play, onToast]);

  /* ---------------- الاختيارات ---------------- */
  const pickReciter = useCallback(
    (r: ReciterDef) => {
      setReciterId(r.id);
      saveReciterId(r.id);
      // لو حاجة شغالة حاليًا — كمل بنفس السورة بالقارئ الجديد
      if (current) {
        play(current.surah, r);
      } else {
        play(surahNum, r);
      }
      setShowReciters(false);
      onToast(`🎙️ القارئ: ${r.name}`);
    },
    [current, surahNum, play, onToast]
  );

  const pickSurah = useCallback(
    (n: number) => {
      setSurahNum(n);
      persistSurah(n);
      play(n, reciter);
    },
    [reciter, play, persistSurah]
  );

  const toggleFavorite = useCallback(
    (n: number) => {
      setFavorites((prev) => {
        const next = prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b);
        saveFavorites(next);
        return next;
      });
    },
    []
  );

  /* ---------------- فلترة السور ---------------- */
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return SURAHS;
    // بحث بالاسم أو الرقم
    const qDigits = q.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    const n = Number(qDigits);
    return SURAHS.filter((s) => {
      if (!Number.isNaN(n) && String(n) === String(s.n)) return true;
      return s.name.includes(q) || s.name.replace("ال", "").includes(q.replace("ال", ""));
    });
  }, [query]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // الشريط نفسه LTR في الـ CSS — الضغط يمين = تقديم، شمال = رجوع (زي كل المشغلات)
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.min(audio.duration, Math.max(0, ratio * audio.duration));
  }, []);

  const isCurrentSurah = current?.surah === surahNum && current?.reciter === reciterId;
  const isPlaying = state === "playing" && isCurrentSurah;
  const isLoading = state === "loading" && isCurrentSurah;

  const currentPlayingName =
    current && state !== "idle"
      ? `سورة ${SURAHS[current.surah - 1].name} — ${findReciter(current.reciter).name}`
      : `سورة ${surah.name} — ${reciter.name}`;

  return (
    <div className="space-y-4" aria-label="القرآن الكريم">
      {/* بطاقة المشغل */}
      <section className="hero-card p-5 sm:p-7 animate-rise" aria-label="مشغل التلاوة">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--ink-dim)" }}>
              📖 استمع للقرآن الكريم — تلاوات كاملة لكل السور
            </p>
            <h2 className="font-quran text-2xl sm:text-3xl font-bold" style={{ color: "var(--accent2)" }}>
              {currentPlayingName}
            </h2>
          </div>
          <button
            onClick={() => toggleFavorite(surahNum)}
            className="btn-ghost w-11 h-11 flex items-center justify-center text-xl"
            aria-label={favorites.includes(surahNum) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            title={favorites.includes(surahNum) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            {favorites.includes(surahNum) ? "⭐" : "☆"}
          </button>
        </div>

        {/* أزرار التحكم — ترتيب LTR قياسي زي كل المشغلات: السابقة شمال والتالية يمين */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 my-5" dir="ltr">
          <button onClick={() => skip(-1)} className="btn-ghost w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg shrink-0" aria-label="السورة السابقة" title="السورة السابقة">
            ⏮
          </button>
          <button onClick={() => seekBy(-10)} className="btn-ghost w-10 h-10 sm:w-12 sm:h-12 rounded-full flex flex-col items-center justify-center leading-none shrink-0" aria-label="رجوع ١٠ ثواني" title="رجوع ١٠ ثواني">
            <span className="text-base">⏪</span>
            <span className="text-[0.5rem] font-bold mt-0.5" style={{ color: "var(--ink-dim)" }}>١٠</span>
          </button>
          <button
            onClick={togglePlay}
            className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full flex items-center justify-center text-3xl transition-transform hover:scale-105 active:scale-95"
            style={{
              background: "var(--accent)",
              color: "var(--on-accent)",
              boxShadow: "0 0 40px -6px var(--glow)",
            }}
            aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل التلاوة"}
          >
            {isLoading ? <span className="animate-spin inline-block">◌</span> : isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={() => seekBy(10)} className="btn-ghost w-10 h-10 sm:w-12 sm:h-12 rounded-full flex flex-col items-center justify-center leading-none shrink-0" aria-label="تقديم ١٠ ثواني" title="تقديم ١٠ ثواني">
            <span className="text-base">⏩</span>
            <span className="text-[0.5rem] font-bold mt-0.5" style={{ color: "var(--ink-dim)" }}>١٠</span>
          </button>
          <button onClick={() => skip(1)} className="btn-ghost w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg shrink-0" aria-label="السورة التالية" title="السورة التالية">
            ⏭
          </button>
          {(state === "playing" || state === "paused" || state === "loading") && (
            <button onClick={stopAll} className="btn-ghost w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg shrink-0" aria-label="إيقاف" title="إيقاف">
              ⏹
            </button>
          )}
        </div>

        {/* شريط التقدم */}
        <div className="px-1">
          <div
            className="q-progress h-2.5 rounded-full cursor-pointer overflow-hidden"
            onClick={seek}
            role="slider"
            aria-label="شريط تقدم التلاوة"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            style={{ background: "var(--surface-2)" }}
          >
            <div
              className="h-full rounded-full q-progress-fill"
              style={{
                width: `${(progress * 100).toFixed(1)}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent2))",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[0.7rem] tabular-nums" style={{ color: "var(--ink-dim)" }} dir="ltr">
            <span>{formatTime(currentTime)}</span>
            <span>{duration && isFinite(duration) ? formatTime(duration) : "—"}</span>
          </div>
        </div>

        {/* السورة الحالية معلومات */}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          <span className="chip">سورة {surah.name}</span>
          <span className="chip">{surah.place}</span>
          <span className="chip">{toArabicDigits(surah.ayahs)} آية</span>
          <button
            onClick={() => setShowReciters((v) => !v)}
            className="chip cursor-pointer"
            style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
            aria-expanded={showReciters}
          >
            🎙️ {reciter.name} {showReciters ? "▲" : "▼"}
          </button>
        </div>

        {state === "error" && (
          <p className="text-xs text-center mt-3" style={{ color: "#f87171" }}>
            ⚠️ حصلت مشكلة في تشغيل التلاوة — جرّب تاني أو اختار قارئ تاني
          </p>
        )}
      </section>

      {/* شبكة القراء */}
      {showReciters && (
        <section className="glass-card p-5 animate-rise" aria-label="اختيار القارئ">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎙️</span>
            <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>
              اختار القارئ ({toArabicDigits(RECITERS.length)} قارئ)
            </h3>
            <button onClick={() => setShowReciters(false)} className="btn-ghost mr-auto w-9 h-9 flex items-center justify-center" aria-label="إغلاق قائمة القراء">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 q-reciters">
            {RECITERS.map((r) => {
              const active = r.id === reciterId;
              const playingThis = current?.reciter === r.id && (state === "playing" || state === "loading");
              return (
                <button
                  key={r.id}
                  onClick={() => pickReciter(r)}
                  className="reciter-card p-3.5 rounded-2xl text-right transition-all hover:-translate-y-0.5"
                  style={{
                    background: active ? "color-mix(in srgb, var(--accent) 14%, var(--surface))" : "var(--surface)",
                    border: active ? "1.5px solid var(--accent)" : "1px solid var(--surface-border)",
                    boxShadow: active ? "0 0 20px -6px var(--glow)" : "none",
                  }}
                  aria-pressed={active}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{playingThis ? "🔊" : active ? "✓" : "🎙️"}</span>
                    <span className="text-sm font-bold" style={{ color: active ? "var(--accent)" : "var(--ink)" }}>
                      {r.name}
                    </span>
                  </span>
                  <span className="block text-[0.68rem] mt-1" style={{ color: "var(--ink-dim)" }}>
                    {r.style}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* قائمة السور */}
      <section className="glass-card p-5" aria-label="قائمة السور">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-2xl">📗</span>
          <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>
            كل السور ({toArabicDigits(114)})
          </h3>
          <label className="mr-auto relative">
            <span className="sr-only">ابحث عن سورة</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 ابحث عن سورة…"
              className="q-search w-40 sm:w-56 p-2.5 pr-3 rounded-xl text-sm"
              style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", color: "var(--ink)" }}
            />
          </label>
        </div>

        <button
          onClick={() => {
            if (showFavs) {
              setShowFavs(false);
            } else {
              if (favorites.length === 0) {
                onToast("⭐ لسه مضيفش سور للمفضلة — دوس ☆ جنب أي سورة");
                return;
              }
              setShowFavs(true);
              setQuery("");
            }
          }}
          className="btn-ghost w-full py-2 text-xs mb-3"
          aria-pressed={showFavs}
        >
          {showFavs ? "📚 رجوع لكل السور" : "⭐ سوراي المفضلة"} ({toArabicDigits(favorites.length)})
        </button>

        <div className="q-surah-list max-h-[26rem] overflow-y-auto pl-1 space-y-1.5">
          {showFavs && !query.trim() ? (
            favorites.length ? (
              favorites.map((n) => {
                const s = SURAHS[n - 1];
                return (
                  <SurahRow
                    key={s.n}
                    surah={s}
                    active={s.n === surahNum}
                    playing={current?.surah === s.n && state === "playing"}
                    fav={true}
                    onPlay={() => pickSurah(s.n)}
                    onFav={() => toggleFavorite(s.n)}
                  />
                );
              })
            ) : (
              <p className="text-sm text-center py-6" style={{ color: "var(--ink-dim)" }}>
                لسه مضيفش سور — دوس ☆ جنب أي سورة تضيفها
              </p>
            )
          ) : filtered.length ? (
            filtered.map((s) => (
              <SurahRow
                key={s.n}
                surah={s}
                active={s.n === surahNum}
                playing={current?.surah === s.n && state === "playing"}
                fav={favorites.includes(s.n)}
                onPlay={() => pickSurah(s.n)}
                onFav={() => toggleFavorite(s.n)}
              />
            ))
          ) : (
            <p className="text-sm text-center py-6" style={{ color: "var(--ink-dim)" }}>
              مفيش نتائج لـ «{query}» — جرب اسم تاني
            </p>
          )}
        </div>
      </section>

      {/* إعدادات صغيرة */}
      <section className="glass-card p-4 flex items-center justify-between gap-3 flex-wrap" aria-label="خيارات التشغيل">
        <button
          onClick={() => setAutoNext((v) => !v)}
          className="btn-ghost px-4 py-2 text-xs"
          aria-pressed={autoNext}
        >
          {autoNext ? "✅" : "⬜"} تشغيل تلقائي للسورة اللي بعدها
        </button>
        <p className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>
          التلاوات من mp3quran.net — كل حاجة تتحفظ على جهازك
        </p>
      </section>
    </div>
  );
}

/* ---------------- صف سورة ---------------- */

function SurahRow({
  surah,
  active,
  playing,
  fav,
  onPlay,
  onFav,
}: {
  surah: { n: number; name: string; ayahs: number; place: string };
  active: boolean;
  playing: boolean;
  fav: boolean;
  onPlay: () => void;
  onFav: () => void;
}) {
  return (
    <div
      className="surah-row flex items-center gap-3 p-3 rounded-2xl transition-all"
      style={{
        background: active ? "color-mix(in srgb, var(--accent) 12%, var(--surface))" : "var(--surface)",
        border: active ? "1.5px solid var(--accent)" : "1px solid var(--surface-border)",
      }}
    >
      <span
        className="surah-num w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-xs font-extrabold"
        style={{
          background: active ? "var(--accent)" : "var(--surface-2)",
          color: active ? "var(--on-accent)" : "var(--ink-dim)",
        }}
      >
        {toArabicDigits(surah.n)}
      </span>
      <button onClick={onPlay} className="flex-1 text-right min-w-0" aria-label={`تشغيل سورة ${surah.name}`}>
        <span className="flex items-center gap-2">
          <span className="font-bold text-sm truncate" style={{ color: active ? "var(--accent)" : "var(--ink)" }}>
            {surah.name}
          </span>
          {playing && (
            <span className="eq inline-flex items-end gap-[2px] h-3.5" aria-hidden>
              <i /><i /><i />
            </span>
          )}
        </span>
        <span className="block text-[0.65rem] mt-0.5" style={{ color: "var(--ink-dim)" }}>
          {surah.place} • {toArabicDigits(surah.ayahs)} آية
        </span>
      </button>
      <button
        onClick={onFav}
        className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-base hover:scale-110 transition-transform"
        aria-label={fav ? `إزالة ${surah.name} من المفضلة` : `إضافة ${surah.name} للمفضلة`}
        style={{ color: fav ? "var(--accent2)" : "var(--ink-dim)" }}
      >
        {fav ? "⭐" : "☆"}
      </button>
    </div>
  );
}
