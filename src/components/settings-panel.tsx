"use client";

import { useState } from "react";
import { ADHAN_VOICES, ACHIEVEMENTS, CALC_METHODS, CITIES, LEVEL_TITLES, MOODS, THEMES } from "@/lib/data";
import type { AppSettings } from "@/lib/storage";
import { toArabicDigits } from "@/lib/prayer";

type Tab = "appearance" | "adhan" | "location" | "data";

function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl text-right transition-colors"
      style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}
    >
      <span>
        <span className="block font-bold text-sm" style={{ color: "var(--ink)" }}>{label}</span>
        {hint && <span className="block text-xs mt-0.5" style={{ color: "var(--ink-dim)" }}>{hint}</span>}
      </span>
      <span
        className="relative w-12 h-7 rounded-full transition-colors shrink-0"
        style={{ background: checked ? "var(--accent)" : "var(--surface-2)", border: "1px solid var(--surface-border)" }}
      >
        <span
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-all"
          style={{
            background: checked ? "var(--on-accent)" : "var(--ink-dim)",
            right: checked ? "3px" : "calc(100% - 23px)",
          }}
        />
      </span>
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-sm font-bold mb-1.5" style={{ color: "var(--ink)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 rounded-2xl text-sm font-semibold appearance-none cursor-pointer"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          color: "var(--ink)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "var(--bg2)", color: "var(--ink)" }}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SettingsPanel({
  open,
  settings,
  onChange,
  onClose,
  onTestAdhan,
  adhanTesting,
  onResetData,
  stats,
}: {
  open: boolean;
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
  onTestAdhan: () => void;
  adhanTesting: boolean;
  onResetData: () => void;
  stats: {
    total: number;
    streak: number;
    xp: number;
    level: number;
    best: number;
    unlockedAchievements?: string[];
  };
}) {
  const [tab, setTab] = useState<Tab>("appearance");
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "appearance", label: "المظهر", icon: "🎨" },
    { id: "adhan", label: "الأذان", icon: "🔊" },
    { id: "location", label: "الموقع", icon: "📍" },
    { id: "data", label: "بياناتي", icon: "💾" },
  ];

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="الإعدادات">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="absolute inset-y-0 left-0 w-full sm:max-w-md flex flex-col animate-rise overflow-hidden"
        style={{
          background: "var(--bg1)",
          borderInlineEnd: "1px solid var(--surface-border)",
          boxShadow: "8px 0 60px -20px rgba(0,0,0,0.7)",
        }}
      >
        {/* الرأس */}
        <div className="flex items-center justify-between p-5 pb-3" style={{ borderBottom: "1px solid var(--surface-border)" }}>
          <h2 className="text-xl font-extrabold" style={{ color: "var(--ink)" }}>
            ⚙️ الإعدادات
          </h2>
          <button onClick={onClose} aria-label="إغلاق الإعدادات" className="btn-ghost w-10 h-10 flex items-center justify-center text-lg">
            ✕
          </button>
        </div>

        {/* التبويبات */}
        <div className="flex gap-2 p-4 pb-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all"
              style={{
                background: tab === t.id ? "var(--accent)" : "var(--surface)",
                color: tab === t.id ? "var(--on-accent)" : "var(--ink-dim)",
                border: "1px solid " + (tab === t.id ? "transparent" : "var(--surface-border)"),
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-4">
          {tab === "appearance" && (
            <>
              <section>
                <h3 className="font-bold mb-2.5 text-sm" style={{ color: "var(--ink)" }}>🎭 غيّر الشكل على مزاجك</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() =>
                        onChange({ mood: m.id, theme: m.theme, animations: m.animations })
                      }
                      className="p-3 rounded-2xl text-right transition-all"
                      style={{
                        background: settings.mood === m.id ? "var(--accent)" : "var(--surface)",
                        border: "1px solid " + (settings.mood === m.id ? "transparent" : "var(--surface-border)"),
                      }}
                    >
                      <span className="text-xl block mb-0.5">{m.emoji} <b className="text-sm" style={{ color: settings.mood === m.id ? "var(--on-accent)" : "var(--ink)" }}>{m.name}</b></span>
                      <span className="text-[0.68rem] leading-snug block" style={{ color: settings.mood === m.id ? "var(--on-accent)" : "var(--ink-dim)" }}>
                        {m.description}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-bold mb-2.5 text-sm" style={{ color: "var(--ink)" }}>🖼️ الثيمات ({toArabicDigits(THEMES.length)})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onChange({ theme: t.id, mood: null })}
                      aria-label={`ثيم ${t.name}`}
                      className="p-2.5 rounded-2xl transition-all hover:scale-[1.03]"
                      style={{
                        background: "var(--surface)",
                        border: settings.theme === t.id ? "2px solid var(--accent)" : "1px solid var(--surface-border)",
                        boxShadow: settings.theme === t.id ? "0 0 18px -4px var(--glow)" : "none",
                      }}
                    >
                      <span className="flex gap-1 mb-1.5">
                        {t.colors.map((c, i) => (
                          <span key={i} className="w-full h-5 rounded-md" style={{ background: c, border: "1px solid rgba(128,128,128,0.3)" }} />
                        ))}
                      </span>
                      <span className="text-xs font-bold" style={{ color: settings.theme === t.id ? "var(--accent)" : "var(--ink-dim)" }}>
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-bold mb-2.5 text-sm" style={{ color: "var(--ink)" }}>🎨 غيّر الألوان برحتك</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="p-3 rounded-2xl flex items-center gap-2.5 cursor-pointer" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
                    <input
                      type="color"
                      value={settings.customAccent ?? "#34d399"}
                      onChange={(e) => onChange({ customAccent: e.target.value })}
                      className="w-9 h-9"
                      aria-label="اللون الأساسي"
                    />
                    <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>اللون الأساسي</span>
                  </label>
                  <label className="p-3 rounded-2xl flex items-center gap-2.5 cursor-pointer" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
                    <input
                      type="color"
                      value={settings.customAccent2 ?? "#fbbf24"}
                      onChange={(e) => onChange({ customAccent2: e.target.value })}
                      className="w-9 h-9"
                      aria-label="اللون الثانوي"
                    />
                    <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>اللون الثانوي</span>
                  </label>
                </div>
                {(settings.customAccent || settings.customAccent2) && (
                  <button
                    onClick={() => onChange({ customAccent: null, customAccent2: null })}
                    className="btn-ghost w-full py-2 text-xs mt-2.5"
                  >
                    ↩️ رجّع ألوان الثيم الأصلية
                  </button>
                )}
              </section>

              <Switch
                checked={settings.animations}
                onChange={(v) => onChange({ animations: v, ...(v ? {} : {}) })}
                label="✨ تشغيل الأنميشنات"
                hint="الحركات والتوهجات والألعاب النارية — اقفلها لو بتحب شكل هادي تمامًا"
              />

              <Switch
                checked={settings.bgAnim && settings.animations}
                onChange={(v) => onChange({ bgAnim: v })}
                label="🌌 أنميشن الخلفية"
                hint="نجوم متلألئة وهالات ضوئية بتتحرك ورا المحتوى — بيتقفل تلقائي مع قفل الأنميشنات"
              />
            </>
          )}

          {tab === "adhan" && (
            <>
              <Switch
                checked={settings.adhanEnabled}
                onChange={(v) => onChange({ adhanEnabled: v })}
                label="🔊 تنبيه صوت الأذان"
                hint="يشتغل الأذان الحقيقي تلقائيًا عند وقت كل صلاة"
              />

              <section>
                <h3 className="font-bold mb-2.5 text-sm" style={{ color: "var(--ink)" }}>🎙️ صوت الأذان</h3>
                <div className="space-y-2">
                  {ADHAN_VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onChange({ adhanVoice: v.id })}
                      className="w-full p-3 rounded-2xl text-right transition-all"
                      style={{
                        background: "var(--surface)",
                        border: settings.adhanVoice === v.id ? "2px solid var(--accent)" : "1px solid var(--surface-border)",
                      }}
                    >
                      <span className="block text-sm font-bold" style={{ color: settings.adhanVoice === v.id ? "var(--accent)" : "var(--ink)" }}>
                        {v.name}
                      </span>
                      <span className="block text-xs" style={{ color: "var(--ink-dim)" }}>{v.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              <SelectField
                label="🌄 أذان الفجر مختلف؟"
                value={settings.fajrVoice}
                onChange={(v) => onChange({ fajrVoice: v })}
                options={[
                  { value: "same", label: "نفس صوت باقي الصلوات" },
                  ...ADHAN_VOICES.map((v) => ({ value: v.id, label: v.name })),
                ]}
              />

              <section>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>🎚️ مستوى الصوت</span>
                  <span className="chip">{toArabicDigits(Math.round(settings.adhanVolume * 100))}٪</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.adhanVolume * 100)}
                  onChange={(e) => onChange({ adhanVolume: Number(e.target.value) / 100 })}
                  className="w-full"
                  aria-label="مستوى صوت الأذان"
                />
              </section>

              <button onClick={onTestAdhan} className="btn-accent w-full py-3">
                {adhanTesting ? "⏹ إيقاف التجربة" : "▶️ جرّب الأذان دلوقتي"}
              </button>

              <Switch
                checked={settings.notifications}
                onChange={(v) => onChange({ notifications: v })}
                label="🔔 إشعارات المتصفح"
                hint="تنبيه حتى لو التاب مفتوح في الخلفية"
              />

              <SelectField
                label="⏰ تنبيه مبكر قبل الأذان"
                value={String(settings.preAlertMinutes)}
                onChange={(v) => onChange({ preAlertMinutes: Number(v) })}
                options={[
                  { value: "0", label: "بدون تنبيه مبكر" },
                  { value: "5", label: "قبل الأذان بـ ٥ دقايق" },
                  { value: "10", label: "قبل الأذان بـ ١٠ دقايق" },
                  { value: "15", label: "قبل الأذان بـ ١٥ دقيقة" },
                ]}
              />
            </>
          )}

          {tab === "location" && (
            <>
              <SelectField
                label="🏙️ مدينتك"
                value={settings.city}
                onChange={(v) => {
                  const c = CITIES.find((x) => x.id === v);
                  if (c) onChange({ city: c.id, lat: c.lat, lng: c.lng });
                }}
                options={CITIES.map((c) => ({ value: c.id, label: c.name }))}
              />

              <button
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) =>
                      onChange({
                        lat: Number(pos.coords.latitude.toFixed(4)),
                        lng: Number(pos.coords.longitude.toFixed(4)),
                        city: "custom",
                      }),
                    () => {},
                    { timeout: 10000 }
                  );
                }}
                className="btn-ghost w-full py-3 text-sm"
              >
                📡 استخدم موقعي الحالي (GPS)
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="block text-sm font-bold mb-1.5" style={{ color: "var(--ink)" }}>خط العرض</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.lat}
                    onChange={(e) => onChange({ lat: Number(e.target.value), city: "custom" })}
                    className="w-full p-3 rounded-2xl text-sm font-semibold"
                    style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", color: "var(--ink)" }}
                    dir="ltr"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-bold mb-1.5" style={{ color: "var(--ink)" }}>خط الطول</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.lng}
                    onChange={(e) => onChange({ lng: Number(e.target.value), city: "custom" })}
                    className="w-full p-3 rounded-2xl text-sm font-semibold"
                    style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", color: "var(--ink)" }}
                    dir="ltr"
                  />
                </label>
              </div>

              <SelectField
                label="🧮 طريقة حساب المواقيت"
                value={settings.calcMethod}
                onChange={(v) => onChange({ calcMethod: v })}
                options={CALC_METHODS.map((m) => ({ value: m.id, label: m.name }))}
              />

              <SelectField
                label="🕐 صيغة الوقت"
                value={String(settings.timeFormat)}
                onChange={(v) => onChange({ timeFormat: Number(v) as 12 | 24 })}
                options={[
                  { value: "12", label: "١٢ ساعة (ص/م)" },
                  { value: "24", label: "٢٤ ساعة" },
                ]}
              />
            </>
          )}

          {tab === "data" && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
                  <p className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>{toArabicDigits(stats.total)}</p>
                  <p className="text-xs" style={{ color: "var(--ink-dim)" }}>إجمالي الصلوات</p>
                </div>
                <div className="p-3.5 rounded-2xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
                  <p className="text-2xl font-extrabold" style={{ color: "var(--accent2)" }}>{toArabicDigits(stats.xp)}</p>
                  <p className="text-xs" style={{ color: "var(--ink-dim)" }}>مجموع XP</p>
                </div>
                <div className="p-3.5 rounded-2xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
                  <p className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>{toArabicDigits(stats.level)}</p>
                  <p className="text-xs" style={{ color: "var(--ink-dim)" }}>المستوى — {LEVEL_TITLES[Math.min(stats.level - 1, LEVEL_TITLES.length - 1)]}</p>
                </div>
                <div className="p-3.5 rounded-2xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--surface-border)" }}>
                  <p className="text-2xl font-extrabold" style={{ color: "var(--accent2)" }}>🔥 {toArabicDigits(stats.best)}</p>
                  <p className="text-xs" style={{ color: "var(--ink-dim)" }}>أطول سلسلة</p>
                </div>
              </div>

              <section>
                <h3 className="font-bold mb-2.5 text-sm" style={{ color: "var(--ink)" }}>🏅 إنجازاتك</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ACHIEVEMENTS.map((a) => {
                    const unlocked = stats.unlockedAchievements?.includes(a.id);
                    return (
                      <div
                        key={a.id}
                        className="p-3 rounded-2xl flex items-center gap-2.5"
                        style={{
                          background: "var(--surface)",
                          border: unlocked ? "1px solid var(--accent)" : "1px solid var(--surface-border)",
                          opacity: unlocked ? 1 : 0.45,
                        }}
                      >
                        <span className="text-xl">{unlocked ? a.emoji : "🔒"}</span>
                        <div>
                          <p className="text-xs font-bold" style={{ color: unlocked ? "var(--accent2)" : "var(--ink-dim)" }}>{a.name}</p>
                          <p className="text-[0.65rem]" style={{ color: "var(--ink-dim)" }}>{a.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full py-3 rounded-2xl text-sm font-bold"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}
                >
                  🗑️ مسح كل البيانات (السجل والنقاط والإعدادات)
                </button>
              ) : (
                <div className="p-4 rounded-2xl space-y-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)" }}>
                  <p className="text-sm font-bold text-center" style={{ color: "#f87171" }}>
                    متأكد؟ هيتمسح كل حاجة ولا يمكن الرجوع!
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setConfirmReset(false);
                        onResetData();
                      }}
                      className="py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: "#ef4444", color: "#fff" }}
                    >
                      أيوه امسح
                    </button>
                    <button onClick={() => setConfirmReset(false)} className="btn-ghost py-2.5 text-sm">
                      لأ سيبها
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[0.7rem] leading-relaxed text-center" style={{ color: "var(--ink-dim)" }}>
                بياناتك كلها محفوظة على جهازك فقط (localStorage) — لا يتم إرسال أي بيانات لأي سيرفر.
                <br />
                أصوات الأذان من مكتبة Kiwifu/adhan-mp3 المفتوحة.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
