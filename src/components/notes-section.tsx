"use client";

import { useEffect, useRef, useState } from "react";
import {
  fmtReminder,
  loadNotes,
  localInputToTs,
  newNoteId,
  saveNotes,
  tsToLocalInput,
} from "@/lib/notes";
import type { NoteItem } from "@/lib/notes";
import { pushNotification, notifySupported } from "@/lib/notify";
import { toArabicDigits } from "@/lib/prayer";

/* =========================================================
   ملاحظاتي — نوتة بسيطة:
   • شيك بوكس (خلصتها ولا لأ) + حذف
   • اختياري: موعد تنبيه — ينبّهك بالملاحظة
   • اختياري: موعد حذف تلقائي
   ========================================================= */

export default function NotesSection({ onToast }: { onToast: (msg: string) => void }) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [text, setText] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [deleteAt, setDeleteAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  const persist = (next: NoteItem[]) => {
    setNotes(next);
    saveNotes(next);
  };

  /* ---------------- فاحص التذكيرات والحذف التلقائي ---------------- */
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const cur = loadNotes();
      let changed = false;

      // تنبيهات مستحقة
      const due = cur.filter((n) => n.remindAt && n.remindAt <= now && !n.done && !n.reminded && !notifiedRef.current.has(n.id));
      if (due.length) {
        for (const n of due) {
          notifiedRef.current.add(n.id);
          n.reminded = true;
          changed = true;
        }
        const msg = due.length === 1 ? due[0].text.slice(0, 60) : `${due.length} ملاحظات`;
        pushNotification("📝 وصل وقت ملاحظة!", msg);
        onToast(`⏰ تذكير: ${msg}`);
      }

      // حذف تلقائي
      const kept = cur.filter((n) => {
        if (n.deleteAt && n.deleteAt <= now) {
          changed = true;
          return false;
        }
        return true;
      });

      if (changed) {
        persist(kept);
        if (kept.length < cur.length) onToast("🗑️ اتمسحت ملاحظة تلقائيًا حسب الموعد اللي حددته");
      }
    };

    const i = setInterval(tick, 15000);
    return () => clearInterval(i);
  }, []);

  /* ---------------- الإضافة ---------------- */
  const addNote = () => {
    const t = text.trim();
    if (!t) return;
    const note: NoteItem = {
      id: newNoteId(),
      text: t,
      done: false,
      created: Date.now(),
      remindAt: localInputToTs(remindAt),
      deleteAt: localInputToTs(deleteAt),
      reminded: false,
    };
    // نرتب: غير المنجزة أولاً (الأحدث فوق)، ثم المنجزة
    persist([note, ...notes]);
    setText("");
    setRemindAt("");
    setDeleteAt("");
    setShowAdvanced(false);
    if (note.remindAt) onToast(`⏰ تمام — هنبّهك ${fmtReminder(note.remindAt)}`);
    if (note.deleteAt) onToast(`🗑️ هتتمسح تلقائيًا ${fmtReminder(note.deleteAt)}`);
    if (note.remindAt && notifySupported() && Notification.permission === "default") {
      onToast("💡 فعّل إشعارات المتصفح من الإعدادات ليوصلك التنبيه حتى لو التاب مخفي");
    }
  };

  const toggleDone = (id: string) => {
    persist(notes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)));
  };

  const removeNote = (id: string) => {
    persist(notes.filter((n) => n.id !== id));
  };

  const sorted = [...notes].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.created - a.created;
  });
  const pending = notes.filter((n) => !n.done).length;

  return (
    <div className="space-y-4" aria-label="ملاحظاتي">
      {/* الرأس + الإضافة */}
      <section className="hero-card p-5 sm:p-7 animate-rise">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--ink-dim)" }}>
              📝 اكتب ملاحظاتك وذاكِرك — مع تنبيه بالميعاد لو حبيت
            </p>
            <h2 className="font-quran text-2xl sm:text-3xl font-bold" style={{ color: "var(--accent2)" }}>
              ملاحظاتي
            </h2>
          </div>
          <span className="chip text-sm">
            {toArabicDigits(pending)} متبقية
          </span>
        </div>

        <label className="block">
          <span className="sr-only">اكتب ملاحظة</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote();
            }}
            placeholder="اكتب ملاحظتك هنا… (مثال: أذاكر المحاضرة ٣ / أتصل بالعم خالد)"
            rows={3}
            className="w-full p-3.5 rounded-2xl text-sm leading-relaxed resize-y min-h-[72px]"
            style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", color: "var(--ink)" }}
            aria-label="نص الملاحظة"
          />
        </label>

        {/* خيارات متقدمة اختيارية */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="btn-ghost w-full py-2 text-xs mt-2"
          aria-expanded={showAdvanced}
        >
          ⏰ تذكير أو حذف تلقائي {showAdvanced ? "▲" : "(اختياري) ▼"}
        </button>

        {showAdvanced && (
          <div className="grid sm:grid-cols-2 gap-2.5 mt-2.5 animate-fade-swap">
            <label className="block p-3 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
              <span className="block text-xs font-bold mb-1.5" style={{ color: "var(--ink)" }}>
                ⏰ نبّهني بيها في ميعاد…
              </span>
              <input
                type="datetime-local"
                value={remindAt}
                min={tsToLocalInput(Date.now())}
                onChange={(e) => setRemindAt(e.target.value)}
                className="w-full text-xs p-2 rounded-xl"
                style={{ background: "var(--surface-2)", border: "1px solid var(--surface-border)", color: "var(--ink)" }}
                aria-label="موعد التذكير بالملاحظة"
              />
            </label>
            <label className="block p-3 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
              <span className="block text-xs font-bold mb-1.5" style={{ color: "var(--ink)" }}>
                🗑️ امسحها تلقائيًا في ميعاد…
              </span>
              <input
                type="datetime-local"
                value={deleteAt}
                min={tsToLocalInput(Date.now())}
                onChange={(e) => setDeleteAt(e.target.value)}
                className="w-full text-xs p-2 rounded-xl"
                style={{ background: "var(--surface-2)", border: "1px solid var(--surface-border)", color: "var(--ink)" }}
                aria-label="موعد الحذف التلقائي للملاحظة"
              />
            </label>
          </div>
        )}

        <button
          onClick={addNote}
          disabled={!text.trim()}
          className="btn-accent w-full py-3 mt-2.5 disabled:opacity-50"
          aria-label="إضافة الملاحظة"
        >
          ➕ أضف الملاحظة {text.trim() && remindAt ? "مع التنبيه" : ""}
        </button>
      </section>

      {/* الملاحظات */}
      {sorted.length === 0 ? (
        <section className="glass-card p-10 text-center" aria-label="مفيش ملاحظات">
          <div className="text-5xl mb-3 animate-float">🗒️</div>
          <p className="font-bold" style={{ color: "var(--ink)" }}>
            مفيش ملاحظات لسه
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--ink-dim)" }}>
            اكتب أول ملاحظة فوق — تقدر تضيفها من غير أي ميعادات، أو حدد لها تذكير
          </p>
        </section>
      ) : (
        <section className="space-y-2.5" aria-label="قائمة الملاحظات">
          {sorted.map((n) => (
            <article
              key={n.id}
              className="glass-card p-4 animate-rise"
              style={{
                borderColor: n.done ? undefined : n.remindAt && n.remindAt <= Date.now() ? "var(--accent2)" : undefined,
                opacity: n.done ? 0.65 : 1,
              }}
              aria-label={n.done ? "ملاحظة منجزة" : "ملاحظة"}
            >
              <div className="flex items-start gap-3">
                {/* شيك بوكس */}
                <button
                  onClick={() => toggleDone(n.id)}
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all active:scale-90 mt-0.5"
                  style={{
                    background: n.done ? "var(--accent)" : "var(--surface-2)",
                    border: n.done ? "none" : "1.5px dashed var(--surface-border)",
                    color: "var(--on-accent)",
                  }}
                  role="checkbox"
                  aria-checked={n.done}
                  aria-label={n.done ? "إلغاء إنجاز الملاحظة" : "تمّت الملاحظة"}
                  title={n.done ? "رجّعها غير منجزة" : "خلصتها ✅"}
                >
                  {n.done ? "✓" : ""}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={{
                      color: "var(--ink)",
                      textDecoration: n.done ? "line-through" : "none",
                    }}
                  >
                    {n.text}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    {n.remindAt && !n.done && (
                      <span
                        className="text-[0.66rem] font-bold"
                        style={{
                          color: n.reminded ? "var(--ink-dim)" : "var(--accent2)",
                        }}
                      >
                        {n.reminded ? "🔔 اتذكّرت" : "⏰"} {fmtReminder(n.remindAt)}
                      </span>
                    )}
                    {n.deleteAt && (
                      <span className="text-[0.66rem]" style={{ color: "var(--ink-dim)" }}>
                        🗑️ حذف تلقائي: {fmtReminder(n.deleteAt)}
                      </span>
                    )}
                    <button
                      onClick={() => removeNote(n.id)}
                      className="btn-ghost px-2.5 py-1 text-[0.66rem] mr-auto"
                      aria-label={`حذف الملاحظة`}
                      title="حذف الملاحظة"
                      style={{ color: "#f87171", borderColor: "rgba(239,68,68,0.35)" }}
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <p className="text-[0.68rem] text-center" style={{ color: "var(--ink-dim)" }}>
        💡 التذكيرات شغالة والموقع مفتوح (حتى في تاب تاني) — وبياناتك محفوظة على جهازك فقط
      </p>
    </div>
  );
}
