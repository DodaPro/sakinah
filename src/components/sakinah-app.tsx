"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ADHAN_VOICES,
  ACHIEVEMENTS,
  ATHKAR,
  CITIES,
  PRAYER_NAMES,
  PRAYER_ORDER,
  VERSES,
  XP_DAY_BONUS,
  XP_PER_PRAYER,
} from "@/lib/data";
import type { PrayerKey } from "@/lib/data";
import {
  FARD_KEYS,
  computeDayTimes,
  dayKey,
  formatClock,
  formatCountdown,
  formatDateLine,
  formatPrayerTime,
  greetingFor,
  lastPrayer,
  nextPrayer,
  toArabicDigits,
} from "@/lib/prayer";
import type { DayTimes } from "@/lib/prayer";
import {
  applyThemeToDom,
  currentStreak,
  dayCount,
  emptyDayLog,
  getDayLog,
  loadBestStreak,
  loadLogs,
  loadPrompted,
  loadSettings,
  saveBestStreak,
  saveLogs,
  savePrompted,
  saveSettings,
} from "@/lib/storage";
import type { AppSettings, Logs, PromptedMap } from "@/lib/storage";
import { useAdhanPlayer } from "@/lib/use-adhan";
import {
  XP_PER_BADGE,
  loadBadgeXp,
  loadMainTab,
  plannerMetrics,
  saveBadgeXp,
  saveMainTab,
  studyXp,
  tasksXp,
  usePlanner,
} from "@/lib/planner";
import type { MainTab, PlannerState } from "@/lib/planner";
import Fireworks from "./fireworks";
import PrayerModal from "./prayer-modal";
import CongratsOverlay from "./congrats-overlay";
import SettingsPanel from "./settings-panel";
import QiblaCompass from "./qibla-compass";
import TasbihCard from "./tasbih-card";
import StatsSection from "./stats-section";
import FocusSection from "./focus-section";
import AchievementsSection from "./achievements-section";
import QuranSection from "./quran-section";
import AzkarSection from "./azkar-section";
import HisnSection from "./hisn-section";
import WirdSection from "./wird-section";
import NotesSection from "./notes-section";
import AnimatedBackground from "./animated-background";
import { findReciter, ayahAudioUrl, loadReciterId } from "@/lib/quran";

const PRAYER_EMOJI: Record<PrayerKey | "sunrise", string> = {
  fajr: "🌅",
  dhuhr: "☀️",
  asr: "🌤️",
  maghrib: "🌆",
  isha: "🌙",
  sunrise: "🌄",
};

const WINDOW_MS = 75 * 60 * 1000; // نافذة سؤال "هل صليت" بعد الأذان
const SNOOZE_MS = 10 * 60 * 1000;

interface ConfirmState {
  key: PrayerKey;
  action: "mark" | "unmark";
}

interface CongratsState {
  prayer: PrayerKey;
  xp: number;
  streak: number;
  newAch: string[];
}

/** يفحص الإنجازات المحققة (الصلوات + التحدي المدمج) ويحفظ الجديد منها */
function checkAchievements(logs: Logs, planner: PlannerState | null, best: number): string[] {
  const total = Object.values(logs).reduce((a, log) => a + dayCount(log), 0);
  const fullDays = Object.values(logs).filter((l) => dayCount(l) >= 5).length;
  const streak = currentStreak(logs);
  const bestVal = Math.max(streak, best);
  const fajrCount = Object.values(logs).filter((l) => l.fajr).length;
  const xp = Object.values(logs).reduce(
    (a, log) => a + dayCount(log) * 10 + (dayCount(log) >= 5 ? 25 : 0),
    0
  );
  const unlocked: string[] = [];
  const add = (id: string, cond: boolean) => cond && unlocked.push(id);
  add("first-prayer", total >= 1);
  add("full-day", fullDays >= 1);
  add("streak-3", bestVal >= 3);
  add("streak-7", bestVal >= 7);
  add("streak-30", bestVal >= 30);
  add("prayers-50", total >= 50);
  add("prayers-100", total >= 100);
  add("fajr-master", fajrCount >= 5);
  add("week-perfect", fullDays >= 7);
  add("level-5", xp >= 400);
  // أوسمة التاسكات والتايمر (الدمج مع Challenge Planner)
  if (planner) {
    const m = plannerMetrics(planner);
    add("first-task", m.done >= 1);
    add("task-day", m.fullDays >= 1);
    add("study-1h", m.study >= 3600);
    add("tasks-streak-3", m.best >= 3);
    add("units-10", m.units >= 10);
    add("study-10h", m.study >= 36000);
    add("task-half", m.pct >= 50);
    add("units-50", m.units >= 50);
    add("study-25h", m.study >= 90000);
    add("course-done", m.courseDone);
    add("all-tasks", m.total > 0 && m.done === m.total);
  }
  return unlocked;
}

export default function SakinahApp() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
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
  });
  const [logs, setLogs] = useState<Logs>({});
  const [prompted, setPrompted] = useState<PromptedMap>({});
  const [now, setNow] = useState(() => new Date());
  const [activePrayer, setActivePrayer] = useState<PrayerKey | null>(null);
  const [stage, setStage] = useState<"ask" | "encourage">("ask");
  const [congrats, setCongrats] = useState<CongratsState | null>(null);
  const [fireworksOn, setFireworksOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adhanBlocked, setAdhanBlocked] = useState(false);
  const [adhanTesting, setAdhanTesting] = useState(false);
  const [athkarIdx, setAthkarIdx] = useState(0);
  const [verseIdx, setVerseIdx] = useState(0);
  const [mainTab, setMainTab] = useState<MainTab>("home");
  const [badgeXp, setBadgeXp] = useState(0);
  const [, forceBadge] = useState(0);
  const [versePlaying, setVersePlaying] = useState(false);
  const verseAudioRef = useRef<HTMLAudioElement | null>(null);
  const mainTabRef = useRef(mainTab);
  mainTabRef.current = mainTab;
  const quranBusyRef = useRef(false);
  const firstVerseRun = useRef(true);

  const plannerApi = usePlanner();
  const { planner } = plannerApi;
  const plannerRef = useRef(planner);
  plannerRef.current = planner;

  const snoozeRef = useRef<Partial<Record<PrayerKey, number>>>({});
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const player = useAdhanPlayer();
  const playerRef = useRef(player);
  playerRef.current = player;

  const bestStreak = useRef(0);
  const [, forceBest] = useState(0);

  /* ---------------- التحميل الأولي ---------------- */
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    applyThemeToDom(s);
    const l = loadLogs();
    setLogs(l);
    setPrompted(loadPrompted());
    bestStreak.current = loadBestStreak();
    // نضيف السلسلة الحالية للأفضل
    const st = currentStreak(l);
    if (st > bestStreak.current) {
      bestStreak.current = st;
      saveBestStreak(st);
    }
    forceBest((x) => x + 1);
    // استعادة حالة السبحة
    setAthkarIdx(Math.floor(Math.random() * ATHKAR.length));
    setVerseIdx(Math.floor(Math.random() * VERSES.length));
    setMainTab(loadMainTab());
    setBadgeXp(loadBadgeXp());
    setMounted(true);
  }, []);

  /* ---------------- حفظ وتطبيق الإعدادات ---------------- */
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      applyThemeToDom(next);
      return next;
    });
    if (patch.notifications === true && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  /* ---------------- ساعة حيّة ---------------- */
  useEffect(() => {
    if (!mounted) return;
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, [mounted]);

  /* ---------------- استماع لمنع التشغيل التلقائي ---------------- */
  useEffect(() => {
    const h = () => setAdhanBlocked(true);
    window.addEventListener("adhan-blocked", h);
    return () => window.removeEventListener("adhan-blocked", h);
  }, []);

  /* ---------------- استماع لحالة صوت القرآن (لمنع تداخل التلاوة مع الآية) ---------------- */
  useEffect(() => {
    const h = (e: Event) => {
      quranBusyRef.current = !!(e as CustomEvent).detail?.playing;
    };
    window.addEventListener("sakinah:quran-playing", h);
    return () => window.removeEventListener("sakinah:quran-playing", h);
  }, []);

  /* ---------------- المواقيت ---------------- */
  const nowKey = dayKey(now);
  const times: DayTimes | null = useMemo(() => {
    if (!mounted) return null;
    try {
      return computeDayTimes(now, settings.lat, settings.lng, settings.calcMethod);
    } catch {
      return null;
    }
  }, [mounted, nowKey, settings.lat, settings.lng, settings.calcMethod]);

  const next = useMemo(() => {
    if (!times) return null;
    const n = nextPrayer(times, now);
    if (n.key === "fajr" && times.fajr <= now) {
      const t = new Date(now);
      t.setDate(t.getDate() + 1);
      try {
        const t2 = computeDayTimes(t, settings.lat, settings.lng, settings.calcMethod);
        return { key: "fajr" as PrayerKey, at: t2.fajr };
      } catch {
        return n;
      }
    }
    return n;
  }, [times, now, settings.lat, settings.lng, settings.calcMethod]);

  /* ---------------- إشعارات المتصفح ---------------- */
  const notify = useCallback((title: string, body: string) => {
    try {
      if (
        settingsRef.current.notifications &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(title, { body });
      }
    } catch {}
  }, []);

  const markPrompted = useCallback((tk: string, key: string) => {
    setPrompted((prev) => {
      const next = { ...prev, [tk]: { ...(prev[tk] ?? {}), [key]: true } };
      savePrompted(next);
      return next;
    });
  }, []);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  /* ---------------- تشغيل الأذان لصلاة معينة ---------------- */
  const playAdhanFor = useCallback((key: PrayerKey) => {
    const s = settingsRef.current;
    if (!s.adhanEnabled) return;
    const voiceId =
      key === "fajr" && s.fajrVoice !== "same" ? s.fajrVoice : s.adhanVoice;
    const voice = ADHAN_VOICES.find((v) => v.id === voiceId) ?? ADHAN_VOICES[0];
    player.play(voice.file, s.adhanVolume);
    setAdhanBlocked(false);
  }, [player]);

  /* ---------------- فحص أوقات الصلاة (قلب النظام) ---------------- */
  useEffect(() => {
    if (!mounted || !times) return;
    if (activePrayer || congrats) return;

    const tk = nowKey;
    const dayPrompted = prompted[tk] ?? {};
    const dayLog = getDayLog(logs, tk);

    for (const key of FARD_KEYS) {
      const at = times[key].getTime();
      const diff = now.getTime() - at;

      // تنبيه مبكر قبل الأذان
      const pre = settingsRef.current.preAlertMinutes;
      if (pre > 0 && diff < 0 && diff >= -pre * 60000 && !dayPrompted[`${key}-pre`]) {
        markPrompted(tk, `${key}-pre`);
        const mins = Math.round(-diff / 60000) || 1;
        notify(
          `⏳ باقي شوية على صلاة ${PRAYER_NAMES[key]}`,
          `باقي ${mins} دقيقة — جهّز نفسك للصلاة`
        );
        showToast(`⏳ باقي ${toArabicDigits(mins)} دقيقة على صلاة ${PRAYER_NAMES[key]}`);
        break;
      }

      // نافذة "هل صليت؟"
      if (diff >= 0 && diff < WINDOW_MS && !dayLog[key]) {
        const wasPrompted = !!dayPrompted[key];
        const snoozeUntil = snoozeRef.current[key] ?? 0;
        const snoozeExpired = snoozeUntil > 0 && now.getTime() >= snoozeUntil;
        if (!wasPrompted || snoozeExpired) {
          if (snoozeExpired) snoozeRef.current[key] = 0;
          setActivePrayer(key);
          setStage("ask");
          markPrompted(tk, key);
          playAdhanFor(key);
          notify(`🕌 حان وقت صلاة ${PRAYER_NAMES[key]}`, "افتح الموقع وسجّل صلاتك");
          break;
        }
      }
    }
  }, [
    mounted, times, now, nowKey, activePrayer, congrats, logs, prompted,
    markPrompted, playAdhanFor, notify, showToast,
  ]);

  /* ---------------- تدوير الأذكار والآيات كل دقيقة ---------------- */
  useEffect(() => {
    if (!mounted) return;
    const a = setInterval(() => setAthkarIdx((x) => (x + 1) % ATHKAR.length), 60000);
    const vTimer = setTimeout(() => {
      setVerseIdx((x) => (x + 1) % VERSES.length);
      const v = setInterval(() => setVerseIdx((x) => (x + 1) % VERSES.length), 60000);
      return () => clearInterval(v);
    }, 30000);
    return () => {
      clearInterval(a);
      clearTimeout(vTimer);
    };
  }, [mounted]);

  /* ---------------- مسح التوست ---------------- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------------- مزامنة الإنجازات الموحدة (صلوات + تاسكات + تايمر) ---------------- */
  useEffect(() => {
    if (!mounted || !plannerApi.plannerMounted) return;
    const all = checkAchievements(logs, planner, bestStreak.current);
    let stored: string[] = [];
    try {
      const raw = window.localStorage.getItem("sakinah.achievements");
      if (raw) stored = JSON.parse(raw);
    } catch {}
    const newOnes = all.filter((id) => !stored.includes(id));
    if (newOnes.length) {
      try {
        window.localStorage.setItem("sakinah.achievements", JSON.stringify(all));
      } catch {}
      const bx = loadBadgeXp() + newOnes.length * XP_PER_BADGE;
      saveBadgeXp(bx);
      setBadgeXp(bx);
      forceBadge((x) => x + 1);
      const names = newOnes
        .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id)
        .join("، ");
      showToast(`🏅 إنجاز جديد: ${names} (+${toArabicDigits(newOnes.length * XP_PER_BADGE)} XP)`);
    }
  }, [mounted, plannerApi.plannerMounted, logs, planner, showToast]);

  /* ---------------- تبويب رئيسي ---------------- */
  const switchMainTab = useCallback((t: MainTab) => {
    setMainTab(t);
    saveMainTab(t);
  }, []);

  /* ---------------- إيقاف الألعاب النارية ---------------- */
  const stopFireworks = useCallback(() => setFireworksOn(false), []);

  /* ---------------- تسجيل الصلاة ---------------- */
  const commitPrayer = useCallback(
    (key: PrayerKey, source: "modal" | "manual") => {
      const tk = dayKey(new Date());
      const updated: Logs = {
        ...logs,
        [tk]: { ...(getDayLog(logs, tk)), [key]: true },
      };
      setLogs(updated);
      saveLogs(updated);

      const st = currentStreak(updated);
      if (st > bestStreak.current) {
        bestStreak.current = st;
        saveBestStreak(st);
      }
      forceBest((x) => x + 1);

      // الإنجازات الجديدة فقط (للعرض في التهنئة) — الحفظ ومنح XP بيتعمل في effect المزامنة
      const saved = new Set<string>();
      try {
        const raw = window.localStorage.getItem("sakinah.achievements");
        if (raw) JSON.parse(raw).forEach((id: string) => saved.add(id));
      } catch {}
      const newOnes = checkAchievements(updated, plannerRef.current, bestStreak.current).filter(
        (id) => !saved.has(id)
      );

      const dayTotal = dayCount(updated[tk]);
      const gain =
        XP_PER_PRAYER + (dayTotal >= 5 ? XP_DAY_BONUS : 0) + (source === "manual" ? 0 : 0);

      setFireworksOn(settingsRef.current.animations);
      setCongrats({ prayer: key, xp: gain, streak: st, newAch: newOnes });
    },
    [logs]
  );

  const onAnswer = useCallback(
    (yes: boolean) => {
      if (!activePrayer) return;
      player.stop();
      if (yes) {
        const key = activePrayer;
        setActivePrayer(null);
        commitPrayer(key, "modal");
      } else {
        setStage("encourage");
      }
    },
    [activePrayer, player, commitPrayer]
  );

  const onGoPray = useCallback(() => {
    if (!activePrayer) return;
    setActivePrayer(null);
    player.stop();
    showToast("💚 ربنا يقوّيك — لما تخلّص صلاتك اضغط على كارت الصلاة لتسجيلها");
  }, [activePrayer, player, showToast]);

  const onSnooze = useCallback(() => {
    if (!activePrayer) return;
    snoozeRef.current[activePrayer] = Date.now() + SNOOZE_MS;
    setActivePrayer(null);
    player.stop();
    showToast(`💤 تمام، هنفكّرك تاني بعد ${toArabicDigits(10)} دقايق`);
  }, [activePrayer, player, showToast]);

  /* ---------------- تشغيل تلاوة الآية (بالقارئ المختار في القرآن) ---------------- */
  const toggleVerseAudio = useCallback(() => {
    const verse = VERSES[verseIdx];
    if (!verse?.s || !verse?.a) return;
    if (verseAudioRef.current) {
      verseAudioRef.current.pause();
      verseAudioRef.current = null;
      setVersePlaying(false);
      if (versePlaying) return;
    }
    const rec = findReciter(loadReciterId());
    const url = ayahAudioUrl(rec, verse.s, verse.a);
    if (!url) {
      showToast("🎙️ القارئ دا مفيش ليه صوت آية مفردة — اختار قارئ تاني من تبويب القرآن");
      return;
    }
    const audio = new Audio(url);
    verseAudioRef.current = audio;
    setVersePlaying(true);
    audio.play().catch(() => {
      setVersePlaying(false);
      verseAudioRef.current = null;
      showToast("⚠️ مش قادر يشغّل الآية — اتأكد من النت");
    });
    audio.onended = () => {
      setVersePlaying(false);
      verseAudioRef.current = null;
    };
  }, [verseIdx, versePlaying, showToast]);

  useEffect(() => {
    return () => {
      if (verseAudioRef.current) {
        verseAudioRef.current.pause();
        verseAudioRef.current = null;
      }
    };
  }, []);

  /* ---------------- تلاوة الآية تلقائيًا مع كل آية جديدة (اختياري من الإعدادات) ---------------- */
  useEffect(() => {
    if (!mounted) return;
    if (firstVerseRun.current) {
      firstVerseRun.current = false;
      return;
    }
    const s = settingsRef.current;
    if (!s.verseRecite) return;
    if (mainTabRef.current !== "home") return;
    if (typeof document !== "undefined" && document.hidden) return;
    if (quranBusyRef.current || playerRef.current.isPlaying()) return;
    const verse = VERSES[verseIdx];
    if (!verse?.s || !verse?.a) return;
    const rec = findReciter(loadReciterId());
    const url = ayahAudioUrl(rec, verse.s, verse.a);
    if (!url) return;
    try {
      verseAudioRef.current?.pause();
    } catch {}
    const audio = new Audio(url);
    verseAudioRef.current = audio;
    setVersePlaying(true);
    // لو المتصفح منع التشغيل التلقائي — نسيّبها بهدوء، الزر اليدوي موجود
    audio.play().catch(() => {
      setVersePlaying(false);
      verseAudioRef.current = null;
    });
    audio.onended = () => {
      setVersePlaying(false);
      verseAudioRef.current = null;
    };
  }, [verseIdx, mounted]);

  const confirmAction = useCallback(() => {
    if (!confirm) return;
    const tk = dayKey(new Date());
    if (confirm.action === "mark") {
      commitPrayer(confirm.key, "manual");
      showToast(`✅ تسجّلت صلاة ${PRAYER_NAMES[confirm.key]} — تقبّل الله`);
    } else {
      const dayLog = getDayLog(logs, tk);
      dayLog[confirm.key] = false;
      const updated = { ...logs, [tk]: dayLog };
      setLogs(updated);
      saveLogs(updated);
      showToast(`تم إلغاء تسجيل صلاة ${PRAYER_NAMES[confirm.key]}`);
    }
    setConfirm(null);
  }, [confirm, logs, commitPrayer, showToast]);

  const onCardClick = useCallback(
    (key: PrayerKey) => {
      if (!times) return;
      const tk = nowKey;
      if (getDayLog(logs, tk)[key]) {
        setConfirm({ key, action: "unmark" });
      } else if (times[key] <= now) {
        setConfirm({ key, action: "mark" });
      } else {
        showToast(`🤍 صلاة ${PRAYER_NAMES[key]} وقتها لسه ما جهش — استنى الأذان`);
      }
    },
    [times, logs, nowKey, showToast]
  );

  /* ---------------- عرض ---------------- */
  const dateLine = useMemo(() => formatDateLine(now), [nowKey]);
  const countdown = next ? formatCountdown(next.at.getTime() - now.getTime()) : null;
  const nextName = next ? (next.key === "dhuhr" && now.getDay() === 5 ? "الجمعة" : PRAYER_NAMES[next.key]) : "";

  // نسبة حلقة العد التنازلي
  const ringProgress = useMemo(() => {
    if (!times || !next) return 0;
    const order = FARD_KEYS;
    const idx = order.indexOf(next.key);
    let prevAt: number;
    if (idx === 0) {
      // الفجر: السابق هو إشفاق العشاء (تقريبًا عشاء أمس)
      prevAt = times.isha.getTime() - 24 * 3600 * 1000;
    } else {
      prevAt = times[order[idx - 1]].getTime();
    }
    const total = next.at.getTime() - prevAt;
    const elapsed = now.getTime() - prevAt;
    return Math.min(1, Math.max(0, elapsed / total));
  }, [times, next, now]);

  const todayLog = mounted ? getDayLog(logs, nowKey) : emptyDayLog();
  const streak = mounted ? currentStreak(logs) : 0;
  const totalPrayersCount = mounted
    ? Object.values(logs).reduce((a, log) => a + dayCount(log), 0)
    : 0;
  const xpPrayers = mounted
    ? Object.values(logs).reduce(
        (a, log) => a + dayCount(log) * 10 + (dayCount(log) >= 5 ? 25 : 0),
        0
      )
    : 0;
  // XP الموحد: صلوات + تاسكات + مذاكرة + بونص الأوسمة (الدمج الكامل)
  const xpTotal = mounted
    ? xpPrayers + tasksXp(planner) + studyXp(planner) + badgeXp
    : 0;
  const unlockedAchievements = mounted ? checkAchievements(logs, planner, bestStreak.current) : [];
  const cityName =
    settings.city === "custom"
      ? "موقعي الحالي"
      : CITIES.find((c) => c.id === settings.city)?.name ?? "القاهرة";
  const hour12 = settings.timeFormat === 12;
  const adhanTestingVoice =
    ADHAN_VOICES.find((v) => v.id === settings.adhanVoice) ?? ADHAN_VOICES[0];

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center p-6">
        <div className="text-7xl animate-float">🕌</div>
        <p className="font-quran text-2xl" style={{ color: "var(--accent2)" }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
          جاري تحميل مواقيتك وأذكارك…
        </p>
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--surface-border)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-clip">
      {/* أنميشن الخلفية: نجوم وهالات */}
      <AnimatedBackground enabled={settings.animations && settings.bgAnim} />

      {/* زخارف خلفية */}
      <div className="ornament w-[420px] h-[420px] -top-32 -right-32" />
      <div className="ornament w-[300px] h-[300px] top-1/2 -left-24" style={{ animationDelay: "2s" }} />
      <div className="ornament w-[260px] h-[260px] bottom-10 right-1/4" style={{ animationDelay: "4s" }} />

      {/* الهيدر */}
      <header className="sticky top-0 z-40 px-4 py-3" style={{ background: "color-mix(in srgb, var(--bg1) 75%, transparent)", backdropFilter: "blur(14px)", borderBottom: "1px solid var(--surface-border)" }}>
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="text-3xl" aria-hidden>🕌</div>
          <div className="leading-tight">
            <h1 className="font-extrabold text-lg" style={{ color: "var(--ink)" }}>
              سَكِينَة
            </h1>
            <p className="text-[0.65rem]" style={{ color: "var(--ink-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "46vw" }}>
              مواقيتك وأذكارك وقارئك ووردك وتاسكاتك وملاحظاتك في مكان واحد
            </p>
          </div>
          <div className="mr-auto flex items-center gap-2">
            <span className="chip hidden sm:inline-flex items-center gap-1.5" title="نقاط الخبرة الموحدة">
              ✨ {toArabicDigits(xpTotal)} XP
            </span>
            <button
              onClick={() => setSettingsOpen(true)}
              className="btn-ghost w-11 h-11 flex items-center justify-center text-xl"
              aria-label="فتح الإعدادات"
            >
              ⚙️
            </button>
          </div>
        </div>
        {/* التنقل الرئيسي: الصلوات / القرآن / قسم موحّد (تاسكات + تايمر + وقت المذاكرة) / إنجازاتي */}
        <nav className="main-tabs max-w-5xl mx-auto mt-3" role="tablist" aria-label="الأقسام الرئيسية">
          {([
            ["home", "🕌 الصلوات"],
            ["quran", "📖 القرآن"],
            ["azkar", "🤲 الأذكار"],
            ["hisn", "🏰 الحصن"],
            ["wird", "📗 الورد"],
            ["focus", "⏱️ التاسكات"],
            ["notes", "📝 ملاحظاتي"],
            ["achv", "🏅 الإنجازات"],
          ] as [MainTab, string][]).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={mainTab === id}
              onClick={() => switchMainTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-5 space-y-5 relative z-10">
        {mainTab === "focus" ? (
          <FocusSection api={plannerApi} now={now} onToast={showToast} />
        ) : mainTab === "achv" ? (
          <AchievementsSection
            api={plannerApi}
            logs={logs}
            xpTotal={xpTotal}
            unlocked={unlockedAchievements}
            streak={streak}
            bestStreak={bestStreak.current}
          />
        ) : mainTab === "quran" ? (
          <QuranSection onToast={showToast} />
        ) : mainTab === "azkar" ? (
          <AzkarSection onToast={showToast} />
        ) : mainTab === "hisn" ? (
          <HisnSection />
        ) : mainTab === "wird" ? (
          <WirdSection
            onToast={showToast}
            onCelebrate={() => setFireworksOn(settingsRef.current.animations)}
          />
        ) : mainTab === "notes" ? (
          <NotesSection onToast={showToast} />
        ) : (
          <>
        {/* ---------------- بطاقة الصلاة القادمة ---------------- */}
        <section className="hero-card p-6 sm:p-8 animate-rise" aria-label="الصلاة القادمة">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="text-center md:text-right md:flex-1 order-2 md:order-1 w-full">
              <p className="text-xs mb-1" style={{ color: "var(--ink-dim)" }}>
                {greetingFor(now)}
              </p>
              {dateLine.hijri && (
                <p className="font-quran text-lg font-bold" style={{ color: "var(--accent2)" }}>
                  {dateLine.hijri}
                </p>
              )}
              <p className="text-xs mb-3" style={{ color: "var(--ink-dim)" }}>
                {dateLine.gregorian}
              </p>
              <p className="text-sm mb-1" style={{ color: "var(--ink-dim)" }}>
                الصلاة القادمة
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold mb-1" style={{ color: "var(--accent)" }}>
                {nextName}
              </p>
              <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
                📍 {cityName} — الساعة الآن {formatClock(now, hour12, false)}
              </p>
            </div>

            {/* العد التنازلي */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0 order-1 md:order-2" role="timer" aria-label={`باقي على ${nextName}`}>
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--surface-2)" strokeWidth="7" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke="var(--accent)" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 * (1 - ringProgress)}
                  style={{ filter: "drop-shadow(0 0 8px var(--glow))", transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                <span className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>
                  باقي على الأذان
                </span>
                {countdown && (
                  <span className="font-extrabold tabular-nums text-2xl sm:text-3xl" style={{ color: "var(--ink)" }} dir="ltr">
                    {countdown.h}:{countdown.m}:{countdown.s}
                  </span>
                )}
                <span className="text-[0.7rem] font-bold" style={{ color: "var(--accent2)" }}>
                  {next ? formatPrayerTime(next.at, hour12) : ""}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- كروت الصلوات ---------------- */}
        <section aria-label="مواقيت الصلوات اليوم">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
            {PRAYER_ORDER.map((key) => {
              const isNext = next?.key === key;
              const isLogged = todayLog[key];
              const passed = times ? times[key] <= now : false;
              const name = key === "dhuhr" && now.getDay() === 5 ? "الجمعة" : PRAYER_NAMES[key];
              return (
                <button
                  key={key}
                  onClick={() => onCardClick(key)}
                  aria-label={`صلاة ${name}، ${times ? formatPrayerTime(times[key], hour12) : ""}${isLogged ? "، مسجلة" : isNext ? "، الصلاة القادمة" : passed ? "، انتهى وقتها غير مسجلة، اضغط للتسجيل" : ""}`}
                  className="glass-card !rounded-2xl p-3 sm:p-4 text-center relative transition-all hover:-translate-y-1"
                  style={{
                    borderColor: isLogged ? "var(--accent)" : isNext ? "var(--accent2)" : undefined,
                    background: isLogged ? "color-mix(in srgb, var(--accent) 14%, var(--surface))" : isNext ? "color-mix(in srgb, var(--accent2) 12%, var(--surface))" : undefined,
                    boxShadow: isNext ? "0 0 26px -8px var(--glow)" : undefined,
                    borderStyle: !isLogged && passed && !isNext ? "dashed" : "solid",
                  }}
                >
                  {isLogged && (
                    <span className="absolute top-1.5 left-1.5 text-xs animate-pop-in" aria-hidden>✅</span>
                  )}
                  {isNext && (
                    <span className="absolute top-1.5 left-1.5 text-xs animate-pulse" aria-hidden>⏳</span>
                  )}
                  <span className="text-2xl sm:text-3xl block mb-1" aria-hidden>{PRAYER_EMOJI[key]}</span>
                  <span className="block text-xs sm:text-sm font-bold" style={{ color: "var(--ink)" }}>
                    {name}
                  </span>
                  <span className="block text-[0.7rem] sm:text-xs mt-0.5 tabular-nums" style={{ color: "var(--ink-dim)" }} dir="ltr">
                    {times ? formatPrayerTime(times[key], hour12) : "…"}
                  </span>
                </button>
              );
            })}
            {/* الشروق */}
            <div className="glass-card !rounded-2xl p-3 sm:p-4 text-center opacity-80" aria-label="وقت الشروق">
              <span className="text-2xl sm:text-3xl block mb-1" aria-hidden>{PRAYER_EMOJI.sunrise}</span>
              <span className="block text-xs sm:text-sm font-bold" style={{ color: "var(--ink)" }}>الشروق</span>
              <span className="block text-[0.7rem] sm:text-xs mt-0.5 tabular-nums" style={{ color: "var(--ink-dim)" }} dir="ltr">
                {times ? formatPrayerTime(times.sunrise, hour12) : "…"}
              </span>
            </div>
          </div>
          <p className="text-[0.68rem] mt-2 text-center" style={{ color: "var(--ink-dim)" }}>
            💡 اضغط على أي صلاة فاتت وقتها وسجّلها — والمواقيت محسوبة بتوقيت جهازك المحلي
          </p>
        </section>

        {/* ---------------- الأذكار والآيات ---------------- */}
        <section className="grid md:grid-cols-2 gap-4" aria-label="الأذكار والآيات">
          <div className="glass-card p-5 sm:p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📿</span>
              <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>ذكر يتجدد كل دقيقة</h3>
              <span className="chip mr-auto">
                {toArabicDigits(athkarIdx + 1)} / {toArabicDigits(ATHKAR.length)}
              </span>
            </div>
            <div key={athkarIdx} className="flex-1 flex flex-col justify-center animate-fade-swap">
              <p className="font-quran text-xl sm:text-2xl leading-loose text-center mb-3" style={{ color: "var(--ink)" }}>
                {ATHKAR[athkarIdx].text}
              </p>
              {ATHKAR[athkarIdx].virtue && (
                <p className="text-xs text-center" style={{ color: "var(--accent2)" }}>
                  💫 {ATHKAR[athkarIdx].virtue}
                </p>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setAthkarIdx((x) => (x - 1 + ATHKAR.length) % ATHKAR.length)} className="btn-ghost px-4 py-2 text-sm" aria-label="الذكر السابق">
                → السابق
              </button>
              <button onClick={() => setAthkarIdx((x) => (x + 1) % ATHKAR.length)} className="btn-accent px-6 py-2 text-sm" aria-label="الذكر التالي">
                التالي ←
              </button>
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📖</span>
              <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>آية تتجدد كل دقيقة</h3>
              <span className="chip mr-auto">
                {toArabicDigits(verseIdx + 1)} / {toArabicDigits(VERSES.length)}
              </span>
            </div>
            <div key={verseIdx} className="flex-1 flex flex-col justify-center animate-fade-swap">
              <p className="font-quran text-xl sm:text-2xl leading-loose text-center mb-2" style={{ color: "var(--accent2)" }}>
                ﴿ {VERSES[verseIdx].text} ﴾
              </p>
              <p className="text-xs text-center" style={{ color: "var(--ink-dim)" }}>
                [{VERSES[verseIdx].ref}]
              </p>
              {VERSES[verseIdx].s && VERSES[verseIdx].a && (
                <button
                  onClick={toggleVerseAudio}
                  className="btn-ghost mx-auto mt-3 px-4 py-1.5 text-xs"
                  aria-label={versePlaying ? "إيقاف تلاوة الآية" : "تشغيل تلاوة الآية بالقارئ المختار"}
                  title="تشغيل تلاوة الآية بالقارئ المختار في تبويب القرآن"
                >
                  {versePlaying ? "⏹ إيقاف التلاوة" : "🔊 اسمع الآية"}
                </button>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setVerseIdx((x) => (x - 1 + VERSES.length) % VERSES.length)} className="btn-ghost px-4 py-2 text-sm" aria-label="الآية السابقة">
                → السابق
              </button>
              <button onClick={() => setVerseIdx((x) => (x + 1) % VERSES.length)} className="btn-accent px-6 py-2 text-sm" aria-label="الآية التالية">
                التالي ←
              </button>
            </div>
          </div>
        </section>

        {/* ---------------- الإحصائيات + القبلة + السبحة ---------------- */}
        <section className="grid lg:grid-cols-3 md:grid-cols-2 gap-4 [&>*]:min-w-0">
          <StatsSection logs={logs} streak={streak} bestStreak={bestStreak.current} todayKey={nowKey} />
          <QiblaCompass lat={settings.lat} lng={settings.lng} />
          <TasbihCard />
        </section>

        {/* ---------------- الإنجازات ---------------- */}
        <section className="glass-card p-5 sm:p-6" aria-label="الإنجازات">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏅</span>
            <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>الإنجازات</h3>
            <span className="chip mr-auto">
              {toArabicDigits(unlockedAchievements.length)} / {toArabicDigits(ACHIEVEMENTS.length)}
            </span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 snap-x">
            {ACHIEVEMENTS.map((a) => {
              const got = unlockedAchievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  className="achv-mini shrink-0 w-32 p-3 rounded-2xl text-center"
                  style={{
                    background: "var(--surface)",
                    border: got ? "1.5px solid var(--accent)" : "1px dashed var(--surface-border)",
                    opacity: got ? 1 : 0.5,
                    boxShadow: got ? "0 0 16px -6px var(--glow)" : "none",
                  }}
                  title={a.description}
                >
                  <span className="text-2xl block mb-1">{got ? a.emoji : "🔒"}</span>
                  <span className="block text-xs font-bold" style={{ color: got ? "var(--accent2)" : "var(--ink-dim)" }}>
                    {a.name}
                  </span>
                  <span className="desc block text-[0.62rem] mt-0.5 leading-snug" style={{ color: "var(--ink-dim)" }}>
                    {a.description}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
          </>
        )}
      </main>

      {/* ---------------- الفوتر ---------------- */}
      <footer className="mt-auto relative z-10 px-4 py-6 text-center" style={{ borderTop: "1px solid var(--surface-border)" }}>
        <p className="font-quran text-lg mb-1" style={{ color: "var(--accent2)" }}>
          رَبَّنَا تَقَبَّلْ مِنَّا صَلَاتَنَا وَذِكْرَنَا وَسَعْيَنَا
        </p>
        <p className="text-xs" style={{ color: "var(--ink-dim)" }}>
          صُنع بحب 🤍 — سَكِينَة | الصلوات والقرآن والأذكار والحصن والورد والتاسكات والملاحظات والإنجازات
        </p>
      </footer>

      {/* ---------------- المودالات ---------------- */}
      <PrayerModal
        prayer={activePrayer}
        stage={stage}
        timeStr={activePrayer && times ? formatPrayerTime(times[activePrayer], hour12) : ""}
        adhanBlocked={adhanBlocked}
        adhanPlaying={player.isPlaying()}
        onAnswer={onAnswer}
        onGoPray={onGoPray}
        onSnooze={onSnooze}
        onPlayAdhan={() => activePrayer && playAdhanFor(activePrayer)}
        onStopAdhan={() => {
          player.stop();
          setAdhanBlocked(false);
        }}
      />

      <CongratsOverlay
        show={!!congrats}
        prayer={congrats?.prayer ?? null}
        xpGain={congrats?.xp ?? 0}
        streak={congrats?.streak ?? 0}
        newAchievements={congrats?.newAch ?? []}
        onClose={() => setCongrats(null)}
      />

      <Fireworks active={fireworksOn} onDone={stopFireworks} />

      {/* تأكيد التسجيل اليدوي */}
      {confirm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="animate-pop-in glass-card max-w-xs w-full p-6 text-center" style={{ background: "var(--surface-2)" }}>
            <div className="text-4xl mb-2">{confirm.action === "mark" ? "✍️" : "↩️"}</div>
            <p className="font-bold mb-4" style={{ color: "var(--ink)" }}>
              {confirm.action === "mark"
                ? `تسجّل إنك صليت ${PRAYER_NAMES[confirm.key]}؟`
                : `إلغاء تسجيل صلاة ${PRAYER_NAMES[confirm.key]}؟`}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={confirmAction} className="btn-accent py-2.5">
                أيوه
              </button>
              <button onClick={() => setConfirm(null)} className="btn-ghost py-2.5">
                سيبها
              </button>
            </div>
          </div>
        </div>
      )}

      {/* التوست */}
      {toast && (
        <div className="fixed bottom-5 inset-x-0 z-[75] flex justify-center px-4 pointer-events-none" role="status">
          <div
            className="animate-rise px-5 py-3 rounded-2xl text-sm font-bold shadow-xl"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--accent)",
              color: "var(--ink)",
              backdropFilter: "blur(12px)",
              maxWidth: "90vw",
            }}
          >
            {toast}
          </div>
        </div>
      )}

      {/* الإعدادات */}
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
        onTestAdhan={() => {
          player.test(adhanTestingVoice.file, settings.adhanVolume);
          setAdhanTesting(player.isPlaying());
        }}
        adhanTesting={adhanTesting}
        onResetData={() => {
          import("@/lib/storage").then((m) => m.resetAllData());
          setTimeout(() => window.location.reload(), 400);
        }}
        stats={{
          total: totalPrayersCount,
          streak,
          xp: xpTotal,
          level: Math.floor(xpTotal / 100) + 1,
          best: bestStreak.current,
          unlockedAchievements,
        }}
      />
    </div>
  );
}
