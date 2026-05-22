"use client";

import { useEffect, useState } from "react";
import { Metric } from "@/lib/client-metrics";
import { MetricCard } from "./MetricCard";

function formatAccumulated(total: number): string {
  if (total >= 1_000_000_000) return `$${(total / 1_000_000_000).toFixed(2)}B`;
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M`;
  return `$${total.toLocaleString()}`;
}

interface Props {
  metrics: Metric[] | undefined;
  clientId: string;
  token: string;
}

export function IndicatorsPanel({ metrics, clientId, token }: Props) {
  const [accumulated, setAccumulated] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/clients/accumulated-sales?clientId=${encodeURIComponent(clientId)}&embedToken=${encodeURIComponent(token)}`
    )
      .then((r) => (r.ok ? r.json() : { accumulated: null }))
      .then((d) => {
        if (!cancelled && typeof d.accumulated === "number") {
          setAccumulated(d.accumulated);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [clientId, token]);

  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-card p-6 text-center shadow-card">
        <p className="text-[14px] font-semibold text-ink">Sin datos aún</p>
        <p className="text-[12px] text-muted mt-1">
          Se actualizarán después de cada reunión.
        </p>
      </div>
    );
  }

  const accumulatedNote =
    typeof accumulated === "number"
      ? `Acumulado ${new Date().getFullYear()}: ${formatAccumulated(accumulated)}`
      : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {metrics.map((m) => (
        <MetricCard
          key={m.key}
          metric={m}
          footnote={m.key === "ventas" ? accumulatedNote : null}
        />
      ))}
    </div>
  );
}
