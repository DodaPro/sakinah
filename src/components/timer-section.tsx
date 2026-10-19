"use client";

import { useState } from "react";
import { dayKey } from "@/lib/prayer";
import type { PlannerApi } from "@/lib/planner";
import {
  catIdsOf,
  catName,
  challengeDays,
  clockFmt,
  courseColorVar,
  dmOf,
  fmtDur,
  openTasks,
  splitSession,
  toAr,
  totalStudySecs,
} from "@/lib/planner";

/* =========================================================
   تبويب «التايمر» — تايمر المذاكرة + إحصائيات الوقت
   مدمج من المشروع الأصلي Challenge Planner
   ========================================================= */

export default function TimerSection({
  api,
  now,
  onToast,
}: {
  api: PlannerApi;
  now: Date;
  onToast: (msg: string) => void;
}) {
  const { planner } = api;
  const today = dayKey(now);
  const running = !!planner.timer;
  const elapsed = running ? (now.getTime() - (planner.timer?.start ?? 0)) / 1000 : 0;

  const catIds = catIdsOf(planner);
  const [manualDate, setManualDate] = useState<string>("");
  const [manualMin, setManualMin] = useState("60");
  const [manualCat, setManualCat] = useState("");
  const [confirmLog, setConfirmLog] = useState<string | null>(null);
  // دمج التايمر مع التاسكات: اختيار مهمة + كارت «خلصت المهمة؟» بعد الوقف
  const [selTask, setSelTask] = useState("");
  const [stoppedTask, setStoppedTask] = useState<{ id: string; title: string; secs: number } | null>(null);
  const open = openTasks(planner);
  const runningTask = planner.timer?.taskId ? planner.tasks.find((t) => t.id === planner.timer!.taskId) ?? null : null;

  const days = challengeDays(planner);
  const tgt = planner.target * 60;
  const runParts = running && planner.timer ? splitSession(planner.timer.start, now.getTime()) : [];
  const todaySecs = planner.studyLog.filter((l) => l.date === today).reduce((a, l) => a + l.secs, 0) + runParts.reduce((a, x) => a + x.secs, 0);
  const total = totalStudySecs(planner) + elapsed;

  const per = days.map((d) => planner.studyLog.filter((l) => l.date === d).reduce((a, l) => a + l.secs, 0) + runParts.filter((x) => x.date === d).reduce((a, x) => a + x.secs, 0));
  const elapsedCount = days.filter((d) => d <= today).length || 1;
  const best = Math.max(...per, 0);
  const bi = per.indexOf(best);
  const hit = days.filter((_, i) => tgt > 0 && per[i] >= tgt).length;

  const catSecs: Record<string, number> = {};
  catIds.forEach((k) => (catSecs[k] = 0));
  planner.studyLog.forEach((l) => {
    const id = catSecs[l.cat] == null ? "other" : l.cat;
    catSecs[id] += l.secs;
  });
  if (planner.timer) {
    splitSession(planner.timer.start, now.getTime()).forEach((x) => {
      const id = catSecs[planner.timer!.cat] == null ? "other" : planner.timer!.cat;
      catSecs[id] += x.secs;
    });
  }
  const catMax = Math.max(...Object.values(catSecs), 1);

  const mx = Math.max(tgt, best, 600);
  const step = Math.ceil(days.length / 15);

  const onStop = () => {
    const t = planner.timer;
    const taskId = t?.taskId;
    const taskTitle = taskId ? planner.tasks.find((x) => x.id === taskId)?.title : null;
    const secs = api.stopTimer();
    if (!secs) {
      onToast("الجلسة قصيرة جدًا فمتسجلتش");
      return;
    }
    const xp = Math.floor(secs / 300);
    onToast(`⏱️ اتسجل ${fmtDur(secs)} مذاكرة${xp ? ` (+${toAr(xp)} XP)` : ""} — تقريبًا ${toAr(Math.round((secs / 3600) * 100) / 100)} ساعة`);
    if (taskId && taskTitle) {
      if (!wasTaskDone(taskId)) setStoppedTask({ id: taskId, title: taskTitle, secs });
    }
  };

  /** هل المهمة لسه مش متعلّمة؟ (الـ planner في الكلوزور = الحالة قبل الوقف) */
  const wasTaskDone = (id: string) => planner.tasks.find((t) => t.id === id)?.done ?? false;

  const logs = [...planner.studyLog].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 30);

  return (
    <div className="space-y-5">
      {/* ---------- كارت التايمر ---------- */}
      <section className="hero-card p-6 sm:p-8 animate-rise" aria-label="تايمر المذاكرة">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full order-2 md:order-1 text-center md:text-right">
            <p className="text-xs mb-1" style={{ color: "var(--ink-dim)" }}>تايمر المذاكرة</p>
            <p
              className={`font-extrabold tabular-nums text-5xl sm:text-6xl mb-2 ${running ? "timer-on" : ""}`}
              style={{ color: running ? "var(--accent)" : "var(--ink)" }}
              dir="ltr"
              role="timer"
              aria-live="off"
            >
              {clockFmt(elapsed)}
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--ink-dim)" }}>
              {running
                ? "شغّال دلوقتي، ومكمّل حتى لو قفلت الصفحة"
                : "اختار المهمة أو المادة واضغط ابدأ"}
            </p>
            {runningTask && (
              <p className="mb-3 animate-pop-in">
                <span className="chip run-task-chip">📋 شغّال على: {runningTask.title}</span>
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <select
                className="tinput"
                value={running ? planner.timer!.taskId ?? "" : selTask}
                disabled={running}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelTask(v);
                  const t = open.find((x) => x.id === v);
                  if (t) setManualCat(t.cat); // مادة المهمة بتتحدد أوتوماتيك
                }}
                aria-label="المهمة المرتبطة"
              >
                <option value="">⏱️ بدون مهمة محددة</option>
                {open.slice(0, 80).map((t) => (
                  <option key={t.id} value={t.id}>
                    📋 {t.title}{t.date !== today ? ` · ${dmOf(t.date)}` : ""}
                  </option>
                ))}
              </select>
              <select
                className="tinput"
                value={running ? planner.timer!.cat : manualCat || catIds[0] || "other"}
                disabled={running || !!selTask}
                onChange={(e) => setManualCat(e.target.value)}
                aria-label="المادة"
              >
                {catIds.map((id) => (
                  <option key={id} value={id}>{catName(planner, id)}</option>
                ))}
              </select>
              {running ? (
                <button onClick={onStop} className="btn-danger big">وقّف وسجّل</button>
              ) : (
                <button
                  onClick={() => {
                    const cat = selTask
                      ? open.find((x) => x.id === selTask)?.cat || catIds[0] || "other"
                      : manualCat || catIds[0] || "other";
                    api.startTimer(cat, selTask || undefined);
                    onToast(selTask ? "التايمر اشتغل على المهمة 💪" : "بدأ التايمر. بالتوفيق! 💪");
                  }}
                  className="btn-accent big"
                >
                  ابدأ المذاكرة
                </button>
              )}
            </div>
          </div>

          {/* حلقة التقدم لهدف النهارده */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 shrink-0 order-1 md:order-2" role="img" aria-label={`ذاكرت النهارده ${fmtDur(todaySecs)} من هدف ${fmtDur(tgt)}`}>
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--surface-2)" strokeWidth="7" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={tgt > 0 && todaySecs >= tgt ? "var(--accent2)" : "var(--accent)"}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 54}
                strokeDashoffset={2 * Math.PI * 54 * (1 - Math.min(1, tgt > 0 ? todaySecs / tgt : 0))}
                style={{ filter: "drop-shadow(0 0 8px var(--glow))", transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>ذاكرت النهارده</span>
              <span className="font-extrabold text-xl tabular-nums" style={{ color: "var(--ink)" }}>{fmtDur(todaySecs)}</span>
              <span className="text-[0.7rem] font-bold" style={{ color: "var(--accent2)" }}>
                من هدف {fmtDur(tgt)} {tgt > 0 && todaySecs >= tgt ? "🏆" : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="bar" style={{ ["--c" as string]: "var(--accent)" }}>
            <i style={{ width: `${Math.min(100, tgt > 0 ? (todaySecs / tgt) * 100 : 0)}%` }} />
          </div>
        </div>
      </section>

      {/* ---------- خلصت المهمة؟ (بعد وقف جلسة مرتبطة بمهمة) ---------- */}
      {stoppedTask && (
        <section className="glass-card p-5 stopped-card animate-pop-in" aria-label="خلصت المهمة؟">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl" aria-hidden>📋</span>
            <div className="flex-1 min-w-[200px]">
              <b className="block text-sm" style={{ color: "var(--ink)" }}>
                ذاكرت {fmtDur(stoppedTask.secs)} على: {stoppedTask.title}
              </b>
              <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
                خلصت المهمة دي؟ علّم عليها وخد {toAr(5)} XP — أوكمّل عليها بعدين.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-accent px-4 py-2 text-sm"
                onClick={() => {
                  api.toggleTask(stoppedTask.id, true);
                  setStoppedTask(null);
                  onToast(`🎉 خلصت المهمة (+${toAr(5)} XP)`);
                }}
              >
                خلصتها 🎉
              </button>
              <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setStoppedTask(null)}>
                لسه شغالة عليها
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ---------- إحصائيات ---------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="glass-card !rounded-2xl p-3.5 text-center">
          <b className="block text-lg font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>{fmtDur(total)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>الإجمالي في التحدي</span>
        </div>
        <div className="glass-card !rounded-2xl p-3.5 text-center">
          <b className="block text-lg font-extrabold tabular-nums" style={{ color: "var(--accent2)" }}>{fmtDur(total / elapsedCount)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>متوسط اليوم</span>
        </div>
        <div className="glass-card !rounded-2xl p-3.5 text-center">
          <b className="block text-lg font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>{best ? fmtDur(best) : "٠ د"}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>أفضل يوم{best ? ` (يوم ${toAr(bi + 1)})` : ""}</span>
        </div>
        <div className="glass-card !rounded-2xl p-3.5 text-center">
          <b className="block text-lg font-extrabold tabular-nums" style={{ color: "var(--accent2)" }}>{toAr(hit)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>أيام حققت الهدف</span>
        </div>
      </div>

      {/* ---------- الرسم البياني اليومي ---------- */}
      <section className="glass-card p-5 sm:p-6" aria-label="الوقت كل يوم">
        <h3 className="font-bold text-lg mb-4" style={{ color: "var(--ink)" }}>الوقت كل يوم (الذهبي = حققت الهدف)</h3>
        <div className="chart" role="img" aria-label="رسم بياني لوقت المذاكرة كل يوم">
          {tgt > 0 && <div className="tgt" style={{ bottom: `${(tgt / mx) * 100}%` }}><span>هدف {fmtDur(tgt)}</span></div>}
          {per.map((s, i) => (
            <div
              key={days[i]}
              className={`col ${tgt > 0 && s >= tgt ? "hit" : ""} ${days[i] > today ? "future" : ""}`}
              title={`يوم ${i + 1}: ${fmtDur(s)}`}
            >
              <i style={{ height: `${Math.round((s / mx) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="xlab">
          {days.map((_, i) => (
            <span key={i}>{i % step === 0 ? toAr(i + 1) : ""}</span>
          ))}
        </div>
      </section>

      {/* ---------- الوقت حسب المادة ---------- */}
      <section className="glass-card p-5 sm:p-6" aria-label="الوقت حسب المادة">
        <h3 className="font-bold text-lg mb-4" style={{ color: "var(--ink)" }}>الوقت حسب المادة</h3>
        <div className="catbars space-y-2.5">
          {Object.keys(catSecs).map((k) => (
            <div key={k} className="r">
              <span style={{ color: "var(--ink)" }}>{catName(planner, k)}</span>
              <div
                className="bar"
                style={{ ["--c" as string]: planner.courses.find((c) => c.id === k) ? `var(--${courseColorVar(planner.courses.find((c) => c.id === k)!.ci)})` : "var(--accent)" }}
              >
                <i style={{ width: `${Math.round((catSecs[k] / catMax) * 100)}%` }} />
              </div>
              <span className="tabular-nums" style={{ color: "var(--ink-dim)" }}>{fmtDur(catSecs[k])}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- هدف المذاكرة + وقت يدوي ---------- */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-5 sm:p-6">
          <h3 className="font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>هدف المذاكرة اليومي</h3>
          <div className="flex items-center gap-2.5">
            <label className="text-sm" style={{ color: "var(--ink-dim)" }} htmlFor="target-hours">ساعات في اليوم</label>
            <input
              id="target-hours"
              className="tinput"
              type="number"
              min="0"
              max="16"
              step="0.5"
              defaultValue={planner.target / 60}
              onBlur={(e) => {
                const h = Number(e.target.value);
                api.setTarget(Math.round(h * 60));
                onToast("تم حفظ هدف المذاكرة ✅");
              }}
              style={{ width: "90px" }}
            />
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6">
          <h3 className="font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>نسيت تشغّل التايمر؟ ضيف وقت يدوي</h3>
          <form
            className="add-form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = manualDate || today;
              const mins = parseInt(manualMin);
              if (!(mins > 0)) return;
              api.addManualTime(d, mins, manualCat || catIds[0] || "other");
              const xp = Math.floor((mins * 60) / 300);
              onToast(`⏱️ اتضاف ${fmtDur(mins * 60)}${xp ? ` (+${toAr(xp)} XP)` : ""}`);
              setManualDate("");
              setManualMin("60");
            }}
          >
            <select className="tinput" value={manualDate} onChange={(e) => setManualDate(e.target.value)} aria-label="اليوم">
              <option value="">النهارده</option>
              {days.map((d, i) => (
                <option key={d} value={d}>يوم {toAr(i + 1)} · {dmOfShort(d)}</option>
              ))}
            </select>
            <input className="tinput" type="number" min="1" max="720" value={manualMin} onChange={(e) => setManualMin(e.target.value)} style={{ width: "90px" }} aria-label="دقائق" />
            <span className="text-sm" style={{ color: "var(--ink-dim)" }}>دقيقة</span>
            <select className="tinput" value={manualCat} onChange={(e) => setManualCat(e.target.value)} aria-label="المادة">
              {catIds.map((id) => (
                <option key={id} value={id}>{catName(planner, id)}</option>
              ))}
            </select>
            <button type="submit" className="btn-accent px-5 py-2.5 text-sm">إضافة الوقت</button>
          </form>
        </div>
      </section>

      {/* ---------- آخر الجلسات ---------- */}
      <section className="glass-card p-5 sm:p-6" aria-label="آخر الجلسات">
        <h3 className="font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>آخر الجلسات</h3>
        {logs.length ? (
          <div className="space-y-2">
            {logs.map((l) => {
              const sure = confirmLog === l.id;
              const c = planner.courses.find((x) => x.id === l.cat);
              return (
                <div key={l.id} className="log-row">
                  <span className="text-sm" style={{ color: "var(--ink)" }}>{dayNameAr(l.date)} {dmOfShort(l.date)}</span>
                  <span className={`cat-chip ${c ? courseColorClassLocal(c.ci) : "ck-def"}`}>{catName(planner, l.cat)}</span>
                  <b className="text-sm tabular-nums" style={{ color: "var(--accent2)" }}>{fmtDur(l.secs)}</b>
                  <button
                    className={sure ? "btn-danger sure" : "btn-danger"}
                    onClick={() => {
                      if (sure) {
                        api.deleteStudyLog(l.id);
                        setConfirmLog(null);
                        onToast("اتمسحت الجلسة");
                      } else setConfirmLog(l.id);
                    }}
                  >
                    {sure ? "تأكيد" : "مسح"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--ink-dim)" }}>لسه مفيش جلسات. شغّل التايمر أو ضيف وقت يدوي.</p>
        )}
      </section>

      <p className="text-[0.68rem] text-center" style={{ color: "var(--ink-dim)" }}>
        كل ٥ دقايق مذاكرة = {toAr(1)} XP — التايمر بيكمّل عد حتى لو قفلت الصفحة، وبيتحفظ على جهازك.
      </p>
    </div>
  );
}

/* مساعدات صغيرة محلية */
const MONTHS_SHORT = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const WD_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function dmOfShort(s: string): string {
  const a = s.split("-").map(Number);
  return `${a[2]} ${MONTHS_SHORT[a[1] - 1]}`;
}

function dayNameAr(s: string): string {
  const a = s.split("-").map(Number);
  return WD_AR[new Date(a[0], a[1] - 1, a[2]).getDay()];
}

function courseColorClassLocal(ci: number): string {
  return `cc-${((ci % 8) + 8) % 8}`;
}
