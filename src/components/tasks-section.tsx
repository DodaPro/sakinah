"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlannerApi, PlannerTab, TaskDef } from "@/lib/planner";
import {
  REST_OPTIONS,
  UNIT_SUGGESTIONS,
  catIdsOf,
  catName,
  challengeDays,
  challengeMsg,
  courseDates,
  courseColorClass,
  courseColorVar,
  courseStat,
  dayNameOf,
  diffDays,
  dmOf,
  isRestDay,
  plannerMetrics,
  tasksOn,
  toAr,
} from "@/lib/planner";

/* =========================================================
   تبويب «التاسكات» — اليوم / الخطة كاملة / كورساتي
   مدمج من المشروع الأصلي Challenge Planner
   ========================================================= */

const PENCIL = "✏️";

export default function TasksSection({
  api,
  onToast,
}: {
  api: PlannerApi;
  onToast: (msg: string) => void;
}) {
  const { planner } = api;
  const [tab, setTab] = useState<PlannerTab>(() => {
    if (typeof window === "undefined") return "today";
    const t = window.localStorage.getItem("sakinah.plannerTab");
    return t === "plan" || t === "courses" ? t : "today";
  });
  const [day, setDay] = useState<string>("");
  const [editing, setEditing] = useState<TaskDef | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [addingOn, setAddingOn] = useState<string | null>(null);
  const [cf, setCf] = useState<{ id: string | null; name: string; unit: string; total: string; from: string; to: string }>({
    id: null, name: "", unit: "فيديو", total: "", from: "1", to: "",
  });
  const [sf, setSf] = useState<{ start: string; days: string; rest: string; dream: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("sakinah.plannerTab", tab);
  }, [tab]);

  const days = challengeDays(planner);
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const effectiveDay = day || (today < days[0] ? days[0] : today > days[days.length - 1] ? days[days.length - 1] : today);
  const m = plannerMetrics(planner);
  const catIds = catIdsOf(planner);

  const setTabClean = (t: PlannerTab) => {
    setTab(t);
    setEditing(null);
    setConfirmDel(null);
    setAddingOn(null);
    setConfirmReset(false);
    if (t !== "courses") setCf({ id: null, name: "", unit: "فيديو", total: "", from: "1", to: "" });
  };

  /* ---------------- صف مهمة ---------------- */
  const taskRow = (t: TaskDef, full: boolean) => {
    if (editing && editing.id === t.id) {
      return (
        <form
          key={t.id}
          className="trow eform"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editing.title.trim()) return;
            api.editTask(t.id, { title: editing.title.trim(), date: editing.date, cat: editing.cat });
            setEditing(null);
            onToast("تم حفظ التعديل ✅");
          }}
        >
          <input
            className="tinput"
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            aria-label="اسم المهمة"
            autoFocus
          />
          <select className="tinput" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} aria-label="اليوم">
            {days.map((d, i) => (
              <option key={d} value={d}>يوم {toAr(i + 1)} · {dayNameOf(d)} {dmOf(d)}</option>
            ))}
          </select>
          <select className="tinput" value={editing.cat} onChange={(e) => setEditing({ ...editing, cat: e.target.value })} aria-label="المادة">
            {catIds.map((id) => (
              <option key={id} value={id}>{catName(planner, id)}</option>
            ))}
          </select>
          <div className="ef-actions">
            <button type="submit" className="btn-accent px-4 py-2 text-sm">حفظ</button>
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => setEditing(null)}>إلغاء</button>
            <button
              type="button"
              className={confirmDel === t.id ? "btn-danger sure" : "btn-danger"}
              onClick={() => {
                if (confirmDel === t.id) {
                  api.deleteTask(t.id);
                  setEditing(null);
                  setConfirmDel(null);
                  onToast("اتمسحت المهمة");
                } else setConfirmDel(t.id);
              }}
            >
              {confirmDel === t.id ? "تأكيد المسح" : "مسح"}
            </button>
          </div>
        </form>
      );
    }
    const ck = planner.courses.find((c) => c.id === t.cat);
    return (
      <div key={t.id} className={`trow ${t.done ? "is-done" : ""}`} style={{ ["--tc" as string]: ck ? `var(--${courseColorVar(ck.ci)})` : "var(--accent)" }}>
        <label className="task">
          <input
            type="checkbox"
            checked={t.done}
            onChange={(e) => {
              const afterAllDone = planner.tasks
                .filter((x) => x.date === t.date)
                .every((x) => (x.id === t.id ? e.target.checked : x.done));
              api.toggleTask(t.id, e.target.checked);
              if (e.target.checked && afterAllDone) {
                onToast(`🎉 خلصت كل مهام اليوم ده! (+${toAr(5)} XP للمهمة و+${toAr(15)} بونص اليوم)`);
              } else if (e.target.checked) {
                onToast(`✅ مهمة خلصت (+${toAr(5)} XP)`);
              }
            }}
            aria-label={`إنجاز مهمة ${t.title}`}
          />
          <span className="box" aria-hidden />
          <span className="tt">{t.title}</span>
        </label>
        {full && <span className={`cat-chip ${ck ? courseColorClass(ck.ci) : "ck-def"}`}>{catName(planner, t.cat)}</span>}
        <button
          className="ic"
          onClick={() => { setEditing({ id: t.id, title: t.title, date: t.date, cat: t.cat }); setConfirmDel(null); setAddingOn(null); }}
          aria-label="تعديل المهمة"
          title="تعديل"
        >
          {PENCIL}
        </button>
      </div>
    );
  };

  const addForm = (date: string) => (
    <form
      className="add-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const title = String(fd.get("title") || "").trim();
        const cat = String(fd.get("cat") || catIds[0] || "other");
        if (!title) return;
        api.addTask(date, title, cat);
        onToast("اتضافت المهمة ✅");
        e.currentTarget.reset();
      }}
    >
      <input className="tinput" name="title" placeholder="مهمة جديدة" aria-label="مهمة جديدة" required />
      <select className="tinput" name="cat" aria-label="المادة" defaultValue={catIds[0] || "other"}>
        {catIds.map((id) => (
          <option key={id} value={id}>{catName(planner, id)}</option>
        ))}
      </select>
      <button type="submit" className="btn-accent px-5 py-2.5 text-sm">إضافة</button>
      {addingOn === date && (
        <button type="button" className="btn-ghost px-4 py-2.5 text-sm" onClick={() => setAddingOn(null)}>إلغاء</button>
      )}
    </form>
  );

  const emptyState = () => (
    <div className="glass-card p-6 text-center" style={{ background: "var(--surface)" }}>
      <b className="block mb-1.5" style={{ color: "var(--ink)" }}>لسه مفيش كورسات</b>
      <span className="block text-sm mb-4" style={{ color: "var(--ink-dim)" }}>
        ضيف أول كورس (الاسم، ونوع الوحدة، وعددها) وأنا هقسمه على أيام التحدي.
      </span>
      <button className="btn-accent px-6 py-2.5 text-sm" onClick={() => setTabClean("courses")}>ضيف كورس</button>
    </div>
  );

  /* ---------------- عرض اليوم ---------------- */
  const vToday = () => {
    const d = effectiveDay;
    const ts = tasksOn(planner, d);
    const idx = diffDays(days[0], d);
    const left = ts.filter((t) => !t.done).length;
    return (
      <div className="space-y-4">
        <div className="day-nav">
          <h3 className="font-bold text-lg grow" style={{ color: "var(--ink)" }}>
            {dayNameOf(d)} {dmOf(d)} · يوم {toAr(idx + 1)}
            {isRestDay(planner, d) ? " · يوم راحة" : ""}
          </h3>
          <button className="btn-ghost px-3.5 py-2 text-sm" onClick={() => setDay(days[Math.max(0, idx - 1)])} disabled={d <= days[0]} aria-label="اليوم اللي قبله">→</button>
          <button className="btn-ghost px-3.5 py-2 text-sm" onClick={() => setDay(today)} disabled={d === today}>النهارده</button>
          <button className="btn-ghost px-3.5 py-2 text-sm" onClick={() => setDay(days[Math.min(days.length - 1, idx + 1)])} disabled={d >= days[days.length - 1]} aria-label="اليوم اللي بعده">←</button>
        </div>
        {!planner.courses.length && !planner.tasks.length ? (
          emptyState()
        ) : (
          <>
            <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
              {ts.length ? (left ? `فاضل ${toAr(left)} من ${toAr(ts.length)} مهام` : "خلصت كل مهام اليوم 🎉") : "مفيش مهام لليوم ده"}
            </p>
            <div className="list space-y-2">{ts.map((t) => taskRow(t, true))}</div>
          </>
        )}
        {addForm(d)}
      </div>
    );
  };

  /* ---------------- الخطة كاملة ---------------- */
  const vPlan = () => {
    if (!planner.courses.length && !planner.tasks.length) return <h3 className="font-bold text-lg mb-4" style={{ color: "var(--ink)" }}>الخطة كاملة</h3>;
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>الأيام كلها</h3>
        <div className="week-grid">
          {days.map((d, i) => {
            const ts = tasksOn(planner, d);
            const dn = ts.filter((t) => t.done).length;
            const full = ts.length > 0 && dn === ts.length;
            return (
              <div key={d} className={`dcard ${d === today ? "today" : ""} ${isRestDay(planner, d) ? "restd" : ""}`}>
                <header>
                  <button className="dn" onClick={() => { setDay(d); setTabClean("today"); }}>
                    <b>يوم {toAr(i + 1)}</b>
                    <small>{dayNameOf(d)} {dmOf(d)} · {toAr(dn)}/{toAr(ts.length)}</small>
                  </button>
                  {full ? <span className="pill ok">خلص</span> : d === today ? <span className="pill now">النهارده</span> : d < today && ts.length ? <span className="pill late">فات</span> : isRestDay(planner, d) ? <span className="pill">راحة</span> : null}
                </header>
                <div className="list space-y-2">{ts.map((t) => taskRow(t, false))}</div>
                {addingOn === d ? (
                  addForm(d)
                ) : (
                  <button className="btn-ghost w-full py-2 text-sm" onClick={() => setAddingOn(d)}>+ مهمة</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ---------------- كورساتي ---------------- */
  const prevText = () => {
    const total = Number(cf.total);
    const from = Math.max(1, parseInt(cf.from) || 1);
    const to = Math.min(days.length, parseInt(cf.to) || days.length);
    if (!(total > 0) || to < from) return "";
    let ds = days.slice(from - 1, to);
    const nr = ds.filter((d) => !isRestDay(planner, d));
    if (nr.length) ds = nr;
    const per = total / ds.length;
    return `حوالي ${Math.round(per * 10) / 10} ${cf.unit || "وحدة"} في اليوم، على ${ds.length} يوم`;
  };

  const courseForm = () => {
    const edit = !!cf.id;
    return (
      <form
        className="glass-card p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const total = parseInt(cf.total);
          if (!cf.name.trim() || !(total > 0)) return;
          if (edit && cf.id) {
            api.updateCourse(cf.id, { name: cf.name.trim(), unit: cf.unit || "وحدة", total, from: parseInt(cf.from) || 1, to: parseInt(cf.to) || days.length });
            onToast("تم تحديث الكورس وإعادة توزيع الباقي ✅");
          } else {
            api.addCourse(cf.name.trim(), cf.unit || "وحدة", total, parseInt(cf.from) || 1, parseInt(cf.to) || days.length);
            onToast("اتضاف الكورس واتوزّع على الأيام 🎯");
          }
          setCf({ id: null, name: "", unit: "فيديو", total: "", from: "1", to: "" });
        }}
      >
        <h3 className="font-bold text-lg mb-4" style={{ color: "var(--ink)" }}>{edit ? "تعديل الكورس" : "ضيف كورس جديد"}</h3>
        <div className="fgrid">
          <label className="f wide">
            <span>اسم الكورس</span>
            <input className="tinput" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} placeholder="مثلًا: C# أو الفيزياء أو الإنجليزي" required />
          </label>
          <label className="f">
            <span>نوع الوحدة</span>
            <input className="tinput" value={cf.unit} onChange={(e) => setCf({ ...cf, unit: e.target.value })} list="units-suggestions" required />
            <datalist id="units-suggestions">
              {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
            </datalist>
          </label>
          <label className="f">
            <span>العدد الكلي</span>
            <input className="tinput" type="number" min="1" max="2000" value={cf.total} onChange={(e) => setCf({ ...cf, total: e.target.value })} placeholder="45" required />
          </label>
          <label className="f">
            <span>من يوم</span>
            <input className="tinput" type="number" min="1" max={days.length} value={cf.from} onChange={(e) => setCf({ ...cf, from: e.target.value })} required />
          </label>
          <label className="f">
            <span>لحد يوم</span>
            <input className="tinput" type="number" min="1" max={days.length} value={cf.to || String(days.length)} onChange={(e) => setCf({ ...cf, to: e.target.value })} required />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 mt-4">
          <button type="submit" className="btn-accent px-6 py-2.5 text-sm">{edit ? "حفظ ووزّع الباقي" : "ضيف ووزّع"}</button>
          {edit && (
            <button type="button" className="btn-ghost px-4 py-2.5 text-sm" onClick={() => setCf({ id: null, name: "", unit: "فيديو", total: "", from: "1", to: "" })}>إلغاء</button>
          )}
          {prevText() && <span className="text-xs" style={{ color: "var(--ink-dim)" }}>{prevText()}</span>}
        </div>
      </form>
    );
  };

  const courseCard = (c: (typeof planner.courses)[number]) => {
    const st = courseStat(planner, c);
    const sure = confirmDel === "c:" + c.id;
    const cds = courseDates(planner, c).length;
    const per = Math.round((c.total / cds) * 10) / 10;
    return (
      <div key={c.id} className={`glass-card p-5 course-card ${courseColorClass(c.ci)}`}>
        <div className="cmain">
          <b style={{ color: "var(--ink)" }}>{c.name}</b>
          <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
            {toAr(c.total)} {c.unit} · من يوم {toAr(c.from)} لحد يوم {toAr(c.to)} · حوالي {toAr(per)} في اليوم
          </span>
          <div className="bar" style={{ ["--c" as string]: `var(--${courseColorVar(c.ci)})` }}>
            <i style={{ width: `${st.t ? Math.round((st.d / st.t) * 100) : 0}%` }} />
          </div>
          <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
            خلص {toAr(st.d)} من {toAr(st.t)} {c.unit}
          </span>
        </div>
        <div className="cact">
          <button className="btn-ghost px-3.5 py-2 text-xs" onClick={() => { api.redistributeCourse(c.id); onToast("اتوزّع الباقي من النهارده 🎯"); }}>وزّع الباقي من النهارده</button>
          <button className="btn-ghost px-3.5 py-2 text-xs" onClick={() => { setCf({ id: c.id, name: c.name, unit: c.unit, total: String(c.total), from: String(c.from), to: String(c.to) }); setConfirmDel(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>تعديل</button>
          <button
            className={sure ? "btn-danger sure" : "btn-danger"}
            onClick={() => {
              if (sure) {
                api.deleteCourse(c.id);
                setConfirmDel(null);
                onToast("اتمسح الكورس وكل مهامه");
              } else setConfirmDel("c:" + c.id);
            }}
          >
            {sure ? "تأكيد المسح" : "مسح"}
          </button>
        </div>
      </div>
    );
  };

  const sfState = sf ?? { start: planner.cfg.start, days: String(planner.cfg.days), rest: String(planner.cfg.rest), dream: planner.cfg.dream || "" };

  const vCourses = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>كورساتي</h3>
      {planner.courses.length ? planner.courses.map(courseCard) : (
        <div className="glass-card p-5 text-center">
          <b className="block mb-1" style={{ color: "var(--ink)" }}>لسه مفيش كورسات</b>
          <span className="text-sm" style={{ color: "var(--ink-dim)" }}>
            مثال: «C#» · فيديو · 45 · من يوم 1 لحد يوم 15، وأنا أوزّعها 3 في اليوم.
          </span>
        </div>
      )}
      {!cf.id && courseForm()}

      {/* إعدادات التحدي */}
      <form
        className="glass-card p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          api.updateCfg({
            start: sfState.start,
            days: Math.min(90, Math.max(1, parseInt(sfState.days) || 15)),
            rest: parseInt(sfState.rest),
            dream: sfState.dream,
          });
          onToast("تم حفظ إعدادات التحدي وإعادة توزيع الباقي ✅");
        }}
      >
        <h3 className="font-bold text-lg mb-4" style={{ color: "var(--ink)" }}>إعدادات التحدي</h3>
        <div className="fgrid">
          <label className="f">
            <span>يبدأ يوم</span>
            <input className="tinput" type="date" value={sfState.start} onChange={(e) => setSf({ ...sfState, start: e.target.value })} required />
          </label>
          <label className="f">
            <span>عدد الأيام</span>
            <input className="tinput" type="number" min="1" max="90" value={sfState.days} onChange={(e) => setSf({ ...sfState, days: e.target.value })} required />
          </label>
          <label className="f">
            <span>يوم راحة أسبوعي</span>
            <select className="tinput" value={sfState.rest} onChange={(e) => setSf({ ...sfState, rest: e.target.value })}>
              {REST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="f wide">
            <span>هدفك الكبير</span>
            <input className="tinput" value={sfState.dream} onChange={(e) => setSf({ ...sfState, dream: e.target.value })} placeholder="مثلًا: أشتغل مبرمج باك إند" maxLength={80} />
          </label>
        </div>
        <div className="flex items-center gap-2.5 mt-4">
          <button type="submit" className="btn-accent px-6 py-2.5 text-sm">حفظ الإعدادات</button>
          <span className="text-xs" style={{ color: "var(--ink-dim)" }}>تغيير التاريخ أو عدد الأيام بيعيد توزيع الباقي من كل كورس.</span>
        </div>
      </form>

      {/* ابدأ من الأول */}
      <div className="glass-card p-5 sm:p-6">
        <h3 className="font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>ابدأ من الأول</h3>
        {!confirmReset ? (
          <button className="btn-danger" onClick={() => setConfirmReset(true)}>امسح كل الكورسات والمهام والوقت</button>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="btn-danger sure"
              onClick={() => {
                api.resetPlanner();
                setConfirmReset(false);
                setDay("");
                onToast("بدأت من الأول 🌱");
              }}
            >
              تأكيد: امسح كل حاجة
            </button>
            <button className="btn-ghost px-4 py-2.5 text-sm" onClick={() => setConfirmReset(false)}>إلغاء</button>
          </div>
        )}
      </div>
    </div>
  );

  /* ---------------- هيرو التحدي ---------------- */
  const hero = () => (
    <section className="hero-card p-6 sm:p-8 animate-rise" aria-label="التحدي">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full order-2 md:order-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--accent)" }}>
              <span dir="ltr">Challenge <em className="font-quran not-italic">with me</em></span>
            </h2>
          </div>
          <p className="font-bold text-lg mb-0.5" style={{ color: "var(--ink)" }}>
            {today < days[0] ? `التحدي بيبدأ بعد ${toAr(diffDays(today, days[0]))} يوم` : today > days[days.length - 1] ? "التحدي خلص" : `اليوم ${toAr(diffDays(days[0], today) + 1)} من ${toAr(days.length)}`}
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--ink-dim)" }}>{dmOf(days[0])} – {dmOf(days[days.length - 1])}</p>
          <p className="text-sm mb-2" style={{ color: "var(--ink)" }}>💬 {challengeMsg(planner, m)}</p>
          {planner.cfg.dream && (
            <p className="text-sm font-bold" style={{ color: "var(--accent2)" }}>⭐ هدفي الكبير: {planner.cfg.dream}</p>
          )}
        </div>
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0 order-1 md:order-2" role="img" aria-label={`إنجاز ${m.pct} بالمئة`}>
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--surface-2)" strokeWidth="9" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="var(--accent)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={2 * Math.PI * 45 * (1 - m.pct / 100)}
              style={{ filter: "drop-shadow(0 0 8px var(--glow))", transition: "stroke-dashoffset .6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold tabular-nums" style={{ color: "var(--ink)" }} dir="ltr">{toAr(m.pct)}%</span>
            <span className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>{toAr(m.done)} من {toAr(m.total)} مهمة</span>
          </div>
        </div>
      </div>
    </section>
  );

  const statsRow = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="glass-card !rounded-2xl p-3.5 text-center">
        <b className="block text-xl font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>🔥 {toAr(m.cur)}</b>
        <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>أيام كاملة ورا بعض</span>
      </div>
      <div className="glass-card !rounded-2xl p-3.5 text-center">
        <b className="block text-xl font-extrabold tabular-nums" style={{ color: "var(--accent2)" }}>{toAr(m.overdue)}</b>
        <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>{m.overdue ? "مهام متأخرة" : "مفيش متأخرات"}</span>
      </div>
      <div className="glass-card !rounded-2xl p-3.5 text-center">
        <b className="block text-xl font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>{toAr(m.units)}</b>
        <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>وحدة اتعملت</span>
      </div>
      <div className="glass-card !rounded-2xl p-3.5 text-center">
        <b className="block text-xl font-extrabold tabular-nums" style={{ color: "var(--accent2)" }}>{toAr(m.pct)}٪</b>
        <span className="text-[0.68rem]" style={{ color: "var(--ink-dim)" }}>من التحدي كله</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {hero()}
      {statsRow()}

      {/* تبويبات فرعية */}
      <div className="sub-tabs" role="tablist" aria-label="أقسام التاسكات">
        {([["today", "اليوم"], ["plan", "الخطة كاملة"], ["courses", "كورساتي"]] as [PlannerTab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTabClean(id)}>
            {label}
          </button>
        ))}
      </div>

      <section className="glass-card p-5 sm:p-6" aria-label="محتوى التاسكات">
        {tab === "today" ? vToday() : tab === "plan" ? vPlan() : vCourses()}
      </section>

      <p className="text-[0.68rem] text-center" style={{ color: "var(--ink-dim)" }}>
        كل حاجة بتتحفظ تلقائيًا على جهازك — كل مهمة تخلّصها بتديك {toAr(5)} XP، وكل يوم كامل بونص {toAr(15)} XP.
      </p>
    </div>
  );
}
