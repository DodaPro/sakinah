"use client";

/* =========================================================
   خطة ورد القرآن اليومية — ختمة مع تتبع وسلسلة
   namespace: sakinah.wird
   المصحف = ٦٠٤ صفحات
   ========================================================= */

/** مفتاح اليوم iso محلي */
function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const QURAN_PAGES = 604;

export interface WirdState {
  target: number; // صفحات في اليوم
  startedAt: string; // iso تاريخ بدء الخطة
  log: Record<string, number>; // iso → صفحات اليوم
}

const K_WIRD = "sakinah.wird";

export function loadWird(): WirdState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(K_WIRD);
    if (!raw) return null;
    const w = JSON.parse(raw);
    if (!w || typeof w.target !== "number" || w.target < 1 || typeof w.log !== "object") return null;
    return { target: w.target, startedAt: w.startedAt || isoOf(new Date()), log: w.log ?? {} };
  } catch {
    return null;
  }
}

export function saveWird(w: WirdState | null) {
  if (typeof window === "undefined") return;
  try {
    if (!w) window.localStorage.removeItem(K_WIRD);
    else window.localStorage.setItem(K_WIRD, JSON.stringify(w));
  } catch {}
}

/** إجمالي الصفحات المقروءة */
export function wirdTotal(w: WirdState): number {
  return Object.values(w.log).reduce((a, b) => a + (b || 0), 0);
}

/** سلسلة الأيام المتتالية اللي كمّلت الهدف (يبدأ من أمس؛ والنهاردة تتحسب لو كمّل) */
export function wirdStreak(w: WirdState, todayIso: string): number {
  let streak = 0;
  // النهاردة لو كمّل نعدّه
  const d = new Date(todayIso + "T00:00:00");
  if ((w.log[isoOf(d)] || 0) >= w.target) streak++;
  for (let i = 1; i < 4000; i++) {
    const dd = new Date(d);
    dd.setDate(dd.getDate() - i);
    const iso = isoOf(dd);
    if ((w.log[iso] || 0) >= w.target) streak++;
    else if ((w.log[iso] || 0) > 0 || i === 1) {
      // فيه صفحات بس ما كمّلتش، أو النهاردة لسه — نكمل للخلف برضو
      if (i === 1 && (w.log[iso] || 0) === 0) break;
      continue;
    } else break;
  }
  return streak;
}

/** متوسط وتيرة الصفحات آخر ٧ أيام */
export function wirdPace(w: WirdState, todayIso: string): number {
  let pages = 0;
  let days = 0;
  const d = new Date(todayIso + "T00:00:00");
  for (let i = 1; i <= 7; i++) {
    const dd = new Date(d);
    dd.setDate(dd.getDate() - i);
    const v = w.log[isoOf(dd)] || 0;
    if (v > 0) days++;
    pages += v;
  }
  return pages / 7; // متوسط يومي شامل أيام الراحة
}

/** تاريخ الختم المتوقع (iso) — على أساس الهدف اليومي لو مفيش وتيرة فعلية */
export function wirdProjection(w: WirdState, todayIso: string): string | null {
  const total = wirdTotal(w);
  const left = QURAN_PAGES - total;
  if (left <= 0) return todayIso;
  const pace = wirdPace(w, todayIso);
  const perDay = pace >= w.target * 0.5 ? pace : w.target;
  if (perDay <= 0) return null;
  const days = Math.ceil(left / perDay);
  const d = new Date(todayIso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return isoOf(d);
}
