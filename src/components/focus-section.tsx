"use client";

import { useEffect, useState } from "react";
import { dayKey } from "@/lib/prayer";
import type { PlannerApi } from "@/lib/planner";
import {
  clockFmt,
  fmtDur,
  plannerMetrics,
  splitSession,
  tasksOn,
  toAr,
} from "@/lib/planner";
import TasksSection from "./tasks-section";
import TimerSection from "./timer-section";
import StudySection from "./study-section";

/* =========================================================
   القسم الموحّد «التاسكات + التايمر + وقت المذاكرة»
   قسم واحد منظم جدًا:
     - شريط «اليوم في لمحة» بيجمع أرقام النهارده كلها في سطر
     - ٣ تبويبات فرعية: التاسكات / التايمر / وقت المذاكرة
     - مؤشر حي للتايمر الشغّال ظاهر في أي تبويب
   ========================================================= */

type FocusTab = "tasks" | "timer" | "study";

export default function FocusSection({
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

  const [tab, setTab] = useState<FocusTab>(() => {
    if (typeof window === "undefined") return "tasks";
    const t = window.localStorage.getItem("sakinah.focusTab");
    return t === "timer" || t === "study" ? t : "tasks";
  });

  useEffect(() => {
    window.localStorage.setItem("sakinah.focusTab", tab);
  }, [tab]);

  /* ---------- التايمر الشغّال (مؤشر حي في كل مكان) ---------- */
  const running = !!planner.timer;
  const elapsed = running ? (now.getTime() - (planner.timer?.start ?? 0)) / 1000 : 0;
  const runningTask =
    planner.timer?.taskId
      ? planner.tasks.find((t) => t.id === planner.timer!.taskId) ?? null
      : null;

  /* ---------- أرقام النهارده (تاسكات + مذاكرة) ---------- */
  const tgt = planner.target * 60;
  const todaySecs =
    planner.studyLog.filter((l) => l.date === today).reduce((a, l) => a + l.secs, 0) +
    (planner.timer
      ? splitSession(planner.timer.start, now.getTime())
          .filter((x) => x.date === today)
          .reduce((a, x) => a + x.secs, 0)
      : 0);

  const tToday = tasksOn(planner, today);
  const tDone = tToday.filter((t) => t.done).length;
  const m = plannerMetrics(planner);

  return (
    <div className="space-y-5">
      {/* ---------- شريط «اليوم في لمحة» ---------- */}
      <section className="glass-card px-4 py-3.5 animate-rise" aria-label="اليوم في لمحة">
        <p className="text-[0.68rem] mb-2" style={{ color: "var(--ink-dim)" }}>
          📌 كل حاجة في مكان واحد: مهامك + التايمر + وقت المذاكرة بالتفصيل
        </p>
        <div className="today-strip">
          <span className="chip">
            📋 مهام النهارده: <b style={{ color: "var(--accent)" }}>{toAr(tDone)}</b> / {toAr(tToday.length)}
          </span>
          <span className="chip">
            ⏱️ ذاكرت النهارده: <b style={{ color: "var(--accent2)" }}>{fmtDur(todaySecs)}</b>
            {tgt > 0 ? ` من ${fmtDur(tgt)}` : ""}
          </span>
          <span className="chip">🔥 {toAr(m.cur)} أيام كاملة ورا بعض</span>
          {running && (
            <button
              className="chip run-task-chip today-live"
              onClick={() => setTab("timer")}
              title="التايمر شغّال دلوقتي — اضغط لفتح التايمر"
            >
              ● شغّال {clockFmt(elapsed)}
              {runningTask ? ` · ${runningTask.title}` : ""}
            </button>
          )}
        </div>
      </section>

      {/* ---------- تبويبات القسم الموحد ---------- */}
      <div className="sub-tabs focus-tabs" role="tablist" aria-label="التاسكات والتايمر ووقت المذاكرة">
        {([
          ["tasks", "📋 التاسكات"],
          ["timer", running ? "⏱️ التايمر ●" : "⏱️ التايمر"],
          ["study", "📚 وقت المذاكرة"],
        ] as [FocusTab, string][]).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={id === "timer" && running ? "live" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---------- محتوى القسم الموحد ---------- */}
      {tab === "tasks" ? (
        <TasksSection api={api} onToast={onToast} goTimer={() => setTab("timer")} />
      ) : tab === "timer" ? (
        <TimerSection api={api} now={now} onToast={onToast} />
      ) : (
        <StudySection api={api} now={now} onToast={onToast} />
      )}
    </div>
  );
}
