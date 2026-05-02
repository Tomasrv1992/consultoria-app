"use client";

import { Metric } from "@/lib/client-metrics";

function formatMetric(value: number, unit: Metric["unit"]): string {
  if (unit === "currency") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
    return `$${value}`;
  }
  if (unit === "percent") return `${value}%`;
  return value.toLocaleString();
}

interface Props {
  metric: Metric;
  footnote?: string | null;
}

export function MetricCard({ metric, footnote }: Props) {
  const last = metric.points[metric.points.length - 1];
  const prev =
    metric.points.length > 1
      ? metric.points[metric.points.length - 2]
      : null;
  const first = metric.points[0];
  const delta = last.value - first.value;
  const deltaPct =
    first.value !== 0 ? Math.round((delta / first.value) * 100) : 0;
  const alert = metric.threshold && last.value < metric.threshold.max;

  const w = 200;
  const h = 48;
  const pad = 3;
  const values = metric.points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const pts = metric.points.map((p, i) => {
    const x =
      metric.points.length === 1
        ? w / 2
        : pad + (i / (metric.points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p.value - minV) / range) * (h - pad * 2);
    return { x, y };
  });
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  return (
    <div className="bg-surface border border-line shadow-card rounded-card p-4">
      <div className="text-[11px] uppercase tracking-label font-medium text-muted truncate">
        {metric.label}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <div
          className={`text-[24px] font-semibold tabular-nums leading-none tracking-[-0.01em] ${
            alert ? "text-danger" : "text-ink"
          }`}
        >
          {formatMetric(last.value, metric.unit)}
        </div>
        {prev && (
          <span
            className={`text-[12px] font-medium tabular-nums shrink-0 ${
              delta >= 0 ? "text-teal-600" : "text-danger"
            }`}
          >
            {delta >= 0 ? "+" : "−"}
            {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      {prev && (
        <p className="text-[11px] text-muted mt-1 tabular-nums">
          {prev.month}: {formatMetric(prev.value, metric.unit)}
        </p>
      )}

      <div className="relative w-full mt-5 pt-4">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full block"
          preserveAspectRatio="none"
          style={{ height: `${h}px` }}
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke="#065F46"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.75} fill="#065F46" />
          ))}
        </svg>
        {pts.map((p, i) => (
          <span
            key={i}
            className="absolute text-[10px] font-medium tabular-nums leading-none whitespace-nowrap pointer-events-none text-teal-600"
            style={{
              left: `${(p.x / w) * 100}%`,
              top: `${p.y + 16 - 2}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            {formatMetric(metric.points[i].value, metric.unit)}
          </span>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-muted tabular-nums">
        {metric.points.map((p) => (
          <span key={p.month}>{p.month}</span>
        ))}
      </div>

      {footnote && (
        <p className="text-[11px] text-muted mt-2 tabular-nums">{footnote}</p>
      )}

      {alert && metric.threshold && (
        <p className="text-[11px] text-danger mt-2">
          Bajo umbral {metric.threshold.max}%
        </p>
      )}
    </div>
  );
}
