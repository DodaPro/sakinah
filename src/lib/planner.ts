"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dayKey } from "./prayer";

/* =========================================================
   طبقة التخطيط والتحدي — دمج "Challenge Planner" الأصلي
   (التاسكات + الكورسات + تايمر المذاكرة) داخل سَكِينَة
   namespace: sakinah.planner
   ========================================================= */

/* ---------------- أدوات التاريخ ---------------- */

const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const WD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function parseIso(s: string): Date {
  const a = s.split("-").map(Number);
  return new Date(a[0], a[1] - 1, a[2]);
}

export function addDaysIso(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

function utcMs(s: string): number {
  const a = s.split("-").map(Number);
  return Date.UTC(a[0], a[1] - 1, a[2]);
}

/** الفرق بالأيام بين تاريخين iso */
export const diffDays = (a: string, b: string) => Math.round((utcMs(b) - utcMs(a)) / 864e5);

export const dayNameOf = (s: string) => WD[parseIso(s).getDay()];

export const dmOf = (s: string) => {
  const d = parseIso(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseIso(s).getTime());

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------------- الأنواع ---------------- */

export interface CourseDef {
  id: string;
  name: string;
  unit: string;
  total: number;
  from: number;
  to: number;
  ci: number; // فهرس اللون
}

export interface TaskDef {
  id: string;
  date: string; // iso
  title: string;
  cat: string; // معرف كورس أو "college" أو "other"
  qty: number;
  gen: boolean;
  done: boolean;
}

export interface StudyLog {
  id: string;
  date: string; // iso
  secs: number;
  cat: string;
}

export interface RunningTimer {
  start: number; // timestamp
  cat: string;
}

export interface PlannerCfg {
  start: string; // iso
  days: number; // 1..90
  rest: number; // يوم راحة أسبوعي (-1 = مفيش)
  dream: string;
}

export interface PlannerState {
  cfg: PlannerCfg;
  courses: CourseDef[];
  tasks: TaskDef[];
  studyLog: StudyLog[];
  timer: RunningTimer | null;
  target: number; // بالدقايق في اليوم
}

export type PlannerTab = "today" | "plan" | "courses";

/* ---------------- الثوابت ---------------- */

export const FIXED_CATS: Record<string, { n: string }> = {
  college: { n: "الكلية" },
  other: { n: "حاجة تانية" },
};

export const UNIT_SUGGESTIONS = ["فيديو", "محاضرة", "درس", "صفحة", "فصل", "تمرين", "جلسة", "وحدة"];

export const REST_OPTIONS: { value: string; label: string }[] = [
  { value: "-1", label: "مفيش" },
  { value: "5", label: "الجمعة" },
  { value: "6", label: "السبت" },
  { value: "0", label: "الأحد" },
  { value: "1", label: "الاثنين" },
  { value: "2", label: "الثلاثاء" },
  { value: "3", label: "الأربعاء" },
  { value: "4", label: "الخميس" },
];

export const GEN_MESSAGES = [
  "أصعب حاجة البداية، وإنت بدأت. خد أول مهمة وخلّصها.",
  "الاستمرار أهم من الكمية. شوية كل يوم هيوصّلوك.",
  "كل مهمة بتعلّمها هي خطوة حقيقية ناحية هدفك.",
  "لو يومك تقيل، اعمل أصغر مهمة. أحسن من صفر.",
  "بص وراك: إنت عملت أكتر مما تتخيل.",
  "ركّز في اللي قدامك النهارده بس، وبكرة له يومه.",
  "عدّيت نص الطريق تقريبًا. إنك تكمّل أسهل من إنك تبدأ من الأول.",
  "جرّب تطبّق اللي اتعلمته بإيدك، ده اللي بيثبّت المعلومة.",
  "كل ساعة مذاكرة بتتحسب، حتى لو صغيرة.",
  "قربت جدًا. شدّ حيلك.",
  "خطوة كمان وتخلص. ركّز.",
  "آخر لفّة! جهّز نفسك لاحتفال صغير بعد ما تخلص.",
];

/* ---------------- التخزين ---------------- */

const K_PLANNER = "sakinah.planner";
const K_BADGE_XP = "sakinah.badgeXp";
const K_MAIN_TAB = "sakinah.mainTab";

export function freshPlanner(): PlannerState {
  const today = dayKey();
  return {
    cfg: { start: today, days: 15, rest: -1, dream: "" },
    courses: [],
    tasks: [],
    studyLog: [],
    timer: null,
    target: 180,
  };
}

export function loadPlanner(): PlannerState {
  if (typeof window === "undefined") return freshPlanner();
  try {
    const raw = window.localStorage.getItem(K_PLANNER);
    if (!raw) return freshPlanner();
    const r = JSON.parse(raw);
    const base = freshPlanner();
    return {
      cfg: { ...base.cfg, ...(r?.cfg ?? {}) },
      courses: Array.isArray(r?.courses) ? r.courses : [],
      tasks: Array.isArray(r?.tasks) ? r.tasks : [],
      studyLog: Array.isArray(r?.studyLog) ? r.studyLog : [],
      timer: r?.timer ?? null,
      target: r?.target == null ? 180 : Number(r.target) || 180,
    };
  } catch {
    return freshPlanner();
  }
}

export function savePlanner(s: PlannerState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(K_PLANNER, JSON.stringify(s));
  } catch {}
}

export function loadBadgeXp(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.localStorage.getItem(K_BADGE_XP)) || 0;
  } catch {
    return 0;
  }
}

export function saveBadgeXp(n: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(K_BADGE_XP, String(n));
  } catch {}
}

export type MainTab = "home" | "tasks" | "timer" | "quran";

export function loadMainTab(): MainTab {
  if (typeof window === "undefined") return "home";
  const t = window.localStorage.getItem(K_MAIN_TAB);
  return t === "tasks" || t === "timer" || t === "quran" ? t : "home";
}

export function saveMainTab(t: MainTab) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(K_MAIN_TAB, t);
  } catch {}
}

/** مسح بيانات التخطيط (يُستدعى من مسح كل البيانات) */
export function clearPlannerStorage() {
  if (typeof window === "undefined") return;
  [K_PLANNER, K_BADGE_XP, K_MAIN_TAB].forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {}
  });
}

/* ---------------- مساعدات الكورسات والمهام ---------------- */

export function catName(state: PlannerState, id: string): string {
  const c = state.courses.find((x) => x.id === id);
  if (c) return c.name;
  return FIXED_CATS[id]?.n ?? FIXED_CATS.other.n;
}

export const catIdsOf = (state: PlannerState) => state.courses.map((c) => c.id).concat(["college", "other"]);

export function courseColorClass(ci: number): string {
  return `cc-${((ci % 8) + 8) % 8}`;
}

/** اسم متغير CSS للون الكورس رقم i (--ck0..--ck7) */
export function courseColorVar(ci: number): string {
  return `ck${((ci % 8) + 8) % 8}`;
}

export function isRestDay(state: PlannerState, d: string): boolean {
  return state.cfg.rest >= 0 && parseIso(d).getDay() === state.cfg.rest;
}

export function challengeDays(state: PlannerState): string[] {
  const n = Math.min(90, Math.max(1, Math.floor(state.cfg.days) || 15));
  const start = validDate(state.cfg.start) ? state.cfg.start : dayKey();
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(addDaysIso(start, i));
  return out;
}

export const tasksOn = (state: PlannerState, d: string) => state.tasks.filter((t) => t.date === d);

export const dayTasksComplete = (state: PlannerState, d: string) => {
  const ts = tasksOn(state, d);
  return ts.length > 0 && ts.every((t) => t.done);
};

export function courseDates(state: PlannerState, c: CourseDef): string[] {
  const days = challengeDays(state);
  const n = days.length;
  const from = Math.max(1, Math.min(n, Math.floor(c.from) || 1));
  const to = Math.max(from, Math.min(n, Math.floor(c.to) || n));
  let ds = days.slice(from - 1, to);
  const nr = ds.filter((d) => !isRestDay(state, d));
  return nr.length ? nr : ds;
}

/** توزيع وحدات الكورس على أيامه — يعيد عدد الوحدات الموزعة */
export function distributeCourse(state: PlannerState, c: CourseDef): number {
  // نشيل المهمام المولدة غير المنجزة للكورس ده
  state.tasks = state.tasks.filter((t) => !(t.cat === c.id && t.gen && !t.done));
  const kept = state.tasks.filter((t) => t.cat === c.id && t.gen).reduce((a, t) => a + (t.qty || 1), 0);
  const rem = c.total - kept;
  if (rem <= 0) return 0;
  let ds = courseDates(state, c);
  const today = dayKey();
  const fut = ds.filter((d) => d >= today);
  if (fut.length) ds = fut;
  const n = ds.length;
  let u = kept + 1;
  for (let i = 0; i < n; i++) {
    const q = Math.floor(((i + 1) * rem) / n) - Math.floor((i * rem) / n);
    if (q <= 0) continue;
    if (q <= 5) {
      for (let j = 0; j < q; j++) {
        state.tasks.push({
          id: "g" + uid(),
          date: ds[i],
          title: `${c.name} · ${c.unit} ${u} من ${c.total}`,
          cat: c.id,
          qty: 1,
          gen: true,
          done: false,
        });
        u++;
      }
    } else {
      state.tasks.push({
        id: "g" + uid(),
        date: ds[i],
        title: `${c.name} · ${c.unit} ${u}–${u + q - 1} من ${c.total}`,
        cat: c.id,
        qty: q,
        gen: true,
        done: false,
      });
      u += q;
    }
  }
  return rem;
}

export function courseStat(state: PlannerState, c: CourseDef): { d: number; t: number } {
  const l = state.tasks.filter((t) => t.cat === c.id && t.qty);
  return {
    d: l.filter((t) => t.done).reduce((a, t) => a + t.qty, 0),
    t: l.reduce((a, t) => a + t.qty, 0),
  };
}

/* ---------------- وقت المذاكرة ---------------- */

/** يقسم جلسة (قد تعبر منتصف الليل) لأجزاء لكل يوم */
export function splitSession(a: number, b: number): { date: string; secs: number }[] {
  const out: { date: string; secs: number }[] = [];
  let s = a;
  while (s < b) {
    const d = new Date(s);
    const nm = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const e = Math.min(b, nm);
    out.push({ date: isoOf(d), secs: (e - s) / 1000 });
    s = e;
  }
  return out;
}

export function runningSecsOn(state: PlannerState, d: string): number {
  if (!state.timer) return 0;
  return splitSession(state.timer.start, Date.now())
    .filter((x) => x.date === d)
    .reduce((a, x) => a + x.secs, 0);
}

export function studySecsOn(state: PlannerState, d: string): number {
  return state.studyLog.filter((l) => l.date === d).reduce((a, l) => a + l.secs, 0) + runningSecsOn(state, d);
}

export function totalStudySecs(state: PlannerState): number {
  return state.studyLog.reduce((a, l) => a + l.secs, 0);
}

/* ---------------- مقاييس التخطيط ---------------- */

export interface PlannerMetrics {
  total: number;
  done: number;
  pct: number;
  fullDays: number;
  cur: number;
  best: number;
  overdue: number;
  study: number;
  units: number;
  courseDone: boolean;
}

export function plannerMetrics(state: PlannerState): PlannerMetrics {
  const days = challengeDays(state);
  const today = dayKey();
  const m: PlannerMetrics = {
    total: state.tasks.length,
    done: state.tasks.filter((t) => t.done).length,
    pct: 0,
    fullDays: days.filter((d) => dayTasksComplete(state, d)).length,
    cur: 0,
    best: 0,
    overdue: state.tasks.filter((t) => t.date < today && !t.done).length,
    study: totalStudySecs(state),
    units: state.tasks.filter((t) => t.done && t.qty).reduce((a, t) => a + t.qty, 0),
    courseDone: state.courses.some((c) => {
      const s = courseStat(state, c);
      return s.t > 0 && s.d === s.t;
    }),
  };
  m.pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
  let run = 0;
  days.forEach((d) => {
    if (d > today) return;
    if (dayTasksComplete(state, d)) {
      run++;
      if (run > m.best) m.best = run;
    } else if (d !== today) run = 0;
  });
  m.cur = run;
  return m;
}

/** رسالة تحفيزية للتحدي */
export function challengeMsg(state: PlannerState, m: PlannerMetrics): string {
  if (!state.courses.length && !state.tasks.length)
    return "ضيف كورساتك من تبويب «كورساتي» وأنا هقسمها على أيام التحدي.";
  const days = challengeDays(state);
  const start = days[0];
  const end = days[days.length - 1];
  const today = dayKey();
  const idx = diffDays(start, today);
  if (today < start) return "التحدي لسه ما بدأش. جهّز الكورسات والمكان اللي هتذاكر فيه.";
  if (today > end)
    return m.total > 0 && m.done === m.total
      ? "خلصت التحدي كله. عملت حاجة كبيرة بجد."
      : "التحدي خلص. شوف اللي فاضل وكمّله، وكل ساعة بتتحسب.";
  const ts = tasksOn(state, today);
  if (ts.length && ts.every((t) => t.done))
    return "خلصت مهام النهارده. ارتاح، واللي بتعمله كل يوم هو اللي بيوصّلك.";
  if (m.overdue > 0)
    return `في ${m.overdue} مهمة متأخرة. مفيش مشكلة، ابدأ بأصغر واحدة، أو اضغط «وزّع الباقي من النهارده» في تبويب كورساتي.`;
  return GEN_MESSAGES[Math.min(GEN_MESSAGES.length - 1, Math.max(0, Math.floor((idx / days.length) * GEN_MESSAGES.length)))];
}

/* ---------------- XP الموحد ---------------- */

export const XP_PER_TASK = 5;
export const XP_TASK_DAY_BONUS = 15;
export const XP_PER_BADGE = 20;
/** كل ٥ دقايق مذاكرة = ١ XP */
export const XP_PER_STUDY_BLOCK = 300; // ثواني

/** XP المهام: كل مهمة +5 وبونص لليوم الكامل */
export function tasksXp(state: PlannerState): number {
  let xp = state.tasks.filter((t) => t.done).length * XP_PER_TASK;
  const days = new Set(state.tasks.map((t) => t.date));
  days.forEach((d) => {
    if (dayTasksComplete(state, d)) xp += XP_TASK_DAY_BONUS;
  });
  return xp;
}

/** XP المذاكرة: كل ٥ دقايق نقطة */
export function studyXp(state: PlannerState): number {
  return Math.floor(totalStudySecs(state) / XP_PER_STUDY_BLOCK);
}

/** تنسيق المدة بالعربي: ٢ س ٣٠ د */
export function fmtDur(secs: number): string {
  secs = Math.max(0, Math.round(secs));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h && m) return `${toAr(h)} س ${toAr(m)} د`;
  if (h) return `${toAr(h)} س`;
  if (m) return `${toAr(m)} د`;
  return secs ? "أقل من دقيقة" : "٠ د";
}

/** ساعة التايمر ٠:٠٠:٠٠ */
export function clockFmt(secs: number): string {
  secs = Math.max(0, Math.floor(secs));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${pad2(m)}:${pad2(s)}`;
}

const AR_NUM = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
export const toAr = (x: string | number) => String(x).replace(/\d/g, (d) => AR_NUM[Number(d)]);

/* ---------------- هوك React ---------------- */

export function usePlanner() {
  const [state, setState] = useState<PlannerState>(() => freshPlanner());
  const [mounted, setMounted] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    // تحميل الحالة المحفوظة من localStorage بعد أول رندر (نمط hydration آمن للـ SSR)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadPlanner());
    setMounted(true);
  }, []);

  // حفظ تلقائي عند أي تغيير
  useEffect(() => {
    if (mounted) savePlanner(state);
  }, [state, mounted]);

  const mutate = useCallback((fn: (draft: PlannerState) => void) => {
    setState((prev) => {
      const draft: PlannerState = JSON.parse(JSON.stringify(prev));
      fn(draft);
      return draft;
    });
  }, []);

  const addTask = useCallback(
    (date: string, title: string, cat: string) => {
      mutate((d) => {
        d.tasks.push({ id: uid(), date, title, cat, qty: 0, gen: false, done: false });
      });
    },
    [mutate]
  );

  const toggleTask = useCallback(
    (id: string, val: boolean) => {
      mutate((dr) => {
        const t = dr.tasks.find((x) => x.id === id);
        if (t) t.done = val;
      });
    },
    [mutate]
  );

  const editTask = useCallback(
    (id: string, patch: Partial<Pick<TaskDef, "title" | "date" | "cat">>) => {
      mutate((d) => {
        const t = d.tasks.find((x) => x.id === id);
        if (t) Object.assign(t, patch);
      });
    },
    [mutate]
  );

  const deleteTask = useCallback(
    (id: string) => {
      mutate((d) => {
        d.tasks = d.tasks.filter((x) => x.id !== id);
      });
    },
    [mutate]
  );

  const addCourse = useCallback(
    (name: string, unit: string, total: number, from: number, to: number) => {
      mutate((d) => {
        const c: CourseDef = {
          id: uid(),
          name,
          unit: unit || "وحدة",
          total,
          from: Math.max(1, from),
          to: Math.max(from, to),
          ci: d.courses.length % 8,
        };
        d.courses.push(c);
        distributeCourse(d, c);
      });
    },
    [mutate]
  );

  const updateCourse = useCallback(
    (id: string, patch: Partial<Pick<CourseDef, "name" | "unit" | "total" | "from" | "to">>) => {
      mutate((d) => {
        const c = d.courses.find((x) => x.id === id);
        if (!c) return;
        Object.assign(c, patch);
        if (patch.to != null) c.to = Math.max(c.from, c.to);
        distributeCourse(d, c);
      });
    },
    [mutate]
  );

  const deleteCourse = useCallback(
    (id: string) => {
      mutate((d) => {
        d.courses = d.courses.filter((c) => c.id !== id);
        d.tasks = d.tasks.filter((t) => t.cat !== id);
      });
    },
    [mutate]
  );

  const redistributeCourse = useCallback(
    (id: string) => {
      mutate((d) => {
        const c = d.courses.find((x) => x.id === id);
        if (c) distributeCourse(d, c);
      });
    },
    [mutate]
  );

  const updateCfg = useCallback(
    (patch: Partial<PlannerCfg>) => {
      mutate((d) => {
        Object.assign(d.cfg, patch);
        // إعادة توزيع المتبقي من كل كورس
        d.courses.forEach((c) => distributeCourse(d, c));
      });
    },
    [mutate]
  );

  const startTimer = useCallback(
    (cat: string) => {
      mutate((d) => {
        if (!d.timer) d.timer = { start: Date.now(), cat };
      });
    },
    [mutate]
  );

  /** يوقّف التايمر ويسجل الجلسة — يعيد الثواني المسجلة */
  const stopTimer = useCallback((): number => {
    const T = stateRef.current.timer;
    if (!T) return 0;
    const end = Date.now();
    const parts = splitSession(T.start, end).filter((x) => x.secs >= 1);
    const total = parts.reduce((a, x) => a + x.secs, 0);
    if (total < 10) {
      mutate((d) => {
        d.timer = null;
      });
      return 0;
    }
    mutate((d) => {
      d.timer = null;
      parts.forEach((x) =>
        d.studyLog.push({ id: uid(), date: x.date, secs: Math.round(x.secs), cat: T.cat })
      );
    });
    return Math.round(total);
  }, [mutate]);

  const addManualTime = useCallback(
    (date: string, mins: number, cat: string) => {
      mutate((d) => {
        d.studyLog.push({ id: uid(), date, secs: Math.round(mins * 60), cat });
      });
    },
    [mutate]
  );

  const deleteStudyLog = useCallback(
    (id: string) => {
      mutate((d) => {
        d.studyLog = d.studyLog.filter((l) => l.id !== id);
      });
    },
    [mutate]
  );

  const setTarget = useCallback(
    (mins: number) => {
      mutate((d) => {
        d.target = Math.min(960, Math.max(0, Math.round(mins)));
      });
    },
    [mutate]
  );

  const resetPlanner = useCallback(() => {
    setState(freshPlanner());
  }, []);

  return {
    planner: state,
    plannerMounted: mounted,
    addTask,
    toggleTask,
    editTask,
    deleteTask,
    addCourse,
    updateCourse,
    deleteCourse,
    redistributeCourse,
    updateCfg,
    startTimer,
    stopTimer,
    addManualTime,
    deleteStudyLog,
    setTarget,
    resetPlanner,
  };
}

export type PlannerApi = ReturnType<typeof usePlanner>;
