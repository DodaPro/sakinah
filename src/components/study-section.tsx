"use client";

import { useState } from "react";
import { dayKey } from "@/lib/prayer";
import type { PlannerApi } from "@/lib/planner";
import {
  addDaysIso,
  catIdsOf,
  catName,
  challengeDays,
  courseColorVar,
  dmOf,
  dayNameOf,
  fmtDur,
  splitSession,
  toAr,
  totalStudySecs,
} from "@/lib/planner";

/* =========================================================
   تبويب «وقت المذاكرة» — إحصائيات الوقت بالتفصيل
   (أسبوع / متوسط / أفضل يوم / رسم يومي / مواد / هدف / وقت يدوي / جلسات)
   ========================================================= */

/** تنسيق ساعات برقم عشري عربي: ٢٫٥ ساعة */
function fmtHours(secs: number): string {
  const h = Math.round(secs / 360) / 10;
  return `${toAr(String(h)).replace(".", "٫")} ساعة`;
}

export default function StudySection({
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
  const days = challengeDays(planner);
  const tgt = planner.target * 60;
  const runParts = planner.timer ? splitSession(planner.timer.start, now.getTime()) : [];

  /* ---------- الأرقام ---------- */
  const weekStart = addDaysIso(today, -6);
  const weekSecs =
    planner.studyLog.filter((l) => l.date >= weekStart && l.date <= today).reduce((a, l) => a + l.secs, 0) +
    runParts.reduce((a, x) => a + x.secs, 0);

  const per = days.map(
    (d) =>
      planner.studyLog.filter((l) => l.date === d).reduce((a, l) => a + l.secs, 0) +
      runParts.filter((x) => x.date === d).reduce((a, x) => a + x.secs, 0)
  );
  const elapsed = days.filter((d) => d <= today).length || 1;
  const avg = totalStudySecs(planner) / elapsed;
  const best = Math.max(...per, 0);
  const bi = per.indexOf(best);
  const hit = days.filter((_, i) => tgt > 0 && per[i] >= tgt).length;

  /* ---------- الوقت حسب المادة ---------- */
  const catIds = catIdsOf(planner);
  const catSecs: Record<string, number> = {};
  catIds.forEach((k) => (catSecs[k] = 0));
  planner.studyLog.forEach((l) => {
    const id = catSecs[l.cat] == null ? "other" : l.cat;
    catSecs[id] += l.secs;
  });
  // الوقت الشغال دلوقتي في التايمر بيتراكم على مادته
  if (planner.timer) {
    const id = catSecs[planner.timer.cat] == null ? "other" : planner.timer.cat;
    catSecs[id] += runParts.reduce((a, x) => a + x.secs, 0);
  }
  const catMax = Math.max(...Object.values(catSecs), 1);

  /* ---------- الرسم اليومي ---------- */
  const mx = Math.max(tgt, best, 600);
  const step = Math.ceil(days.length / 15);

  /* ---------- وقت يدوي ---------- */
  const [mDate, setMDate] = useState(today);
  const [mMin, setMMin] = useState("60");
  const [mCat, setMCat] = useState("");
  const [confirmLog, setConfirmLog] = useState<string | null>(null);

  const logs = [...planner.studyLog]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 30);

  return (
    <div className="space-y-5">
      {/* ---------- العنوان ---------- */}
      <section className="hero-card p-6 sm:p-8 animate-rise" aria-label="وقت المذاكرة">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl" aria-hidden>📚</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--accent)" }}>
            وقت المذاكرة
          </h2>
          <span className="chip mr-auto">⏱️ {fmtDur(totalStudySecs(planner))} إجمالي</span>
        </div>
        <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
          كل دقيقة بتذاكرها بتتحسب هنا — من التايمر أو وقت يدوي، وكل ٥ دقايق = {toAr(1)} XP.
        </p>
      </section>

      {/* ---------- الإحصائيات الأربع ---------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" aria-label="إحصائيات الوقت">
        <div className="glass-card !rounded-2xl p-3.5 text-center qstat">
          <b className="block text-lg font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>{fmtHours(weekSecs)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>إجمالي الأسبوع ده</span>
        </div>
        <div className="glass-card !rounded-2xl p-3.5 text-center qstat">
          <b className="block text-lg font-extrabold tabular-nums" style={{ color: "var(--accent2)" }}>{fmtHours(avg)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>المتوسط اليومي</span>
        </div>
        <div className="glass-card !rounded-2xl p-3.5 text-center qstat">
          <b className="block text-lg font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>{best ? fmtDur(best) : "٠ د"}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>
            أفضل يوم{best ? ` (يوم ${toAr(bi + 1)} · ${dmOf(days[bi])})` : ""}
          </span>
        </div>
        <div className="glass-card !rounded-2xl p-3.5 text-center qstat">
          <b className="block text-lg font-extrabold tabular-nums" style={{ color: "var(--accent2)" }}>{toAr(hit)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>أيام حققت الهدف</span>
        </div>
      </div>

      {/* ---------- الرسم البياني اليومي ---------- */}
      <section className="glass-card p-5 sm:p-6" aria-label="الوقت كل يوم">
        <h3 className="font-bold text-lg mb-4" style={{ color: "var(--ink)" }}>
          الوقت كل يوم <span className="text-xs font-normal" style={{ color: "var(--ink-dim)" }}>(اللون الذهبي = حققت هدف اليوم)</span>
        </h3>
        <div className="chart" role="img" aria-label="رسم بياني لوقت المذاكرة كل يوم">
          {tgt > 0 && <div className="tgt" style={{ bottom: `${(tgt / mx) * 100}%` }}><span>الهدف {fmtDur(tgt)}</span></div>}
          {per.map((s, i) => (
            <div
              key={days[i]}
              className={`col ${tgt > 0 && s >= tgt ? "hit" : ""} ${days[i] > today ? "future" : ""}`}
              title={`يوم ${i + 1} · ${dayNameOf(days[i])}: ${fmtDur(s)}`}
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
          {Object.keys(catSecs).map((k) => {
            const c = planner.courses.find((x) => x.id === k);
            return (
              <div key={k} className="r">
                <span style={{ color: "var(--ink)" }}>{catName(planner, k)}</span>
                <div className="bar" style={{ ["--c" as string]: c ? `var(--${courseColorVar(c.ci)})` : "var(--accent)" }}>
                  <i style={{ width: `${Math.round((catSecs[k] / catMax) * 100)}%` }} />
                </div>
                <span className="tabular-nums" style={{ color: "var(--ink-dim)" }}>{fmtDur(catSecs[k])}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- هدف المذاكرة + وقت يدوي ---------- */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-5 sm:p-6">
          <h3 className="font-bold text-lg mb-1" style={{ color: "var(--ink)" }}>🎯 هدف المذاكرة اليومي</h3>
          <p className="text-xs mb-3" style={{ color: "var(--ink-dim)" }}>
            هدفك دلوقتي {fmtDur(tgt)} كل يوم — {toAr(hit)} يوم حققته لحد دلوقتي.
          </p>
          <div className="flex items-center gap-2.5">
            <label className="text-sm" style={{ color: "var(--ink-dim)" }} htmlFor="study-target-hours">ساعات في اليوم</label>
            <input
              id="study-target-hours"
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
          <h3 className="font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>✍️ ضيف وقت يدوي (نسيت التايمر؟)</h3>
          <form
            className="add-form"
            onSubmit={(e) => {
              e.preventDefault();
              const mins = parseInt(mMin);
              if (!(mins > 0) || !mDate) return;
              api.addManualTime(mDate, mins, mCat || catIds[0] || "other");
              const xp = Math.floor((mins * 60) / 300);
              onToast(`⏱️ اتضاف ${fmtDur(mins * 60)} يوم ${dmOf(mDate)}${xp ? ` (+${toAr(xp)} XP)` : ""}`);
              setMMin("60");
            }}
          >
            <input
              className="tinput"
              type="date"
              value={mDate}
              max={today}
              onChange={(e) => setMDate(e.target.value)}
              aria-label="التاريخ"
            />
            <input className="tinput" type="number" min="1" max="720" value={mMin} onChange={(e) => setMMin(e.target.value)} style={{ width: "84px" }} aria-label="الدقائق" />
            <select className="tinput" value={mCat} onChange={(e) => setMCat(e.target.value)} aria-label="المادة">
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
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>آخر الجلسات</h3>
          <span className="chip mr-auto">{toAr(logs.length)} جلسة</span>
        </div>
        {logs.length ? (
          <div className="space-y-2">
            {logs.map((l) => {
              const sure = confirmLog === l.id;
              const c = planner.courses.find((x) => x.id === l.cat);
              const task = l.taskId ? planner.tasks.find((t) => t.id === l.taskId) : null;
              return (
                <div key={l.id} className="log-row">
                  <span className="text-sm" style={{ color: "var(--ink)" }}>{dayNameOf(l.date)} {dmOf(l.date)}</span>
                  <span className={`cat-chip ${c ? `cc-${((c.ci % 8) + 8) % 8}` : "ck-def"}`}>{catName(planner, l.cat)}</span>
                  {task && <span className="log-task" title={task.title}>📋 {task.title}</span>}
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
          <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
            لسه مفيش جلسات مسجلة — شغّل التايمر أو ضيف وقت يدوي والوقت هيظهر هنا.
          </p>
        )}
      </section>

      <p className="text-[0.68rem] text-center" style={{ color: "var(--ink-dim)" }}>
        كل جلسة شغّلها من التايمر بتتسجل هنا أوتوماتيك — ولو مرتبطة بمهمة من التاسكات، وقتها بيتجمع على المهمة نفسها.
      </p>
    </div>
  );
}
