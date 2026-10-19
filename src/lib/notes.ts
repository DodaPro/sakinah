"use client";

/* =========================================================
   ملاحظاتي — نوتة بسيطة بتشيك بوكس وحذف وتذكيرات اختيارية
   namespace: sakinah.notes
   ========================================================= */

export interface NoteItem {
  id: string;
  text: string;
  done: boolean;
  created: number; // timestamp
  remindAt: number | null; // تذكير اختياري — ينبهك تنفذها
  deleteAt: number | null; // حذف تلقائي اختياري
  reminded: boolean; // وصل التنبيه؟
}

const K_NOTES = "sakinah.notes";

export function loadNotes(): NoteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(K_NOTES);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (n): n is NoteItem =>
        n && typeof n.id === "string" && typeof n.text === "string" && typeof n.done === "boolean"
    );
  } catch {
    return [];
  }
}

export function saveNotes(notes: NoteItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(K_NOTES, JSON.stringify(notes));
  } catch {}
}

export function newNoteId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** تحويل قيمة datetime-local إلى timestamp (نفس اليوم لو فاضي) */
export function localInputToTs(value: string): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return isNaN(ts) ? null : ts;
}

/** timestamp → قيمة datetime-local للإدخال */
export function tsToLocalInput(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** صيغة عرض لطيفة للتاريخ/الوقت */
export function fmtReminder(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "ص" : "م"}`;
  if (sameDay) return `اليوم ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `بكرة ${time}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${time}`;
}
