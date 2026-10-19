"use client";

import { ACHIEVEMENTS } from "@/lib/data";
import type { PlannerApi } from "@/lib/planner";
import { plannerMetrics, toAr } from "@/lib/planner";
import type { Logs } from "@/lib/storage";
import { dayCount } from "@/lib/storage";

/* =========================================================
   تبويب «إنجازاتي» — المستوى و XP وكل الأوسمة في مكان واحد
   (صلوات + تاسكات + مذاكرة — نظام XP موحد)
   ========================================================= */

const XP_PER_LEVEL = 100;

/** تنسيق مختصر بالساعات للكروت الصغيرة: ٠ ساعة / ١٫٥ ساعة */
function fmtHrs(secs: number): string {
  const h = Math.round(secs / 360) / 10;
  return `${toAr(String(h)).replace(".", "٫")} ساعة`;
}

export default function AchievementsSection({
  api,
  logs,
  xpTotal,
  unlocked,
  streak,
  bestStreak,
}: {
  api: PlannerApi;
  logs: Logs;
  xpTotal: number;
  unlocked: string[];
  streak: number;
  bestStreak: number;
}) {
  const { planner } = api;
  const m = plannerMetrics(planner);
  const level = Math.floor(xpTotal / XP_PER_LEVEL) + 1;
  const into = xpTotal % XP_PER_LEVEL;
  const prayersTotal = Object.values(logs).reduce((a, log) => a + dayCount(log), 0);

  const groups: { key: "prayer" | "study"; title: string; hint: string }[] = [
    { key: "prayer", title: "🕌 أوسمة الصلوات", hint: "بتفتحها لما تسجّل صلواتك وستمّ السلسلة" },
    { key: "study", title: "📚 أوسمة المذاكرة والمهام", hint: "بتفتحها لما تخلّص مهامك وتذاكر بالتايمر" },
  ];

  const badgeCard = (id: string, i: number) => {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return null;
    const got = unlocked.includes(a.id);
    return (
      <div
        key={a.id}
        className={`achv-badge ${got ? "got" : ""} animate-rise`}
        style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s` }}
        title={a.description}
      >
        <span className="em" aria-hidden>{got ? a.emoji : "🔒"}</span>
        <b style={{ color: got ? "var(--accent2)" : "var(--ink-dim)" }}>{a.name}</b>
        <span>{a.description}</span>
        {got && <span className="got-tag">+{toAr(20)} XP</span>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ---------- كارت المستوى ---------- */}
      <section className="hero-card p-6 sm:p-8 animate-rise" aria-label="المستوى والنقاط">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full order-2 md:order-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-4xl" aria-hidden>🏆</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--accent)" }}>
                إنجازاتي
              </h2>
              <span className="chip">🏅 {toAr(unlocked.length)} / {toAr(ACHIEVEMENTS.length)} وسام</span>
            </div>
            <p className="font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              المستوى {toAr(level)} — {into}/{toAr(XP_PER_LEVEL)} XP للمستوى الجاي
            </p>
            <div className="bar lvl-bar" style={{ ["--c" as string]: "var(--accent)" }}>
              <i style={{ width: `${into}%` }} />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--ink-dim)" }}>
              ✨ {toAr(xpTotal)} XP إجمالي — كل صلاة {toAr(10)}، اليوم الكامل {toAr(25)}+، كل مهمة {toAr(5)}، يوم مهام كامل {toAr(15)}+، كل ٥ دقايق مذاكرة {toAr(1)}، وكل وسام {toAr(20)}.
            </p>
          </div>
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 shrink-0 order-1 md:order-2" role="img" aria-label={`المستوى ${level}`}>
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--surface-2)" strokeWidth="7" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke="var(--accent2)" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 54}
                strokeDashoffset={2 * Math.PI * 54 * (1 - into / XP_PER_LEVEL)}
                style={{ filter: "drop-shadow(0 0 8px var(--glow))", transition: "stroke-dashoffset .6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>المستوى</span>
              <span className="text-4xl font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>{toAr(level)}</span>
              <span className="text-[0.68rem] font-bold" style={{ color: "var(--accent2)" }}>✨ {toAr(xpTotal)} XP</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- إحصائيات سريعة ---------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" aria-label="ملخص الإنجازات">
        <div className="glass-card !rounded-2xl p-3.5 text-center qstat">
          <b className="block text-xl font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>🕌 {toAr(prayersTotal)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>صلاة مسجلة</span>
        </div>
        <div className="glass-card !rounded-2xl p-3.5 text-center qstat">
          <b className="block text-xl font-extrabold tabular-nums" style={{ color: "var(--accent2)" }}>🔥 {toAr(streak)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>سلسلة الصلوات (الأفضل {toAr(bestStreak)})</span>
        </div>
        <div className="glass-card !rounded-2xl p-3.5 text-center qstat">
          <b className="block text-xl font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>✅ {toAr(m.done)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>مهمة خلصت من {toAr(m.total)}</span>
        </div>
        <div className="glass-card !rounded-2xl p-3.5 text-center qstat">
          <b className="block text-xl font-extrabold tabular-nums" style={{ color: "var(--accent2)" }}>⏱️ {fmtHrs(m.study)}</b>
          <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>وقت مذاكرة إجمالي</span>
        </div>
      </div>

      {/* ---------- الأوسمة ---------- */}
      {groups.map((g) => {
        const ids = ACHIEVEMENTS.filter((a) => a.group === g.key).map((a) => a.id);
        const gotN = ids.filter((id) => unlocked.includes(id)).length;
        return (
          <section key={g.key} className="glass-card p-5 sm:p-6" aria-label={g.title}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>{g.title}</h3>
              <span className="chip mr-auto">{toAr(gotN)} / {toAr(ids.length)}</span>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--ink-dim)" }}>{g.hint}</p>
            <div className="achv-grid">
              {ids.map((id, i) => badgeCard(id, i))}
            </div>
          </section>
        );
      })}

      <p className="text-[0.68rem] text-center" style={{ color: "var(--ink-dim)" }}>
        الأوسمة بتتحفظ على جهازك وبتنحسب أوتوماتيك من صلواتك ومهامك ووقت مذاكرتك — كمّل، لسه في أوسمة مستنياك 💪
      </p>
    </div>
  );
}
