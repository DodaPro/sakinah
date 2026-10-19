"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toArabicDigits } from "@/lib/prayer";

/* =========================================================
   حصن المسلم — أبواب الأذكار والأدعية الكاملة (١٣٣ بابًا)
   البيانات تُحمّل عند الفتح من /data/hisn.json + صوت لكل باب
   ========================================================= */

interface HisnDua {
  text: string;
  count: number;
  ref: string;
}

interface HisnChapter {
  title: string;
  audio: string;
  items: HisnDua[];
}

/** إزالة التشكيل للمقارنة في البحث */
function stripTashkeel(s: string): string {
  return s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "");
}

export default function HisnSection() {
  const [chapters, setChapters] = useState<HisnChapter[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/data/hisn.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("404"))))
      .then((d: HisnChapter[]) => {
        if (alive && Array.isArray(d) && d.length) setChapters(d);
        else if (alive) setError(true);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const filtered = useMemo(() => {
    if (!chapters) return [];
    const q = stripTashkeel(query.trim());
    if (!q) return chapters;
    return chapters
      .map((c) => {
        const inTitle = stripTashkeel(c.title).includes(q);
        if (inTitle) return c;
        const items = c.items.filter((i) => stripTashkeel(i.text).includes(q));
        return items.length ? { ...c, items } : null;
      })
      .filter((c): c is HisnChapter => c !== null);
  }, [chapters, query]);

  const toggleChapterAudio = (idx: number, url: string) => {
    try {
      if (playingIdx === idx && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingIdx(null);
        return;
      }
      audioRef.current?.pause();
      const a = new Audio(url);
      audioRef.current = a;
      setPlayingIdx(idx);
      a.play().catch(() => {
        setPlayingIdx(null);
        audioRef.current = null;
      });
      a.onended = () => {
        setPlayingIdx(null);
        audioRef.current = null;
      };
    } catch {
      setPlayingIdx(null);
    }
  };

  const copyDua = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text.slice(0, 30));
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center animate-rise" aria-label="حصن المسلم">
        <div className="text-5xl mb-3">🏰</div>
        <p className="font-bold" style={{ color: "var(--ink)" }}>
          حصلت مشكلة في تحميل بيانات الحصن
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--ink-dim)" }}>
          اتأكد من النت وجرّب تحديث الصفحة
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-label="حصن المسلم">
      {/* الرأس */}
      <section className="hero-card p-5 sm:p-7 animate-rise">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--ink-dim)" }}>
              🏰 الأذكار والأدعية الثابتة في كل يوم وليلة — من كتاب حصن المسلم كاملًا
            </p>
            <h2 className="font-quran text-2xl sm:text-3xl font-bold" style={{ color: "var(--accent2)" }}>
              حصن المسلم
            </h2>
          </div>
          {chapters && (
            <span className="chip text-sm">
              {toArabicDigits(chapters.length)} بابًا
            </span>
          )}
        </div>

        <label className="block">
          <span className="sr-only">ابحث في الأذكار والأبواب</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 ابحث عن باب أو ذكر… (مثال: السفر، النوم، الهم)"
            className="q-search w-full p-3 pr-4 rounded-2xl text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", color: "var(--ink)" }}
          />
        </label>
      </section>

      {/* قائمة الأبواب */}
      {!chapters ? (
        <section className="glass-card p-10 text-center" aria-label="جارٍ التحميل">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin mx-auto"
            style={{ borderColor: "var(--surface-border)", borderTopColor: "var(--accent)" }}
          />
          <p className="text-sm mt-3" style={{ color: "var(--ink-dim)" }}>
            جارٍ تحميل أبواب الحصن…
          </p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="glass-card p-8 text-center">
          <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
            مفيش نتائج لـ «{query}» — جرّب كلمة تانية
          </p>
        </section>
      ) : (
        <section className="space-y-2.5" aria-label="أبواب حصن المسلم">
          {filtered.map((c) => {
            const realIdx = chapters.indexOf(c);
            const isOpen = open === realIdx;
            return (
              <article key={c.title} className="glass-card overflow-hidden animate-rise">
                {/* رأس الباب */}
                <button
                  onClick={() => setOpen(isOpen ? null : realIdx)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 p-4 sm:p-5 text-right"
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold"
                    style={{ background: "var(--surface-2)", color: "var(--ink-dim)" }}
                  >
                    {toArabicDigits(realIdx + 1)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm sm:text-base" style={{ color: "var(--ink)" }}>
                      {c.title}
                    </span>
                    <span className="block text-[0.68rem] mt-0.5" style={{ color: "var(--ink-dim)" }}>
                      {toArabicDigits(c.items.length)} {c.items.length === 1 ? "ذكر" : "أذكار"}
                      {c.audio && " • فيه صوت"}
                    </span>
                  </span>
                  <span className="text-sm shrink-0" style={{ color: "var(--ink-dim)" }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {/* محتوى الباب */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 space-y-3 animate-fade-swap">
                    {c.audio && (
                      <button
                        onClick={() => toggleChapterAudio(realIdx, c.audio)}
                        className="btn-ghost w-full py-2 text-xs"
                        aria-label={playingIdx === realIdx ? "إيقاف صوت الباب" : "تشغيل صوت الباب"}
                      >
                        {playingIdx === realIdx ? "⏹ إيقاف الصوت" : "🔊 اسمع الباب كامل"}
                      </button>
                    )}
                    {c.items.map((d, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl"
                        style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}
                      >
                        <p className="font-quran text-lg leading-loose" style={{ color: "var(--ink)" }}>
                          {d.text}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {d.count > 1 && (
                              <span className="chip" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
                                × {toArabicDigits(d.count)}
                              </span>
                            )}
                            {d.ref && (
                              <span className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>
                                📚 {d.ref}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => copyDua(d.text)}
                            className="btn-ghost px-3 py-1.5 text-[0.68rem] shrink-0"
                            aria-label="نسخ الذكر"
                          >
                            {copied === d.text.slice(0, 30) ? "✅ اتنسخ" : "📋 نسخ"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      <p className="text-[0.68rem] text-center" style={{ color: "var(--ink-dim)" }}>
        من كتاب حصن المسلم للشيخ سعيد بن علي بن وهف القحطاني — الصوت من islamway
      </p>
    </div>
  );
}
