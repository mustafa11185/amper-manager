"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type ColorScheme = "temperature" | "fuel" | "oil_pressure" | "load";

interface GaugeCardProps {
  value: number | null;
  max: number;
  unit: string;
  label: string;
  icon: string;
  colorScheme: ColorScheme;
  lastUpdated?: string | null;
  engineId?: string;
  readingType?: string;
  onManualEntry?: () => void;
}

function getColor(value: number, scheme: ColorScheme): string {
  switch (scheme) {
    case "temperature":
      if (value > 85) return "#DC2626";
      if (value > 70) return "#D97706";
      return "#059669";
    case "fuel":
      if (value < 20) return "#DC2626";
      if (value < 40) return "#D97706";
      return "#059669";
    case "oil_pressure":
      if (value < 1 || value > 8) return "#DC2626";
      if (value < 2 || value > 7) return "#D97706";
      return "#059669";
    case "load":
      if (value > 85) return "#DC2626";
      if (value > 70) return "#D97706";
      return "#059669";
    default:
      return "#1B4FD8";
  }
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

export default function GaugeCard({
  value,
  max,
  unit,
  label,
  icon,
  colorScheme,
  lastUpdated,
  engineId,
  readingType,
  onManualEntry,
}: GaugeCardProps) {
  const displayValue = value ?? 0;
  const pct = max > 0 ? Math.min(1, Math.max(0, displayValue / max)) : 0;
  const color = value !== null ? getColor(displayValue, colorScheme) : "#64748B";

  // SVG arc params (180 degree arc)
  const cx = 60;
  const cy = 55;
  const r = 42;
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalArc = Math.PI;
  const circumference = totalArc * r;

  const bgArcD = describeArc(cx, cy, r, startAngle, endAngle);
  const valueAngle = startAngle - pct * totalArc;
  const valueArcD = describeArc(cx, cy, r, startAngle, valueAngle);

  // Check if stale (>1 hour)
  const isStale = lastUpdated
    ? Date.now() - new Date(lastUpdated).getTime() > 3600000
    : true;

  return (
    <div
      className="rounded-2xl p-3 relative"
      style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
    >
      {/* Manual entry button */}
      {isStale && onManualEntry && (
        <button
          onClick={onManualEntry}
          className="absolute top-2 left-2 w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
          title="تسجيل قراءة"
        >
          <Plus size={12} style={{ color }} />
        </button>
      )}

      {/* SVG Gauge */}
      <svg width="120" height="68" viewBox="0 0 120 68" className="mx-auto">
        {/* Background arc */}
        <path d={bgArcD} fill="none" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
        {/* Value arc */}
        {value !== null && (
          <path
            d={valueArcD}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color}40)`,
              transition: "all 0.8s ease",
            }}
          />
        )}
        {/* Center value */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill={color}
          fontSize="20"
          fontWeight="bold"
          fontFamily="Rajdhani, sans-serif"
        >
          {value !== null ? (Number.isInteger(displayValue) ? displayValue : displayValue.toFixed(1)) : "—"}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fill="#64748B"
          fontSize="9"
          fontFamily="Rajdhani, sans-serif"
        >
          {unit}
        </text>
      </svg>

      {/* Label */}
      <div className="text-center -mt-1">
        <p className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>
          {icon} {label}
        </p>
        {lastUpdated && (
          <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>
            {timeAgo(lastUpdated)}
          </p>
        )}
      </div>
    </div>
  );
}

// Helper: SVG arc path from startAngle to endAngle (radians, 0=right, PI=left)
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);
  const largeArc = Math.abs(startAngle - endAngle) > Math.PI ? 1 : 0;
  // Sweep direction: clockwise (from left to right in our inverted y)
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// Manual reading input modal
export function ManualReadingModal({
  type,
  unit,
  label,
  engineId,
  branchId,
  onClose,
  onSuccess,
}: {
  type: string;
  unit: string;
  label: string;
  engineId: string;
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value || Number(value) < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/engines/log-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          value: Number(value),
          engine_id: engineId,
          branch_id: branchId,
        }),
      });
      if (res.ok) {
        toast.success("تم تسجيل القراءة");
        onSuccess();
      }
    } catch {
      toast.error("خطأ");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div
        className="w-full max-w-[390px] rounded-t-[20px] p-5 pb-8"
        style={{ background: "var(--bg-surface)" }}
      >
        <h3 className="text-sm font-bold mb-3">تسجيل {label}</h3>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`القيمة (${unit})`}
          dir="ltr"
          className="w-full h-12 px-3 rounded-xl text-center font-num text-lg"
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl text-xs font-bold"
            style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !value}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ background: "var(--blue-primary)" }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
