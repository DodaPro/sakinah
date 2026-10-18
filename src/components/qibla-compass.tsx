"use client";

import { useEffect, useMemo, useState } from "react";
import { qiblaBearing, toArabicDigits } from "@/lib/prayer";

/**
 * بوصلة القبلة — تستخدم حساس الاتجاه إن توفر،
 * وإلا تعرض اتجاه القبلة بالنسبة للشمال.
 */
export default function QiblaCompass({ lat, lng }: { lat: number; lng: number }) {
  const bearing = useMemo(() => qiblaBearing(lat, lng), [lat, lng]);
  const [heading, setHeading] = useState<number | null>(null);
  const [sensorState, setSensorState] = useState<"idle" | "active" | "denied">("idle");

  useEffect(() => {
    if (sensorState !== "active") return;

    const handler = (e: DeviceOrientationEvent) => {
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (typeof webkit === "number") {
        setHeading(webkit);
      } else if (e.alpha !== null && e.alpha !== undefined) {
        setHeading(360 - e.alpha);
      }
    };

    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [sensorState]);

  const startCompass = async () => {
    try {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (DOE && typeof DOE.requestPermission === "function") {
        const res = await DOE.requestPermission();
        setSensorState(res === "granted" ? "active" : "denied");
      } else if (window.DeviceOrientationEvent) {
        setSensorState("active");
      } else {
        setSensorState("denied");
      }
    } catch {
      setSensorState("denied");
    }
  };

  // زاوية الإبرة: بدون حساس = الاتجاه من الشمال، مع حساس = الاتجاه - درجة الجهاز
  const needleDeg = heading !== null ? bearing - heading : bearing;

  return (
    <div className="glass-card p-5 sm:p-6 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 self-start">
        <span className="text-2xl">🧭</span>
        <h3 className="font-bold text-lg" style={{ color: "var(--ink)" }}>
          اتجاه القبلة
        </h3>
      </div>

      <div className="relative w-44 h-44 sm:w-52 sm:h-52" role="img" aria-label={`بوصلة القبلة، الاتجاه ${Math.round(bearing)} درجة من الشمال`}>
        {/* قرص البوصلة */}
        <div
          className="absolute inset-0 rounded-full border-2 animate-spin-slow"
          style={{
            borderColor: "var(--surface-border)",
            background:
              "radial-gradient(circle at 50% 35%, var(--surface-2), transparent 75%)",
            animationDuration: heading !== null ? "0s" : undefined,
          }}
        />
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
          {/* علامات الدرجات */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const r1 = 88;
            const r2 = i % 3 === 0 ? 78 : 84;
            return (
              <line
                key={i}
                x1={100 + Math.sin(a) * r1}
                y1={100 - Math.cos(a) * r1}
                x2={100 + Math.sin(a) * r2}
                y2={100 - Math.cos(a) * r2}
                stroke="var(--ink-dim)"
                strokeWidth={i % 3 === 0 ? 2.5 : 1}
                opacity={i % 3 === 0 ? 0.9 : 0.4}
              />
            );
          })}
          {/* إبرة القبلة */}
          <g
            style={{
              transform: `rotate(${needleDeg}deg)`,
              transformOrigin: "100px 100px",
              transition: "transform 0.8s cubic-bezier(0.3,1.2,0.4,1)",
            }}
          >
            <line
              x1="100" y1="100"
              x2="100" y2="34"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="100" cy="30" r="7" fill="var(--accent)" opacity="0.95" />
            <text x="100" y="21" textAnchor="middle" fontSize="14">🕋</text>
          </g>
          {/* مؤشر الشمال */}
          <text x="100" y="16" textAnchor="middle" fontSize="13" fill="var(--accent2)" fontWeight="bold">
            شمال
          </text>
          <circle cx="100" cy="100" r="6" fill="var(--ink-dim)" />
        </svg>
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
          القبلة على بعد{" "}
          <span className="font-bold" style={{ color: "var(--accent)" }}>
            {toArabicDigits(Math.round(bearing))}°
          </span>{" "}
          من الشمال
        </p>
        {sensorState !== "active" ? (
          <button onClick={startCompass} className="btn-ghost px-4 py-1.5 text-sm w-full">
            📱 فعّل البوصلة الحيّة على جهازك
          </button>
        ) : (
          <p className="text-xs" style={{ color: "var(--ink-dim)" }}>
            {heading !== null
              ? "بوصلة حيّة تعمل — وجّه الجهاز حتى تتجه الكعبة للأعلى"
              : "بانتظار بيانات الحساس…"}
          </p>
        )}
        {sensorState === "denied" && (
          <p className="text-xs" style={{ color: "var(--accent2)" }}>
            حساس الاتجاه غير متاح على هذا الجهاز — استخدم الاتجاه الثابت من الشمال
          </p>
        )}
      </div>
    </div>
  );
}
