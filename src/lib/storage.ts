import type { PrayerKey } from "./data";
import { FARD_KEYS, dayKey } from "./prayer";
import { clearPlannerStorage } from "./planner";

/* =========================================================
   طبقة التخزين المحلي (localStorage) — namespace: sakinah
   ========================================================= */

export interface AppSettings {
  theme: string;
  customAccent: string | null;
  customAccent2: string | null;
  mood: string | null;
  animations: boolean;
  bgAnim: boolean; // أنميشن الخلفية (نجوم وهالات)
  adhanEnabled: boolean;
  adhanVoice: string; // id من ADHAN_VOICES
  fajrVoice: string; // "same" أو id
  adhanVolume: number; // 0..1
  notifications: boolean;
  preAlertMinutes: number; // 0 = مغلق
  city: string; // id مدينة أو "custom"
  lat: number;
  lng: number;
  calcMethod: string;
  timeFormat: 12 | 24;
}

export type DayLog = Record<PrayerKey, boolean>;
export type Logs = Record<string, DayLog>;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "emerald-night",
  customAccent: null,
  customAccent2: null,
  mood: null,
  animations: true,
  bgAnim: true,
  adhanEnabled: true,
  adhanVoice: "madinah",
  fajrVoice: "fajr-cairo",
  adhanVolume: 0.85,
  notifications: false,
  preAlertMinutes: 5,
  city: "cairo",
  lat: 30.0444,
  lng: 31.2357,
  calcMethod: "egyptian",
  timeFormat: 12,
};

export interface PromptedMap {
  [date: string]: Record<string, boolean>;
}

/* ---------------- أدوات آمنة ---------------- */

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

/* ---------------- المفاتيح ---------------- */

const K_SETTINGS = "sakinah.settings";
const K_LOGS = "sakinah.logs";
const K_PROMPTED = "sakinah.prompted";
const K_ACHIEVEMENTS = "sakinah.achievements";
const K_BEST_STREAK = "sakinah.bestStreak";
const K_TASBIH = "sakinah.tasbih";

/* ---------------- الإعدادات ---------------- */

export function loadSettings(): AppSettings {
  const saved = read<Partial<AppSettings>>(K_SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(s: AppSettings) {
  write(K_SETTINGS, s);
}

export function applyThemeToDom(s: AppSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.animations = s.animations ? "on" : "off";
  if (s.customAccent) {
    root.style.setProperty("--accent", s.customAccent);
    root.style.setProperty("--glow", `${s.customAccent}59`);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--glow");
  }
  if (s.customAccent2) {
    root.style.setProperty("--accent2", s.customAccent2);
  } else {
    root.style.removeProperty("--accent2");
  }
}

/* ---------------- سجل الصلوات ---------------- */

export function emptyDayLog(): DayLog {
  return { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false };
}

export function loadLogs(): Logs {
  return read<Logs>(K_LOGS, {});
}

export function saveLogs(logs: Logs) {
  write(K_LOGS, logs);
}

export function getDayLog(logs: Logs, key: string): DayLog {
  return logs[key] ?? emptyDayLog();
}

/** عدد الصلوات المسجلة في اليوم */
export function dayCount(log: DayLog): number {
  return FARD_KEYS.reduce((acc, k) => acc + (log[k] ? 1 : 0), 0);
}

/** إجمالي كل الصلوات المسجلة */
export function totalPrayers(logs: Logs): number {
  return Object.values(logs).reduce((acc, log) => acc + dayCount(log), 0);
}

/** السلسلة الحالية للأيام الكاملة (من اليوم أو أمس للخلف) */
export function currentStreak(logs: Logs): number {
  let streak = 0;
  const d = new Date();
  // لو اليوم غير مكتمل نبدأ العدّ من أمس
  const today = getDayLog(logs, dayKey(d));
  if (dayCount(today) < 5) d.setDate(d.getDate() - 1);
  for (;;) {
    const log = getDayLog(logs, dayKey(d));
    if (dayCount(log) >= 5) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

/** أفضل سلسلة محفوظة */
export function loadBestStreak(): number {
  return read<number>(K_BEST_STREAK, 0);
}

export function saveBestStreak(n: number) {
  write(K_BEST_STREAK, n);
}

/* ---------------- التنبيهات المُطروحة ---------------- */

export function loadPrompted(): PromptedMap {
  return read<PromptedMap>(K_PROMPTED, {});
}

export function savePrompted(p: PromptedMap) {
  write(K_PROMPTED, p);
}

/* ---------------- الإنجازات ---------------- */

export function loadAchievements(): string[] {
  return read<string[]>(K_ACHIEVEMENTS, []);
}

export function saveAchievements(a: string[]) {
  write(K_ACHIEVEMENTS, a);
}

/* ---------------- السبحة ---------------- */

export interface TasbihState {
  total: number;
  presetIndex: number;
}

export function loadTasbih(): TasbihState {
  return read<TasbihState>(K_TASBIH, { total: 0, presetIndex: 0 });
}

export function saveTasbih(t: TasbihState) {
  write(K_TASBIH, t);
}

/* ---------------- مسح كل البيانات ---------------- */

export function resetAllData() {
  if (typeof window === "undefined") return;
  [
    K_SETTINGS,
    K_LOGS,
    K_PROMPTED,
    K_ACHIEVEMENTS,
    K_BEST_STREAK,
    K_TASBIH,
  ].forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {}
  });
  // بيانات التخطيط والتاسكات والتايمر (الدمج مع Challenge Planner)
  clearPlannerStorage();
}

/* ---------------- XP ---------------- */

export function xpForLogs(logs: Logs): number {
  // ١٠ لكل صلاة + ٢٥ بونص لكل يوم كامل
  let xp = 0;
  for (const log of Object.values(logs)) {
    const c = dayCount(log);
    xp += c * 10;
    if (c >= 5) xp += 25;
  }
  return xp;
}

export function levelFromXp(xp: number): { level: number; inLevel: number; needed: number } {
  const level = Math.floor(xp / 100) + 1;
  const inLevel = xp % 100;
  return { level, inLevel, needed: 100 };
}
