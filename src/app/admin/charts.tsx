import type { ReactNode } from "react";

// ─── StatCard ──────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  delta,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  delta?: { value: number; suffix?: string };
  icon?: ReactNode;
  accent?: "gold" | "teal" | "violet" | "ink";
}) {
  const accentClass =
    accent === "gold"
      ? "text-gold"
      : accent === "teal"
        ? "text-teal-dark"
        : accent === "violet"
          ? "text-violet"
          : "text-ink";

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="card-label">{label}</div>
        {icon && <div className={accentClass}>{icon}</div>}
      </div>
      <div className={`font-display text-[34px] font-bold leading-none tracking-tight ${accentClass}`}>
        {value}
      </div>
      {delta && (
        <div
          className={`text-xs font-semibold ${
            delta.value >= 0 ? "text-[#22c55e]" : "text-coral"
          }`}
        >
          {delta.value >= 0 ? "▲" : "▼"} {Math.abs(delta.value).toFixed(1)}
          {delta.suffix ?? "%"}{" "}
          <span className="font-light text-ink-3">vs last week</span>
        </div>
      )}
    </div>
  );
}

// ─── LineChart ─────────────────────────────────────────────────────────────
/**
 * Simple SVG line chart. Pass `points` as numeric values; index becomes x.
 * Fixed height; width is fluid via viewBox.
 */
export function LineChart({
  points,
  height = 160,
  color = "var(--gold)",
  fillTo,
  labels,
}: {
  points: number[];
  height?: number;
  color?: string;
  fillTo?: string; // gradient end color (rgba) for the area fill
  labels?: string[];
}) {
  const width = 600;
  const padX = 24;
  const padY = 16;
  const max = Math.max(1, ...points);
  const min = 0;
  const stepX =
    points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
  const yFor = (v: number) =>
    padY + (1 - (v - min) / (max - min || 1)) * (height - padY * 2);

  const linePath = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(padX + i * stepX).toFixed(2)} ${yFor(v).toFixed(2)}`)
    .join(" ");

  const areaPath =
    fillTo && points.length > 1
      ? `${linePath} L ${(padX + (points.length - 1) * stepX).toFixed(2)} ${(height - padY).toFixed(2)} L ${padX} ${(height - padY).toFixed(2)} Z`
      : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
    >
      <defs>
        <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* horizontal gridlines */}
      {[0.25, 0.5, 0.75].map((g, i) => (
        <line
          key={i}
          x1={padX}
          x2={width - padX}
          y1={padY + g * (height - padY * 2)}
          y2={padY + g * (height - padY * 2)}
          stroke="var(--surface-2)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ))}
      {areaPath && <path d={areaPath} fill="url(#line-fill)" />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle
          key={i}
          cx={padX + i * stepX}
          cy={yFor(v)}
          r={2.5}
          fill={color}
        />
      ))}
      {labels && (
        <g>
          {labels.map((lbl, i) => {
            // Show every Nth label to keep things readable
            const every = Math.ceil(points.length / 6);
            if (i % every !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={i}
                x={padX + i * stepX}
                y={height - 2}
                fontSize={10}
                fill="var(--ink-3)"
                textAnchor="middle"
                fontFamily="Sora, sans-serif"
              >
                {lbl}
              </text>
            );
          })}
        </g>
      )}
    </svg>
  );
}

// ─── Donut ─────────────────────────────────────────────────────────────────
export function Donut({
  segments,
  size = 180,
  thickness = 26,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;

  function arcPath(start: number, end: number) {
    const startAngle = (start / total) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (end / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = end - start > total / 2 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} role="img">
        {segments.map((seg) => {
          const start = acc;
          const end = acc + seg.value;
          acc = end;
          if (seg.value === 0) return null;
          return (
            <path
              key={seg.label}
              d={arcPath(start, end)}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
            />
          );
        })}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontFamily="Clash Display, sans-serif"
          fontSize={26}
          fontWeight={700}
          fill="var(--ink)"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontFamily="Sora, sans-serif"
          fontSize={11}
          fill="var(--ink-3)"
        >
          users
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: seg.color }}
            />
            <span className="font-medium">{seg.label}</span>
            <span className="text-ink-3">
              {seg.value} ({Math.round((seg.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BarChart (stacked, monthly) ──────────────────────────────────────────
export function BarChart({
  months,
  series,
  height = 220,
}: {
  months: string[];
  series: { key: string; label: string; color: string; values: number[] }[];
  height?: number;
}) {
  const width = 720;
  const padX = 32;
  const padY = 24;
  const innerH = height - padY * 2;
  const max =
    Math.max(
      1,
      ...months.map((_, i) => series.reduce((s, x) => s + x.values[i], 0)),
    ) * 1.1; // 10% headroom

  const barW = (width - padX * 2) / months.length - 6;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img">
      {/* y gridlines */}
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <line
          key={i}
          x1={padX}
          x2={width - padX}
          y1={padY + (1 - g) * innerH}
          y2={padY + (1 - g) * innerH}
          stroke="var(--surface-2)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ))}
      {months.map((m, i) => {
        const x = padX + i * ((width - padX * 2) / months.length) + 3;
        let stackTop = padY + innerH;
        return (
          <g key={m}>
            {series.map((s) => {
              const v = s.values[i];
              if (v === 0) return null;
              const h = (v / max) * innerH;
              stackTop -= h;
              return (
                <rect
                  key={s.key}
                  x={x}
                  y={stackTop}
                  width={barW}
                  height={h}
                  fill={s.color}
                  rx={4}
                />
              );
            })}
            <text
              x={x + barW / 2}
              y={height - 6}
              fontSize={10}
              fill="var(--ink-3)"
              textAnchor="middle"
              fontFamily="Sora, sans-serif"
            >
              {m.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
