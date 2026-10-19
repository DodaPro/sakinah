import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  PrayerTimes,
  Qibla,
  HighLatitudeRule,
} from "adhan";
import { CALC_METHODS } from "./data";
import type { PrayerKey } from "./data";

/** يبني معاملات الحساب حسب طريقة المستخدم */
export function buildParams(methodId: string): CalculationParameters {
  const method = CALC_METHODS.find((m) => m.id === methodId) ?? CALC_METHODS[0];
  let params: CalculationParameters;
  switch (method.id) {
    case "makkah":
      params = CalculationMethod.UmmAlQura();
      break;
    case "karachi":
      params = CalculationMethod.Karachi();
      break;
    case "isna":
      params = CalculationMethod.NorthAmerica();
      break;
    case "dubai":
      params = CalculationMethod.Dubai();
      break;
    case "kuwait":
      params = CalculationMethod.Kuwait();
      break;
    case "qatar":
      params = CalculationMethod.Qatar();
      break;
    case "turkey":
      params = CalculationMethod.Turkey();
      break;
    case "tehran":
      params = CalculationMethod.Tehran();
      break;
    case "moonsighting":
      params = CalculationMethod.MoonsightingCommittee();
      break;
    case "egyptian":
    default:
      params = CalculationMethod.Egyptian();
      break;
  }
  params.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight;
  return params;
}

export interface DayTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

/** يحسب مواقيت يوم كامل بإحداثيات وطريقة محددة */
export function computeDayTimes(date: Date, lat: number, lng: number, methodId: string): DayTimes {
  const coords = new Coordinates(lat, lng);
  const pt = new PrayerTimes(coords, date, buildParams(methodId));
  return {
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

/** اتجاه القبلة بالدرجات من الشمال الحقيقي */
export function qiblaBearing(lat: number, lng: number): number {
  return Qibla(new Coordinates(lat, lng));
}

/** مفاتيح الصلوات فقط (بدون الشروق) */
export const FARD_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export function prayerDate(times: DayTimes, key: PrayerKey): Date {
  return times[key];
}

/** الصلاة القادمة من الآن */
export function nextPrayer(
  times: DayTimes,
  now: Date
): { key: PrayerKey; at: Date } {
  for (const key of FARD_KEYS) {
    if (times[key] > now) return { key, at: times[key] };
  }
  return { key: "fajr", at: times.fajr };
}

/** آخر صلاة (فريضة) مضت وقتها */
export function lastPrayer(times: DayTimes, now: Date): { key: PrayerKey; at: Date } | null {
  let last: { key: PrayerKey; at: Date } | null = null;
  for (const key of FARD_KEYS) {
    if (times[key] <= now) last = { key, at: times[key] };
  }
  return last;
}

/* ---------------- تنسيقات ---------------- */

const AR_NUM = "٠١٢٣٤٥٦٧٨٩";

export function toArabicDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => AR_NUM[Number(d)]);
}

/** تنسيق وقت صلاة بصيغة عربية */
export function formatPrayerTime(d: Date, hour12: boolean): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  };
  try {
    return new Intl.DateTimeFormat("ar-EG", opts).format(d);
  } catch {
    const h = d.getHours();
    const m = d.getMinutes();
    const mm = String(m).padStart(2, "0");
    if (!hour12) return toArabicDigits(`${String(h).padStart(2, "0")}:${mm}`);
    const suffix = h >= 12 ? "م" : "ص";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return toArabicDigits(`${h12}:${mm} ${suffix}`);
  }
}

/** الساعة الحالية */
export function formatClock(d: Date, hour12: boolean, withSeconds = true): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12,
  };
  try {
    return new Intl.DateTimeFormat("ar-EG", opts).format(d);
  } catch {
    return toArabicDigits(d.toLocaleTimeString());
  }
}

/** تاريخ هجري + ميلادي */
export function formatDateLine(d: Date): { hijri: string; gregorian: string } {
  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("ar-EG-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    }).format(d);
  } catch {
    try {
      hijri = new Intl.DateTimeFormat("ar-EG-u-ca-islamic", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      hijri = "";
    }
  }
  const gregorian = new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(d);
  return { hijri, gregorian };
}

/** تحويل فرق ميلي ثانية إلى عدّاد ٠٠:٠٠:٠٠ */
export function formatCountdown(ms: number): { h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => toArabicDigits(String(n).padStart(2, "0"));
  return { h: pad(h), m: pad(m), s: pad(s) };
}

/** مفتاح اليوم المحلي YYYY-MM-DD */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** تحويل أي تاريخ إلى ظهيرة نفس اليوم لتقليل مشاكل المناطق الزمنية عند الحساب */
export function noonOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/** تحية حسب الوقت */
export function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h >= 4 && h < 12) return "صباح الخير ✨";
  if (h >= 12 && h < 17) return "نهارك سعيد 🌤️";
  if (h >= 17 && h < 21) return "مساء الخير 🌙";
  return "ليلة مباركة 🌌";
}
