"use client";

import { Client, HealthStatus } from "@/lib/types";
import { HealthBadge } from "./HealthBadge";

interface ClientCardProps {
  client: Client;
  progress: { total: number; completed: number } | null;
  health: HealthStatus;
  onClick: () => void;
}

export function ClientCard({
  client,
  progress,
  health,
  onClick,
}: ClientCardProps) {
  const totalTasks = progress?.total ?? 0;
  const completedTasks = progress?.completed ?? 0;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const loading = progress === null;

  const accent = client.brand === "estrategia" ? "#0D7C5F" : "#1B3A5C";

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-line shadow-card rounded-card p-5 relative overflow-hidden hover:border-ink/20 transition-colors"
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium text-ink truncate">
            {client.name}
          </h3>
          <p className="text-[12px] text-muted mt-0.5">{client.industry}</p>
        </div>
        <HealthBadge status={health} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat value={loading ? "—" : `${pct}%`} label="Avance" />
        <Stat value={loading ? "—" : `${completedTasks}`} label="Completadas" />
        <Stat
          value={loading ? "—" : `${totalTasks - completedTasks}`}
          label="Pendientes"
        />
      </div>
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[18px] font-semibold text-ink tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[11px] text-muted mt-1 uppercase tracking-label">
        {label}
      </div>
    </div>
  );
}
