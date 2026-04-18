"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { MinuteCard } from "@/components/MinuteCard";
import { ProgressBar } from "@/components/ProgressBar";
import { AppShell } from "@/components/AppShell";
import { MiroTask } from "@/lib/types";
import { CLIENT_METRICS, Metric } from "@/lib/client-metrics";
import {
  getCachedMiroSnapshot,
  setCachedMiroSnapshot,
  updateCachedMiroTasks,
  invalidateMiroCache,
} from "@/lib/miro-cache";
import { computeProgressFromMiro } from "@/lib/miro-progress";
import { HistoricalCounts, EMPTY_HISTORICAL } from "@/lib/miro-historico";

type Tab = "plan" | "indicadores" | "minutas" | "avance";

const ACCUMULATED_SALES_2026: Record<string, number | null> = {
  "client-cygnuss": 172776990,
  "client-dentilandia": 584920177,
  "client-acautos": 174390000,
  "client-paulina": null,
  c5: null,
};


function formatMetric(value: number, unit: Metric["unit"]): string {
  if (unit === "currency") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
    return `$${value}`;
  }
  if (unit === "percent") return `${value}%`;
  return value.toLocaleString();
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { getClient, getClientMinutes } = useData();

  const [activeTab, setActiveTab] = useState<Tab>("plan");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [miroTasks, setMiroTasks] = useState<MiroTask[]>([]);
  const [historical, setHistorical] = useState<HistoricalCounts>(EMPTY_HISTORICAL);
  const [miroLoading, setMiroLoading] = useState(false);
  const [miroError, setMiroError] = useState<string | null>(null);
  const [miroFetched, setMiroFetched] = useState(false);

  const fetchMiroTasksCb = useCallback(async () => {
    const cached = getCachedMiroSnapshot(clientId);
    if (cached) {
      setMiroTasks(cached.tasks);
      setHistorical(cached.historical);
      setMiroError(null);
      setMiroFetched(true);
      return;
    }
    setMiroLoading(true);
    setMiroError(null);
    try {
      const res = await fetch(`/api/tasks?clientId=${clientId}`);
      const data = await res.json();
      if (!res.ok) {
        setMiroError(data.error || "Error al cargar tareas");
        setMiroTasks([]);
        setHistorical(EMPTY_HISTORICAL);
      } else {
        const tasks: MiroTask[] = data.tasks || [];
        const hist: HistoricalCounts = data.historical || EMPTY_HISTORICAL;
        setMiroTasks(tasks);
        setHistorical(hist);
        setCachedMiroSnapshot(clientId, { tasks, historical: hist });
      }
    } catch {
      setMiroError("Error de conexión");
      setMiroTasks([]);
      setHistorical(EMPTY_HISTORICAL);
    } finally {
      setMiroLoading(false);
      setMiroFetched(true);
    }
  }, [clientId]);

  useEffect(() => {
    const needsTasks = activeTab === "plan" || activeTab === "avance";
    if (clientId && needsTasks && !miroFetched && !miroLoading) {
      fetchMiroTasksCb();
    }
  }, [clientId, activeTab, miroFetched, miroLoading, fetchMiroTasksCb]);

  const refreshMiroTasks = useCallback(() => {
    invalidateMiroCache(clientId);
    setMiroFetched(false);
    fetchMiroTasksCb();
  }, [clientId, fetchMiroTasksCb]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const client = getClient(clientId);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-line border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-muted text-[14px]">Cliente no encontrado</p>
      </div>
    );
  }

  if (profile?.role === "client" && profile.client_id !== clientId) {
    router.replace("/dashboard");
    return null;
  }

  const minutes = getClientMinutes(clientId);
  const metrics = CLIENT_METRICS[clientId];

  const tabDefs: { key: Tab; label: string }[] = [
    { key: "plan", label: "Plan" },
    { key: "indicadores", label: "Indicadores" },
    { key: "minutas", label: "Minutas" },
    { key: "avance", label: "Avance" },
  ];

  return (
    <AppShell
      title={client.name}
      subtitle={client.industry}
      onBack={() =>
        profile?.role === "consultant" ? router.push("/dashboard") : undefined
      }
      tabs={tabDefs.map((t) => ({
        key: t.key,
        label: t.label,
        active: activeTab === t.key,
        onClick: () => setActiveTab(t.key),
      }))}
    >
      <div className="max-w-4xl">
        {activeTab === "plan" && (
          <PlanTab
            clientId={clientId}
            isConsultant={profile?.role === "consultant"}
            miroTasks={miroTasks}
            setMiroTasks={setMiroTasks}
            miroLoading={miroLoading}
            miroError={miroError}
            miroFetched={miroFetched}
            expandedModule={expandedModule}
            setExpandedModule={setExpandedModule}
            onRefresh={refreshMiroTasks}
          />
        )}

        {activeTab === "indicadores" && (
          <IndicatorsTab metrics={metrics} clientId={clientId} />
        )}

        {activeTab === "minutas" && (
          <div className="space-y-3">
            {minutes.length > 0 ? (
              minutes.map((m) => <MinuteCard key={m.id} minute={m} />)
            ) : (
              <EmptyState text="Sin minutas registradas" />
            )}
          </div>
        )}

        {activeTab === "avance" && (
          <AvanceTab
            miroTasks={miroTasks}
            historical={historical}
            miroLoading={miroLoading}
            miroError={miroError}
            miroFetched={miroFetched}
          />
        )}
      </div>
    </AppShell>
  );
}

function AvanceTab({
  miroTasks,
  historical,
  miroLoading,
  miroError,
  miroFetched,
}: {
  miroTasks: MiroTask[];
  historical: HistoricalCounts;
  miroLoading: boolean;
  miroError: string | null;
  miroFetched: boolean;
}) {
  const progress = useMemo(
    () => computeProgressFromMiro(miroTasks, historical),
    [miroTasks, historical]
  );

  if (miroLoading && miroTasks.length === 0) {
    return (
      <div className="bg-surface border border-line shadow-card rounded-card p-5">
        <SectionLabel>Avance por módulo</SectionLabel>
        <div className="space-y-4 mt-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-full rounded bg-line animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (miroError) {
    return (
      <div className="bg-surface border border-line shadow-card rounded-card p-5">
        <p className="text-[13px] text-danger">{miroError}</p>
      </div>
    );
  }

  const totalTasks = progress.reduce((s, p) => s + p.total, 0);
  if (miroFetched && totalTasks === 0) {
    return <EmptyState text="Sin tareas registradas" />;
  }

  return (
    <div className="bg-surface border border-line shadow-card rounded-card p-5">
      <SectionLabel>Avance por módulo</SectionLabel>
      <div className="space-y-5 mt-4">
        {progress.map((p) => (
          <ProgressBar
            key={p.category}
            label={p.label}
            percentage={p.percentage}
            completed={p.completed}
            total={p.total}
          />
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-label font-medium text-muted">
      {children}
    </div>
  );
}

function RefreshButton({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-label="Actualizar tareas desde Miro"
      className="shrink-0 h-8 w-8 rounded-btn border border-line text-ink hover:bg-bg disabled:opacity-60 transition-colors flex items-center justify-center"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
      >
        <path d="M21 12a9 9 0 11-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    </button>
  );
}

function EmptyState({ text, subtext }: { text: string; subtext?: string }) {
  return (
    <div className="bg-surface border border-line rounded-card p-10 text-center">
      <p className="text-[14px] text-ink">{text}</p>
      {subtext && <p className="text-[12px] text-muted mt-1">{subtext}</p>}
    </div>
  );
}

function Chip({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "teal";
}) {
  const classes =
    variant === "teal"
      ? "bg-teal-50 text-teal-600"
      : "bg-chip text-chipink";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-chip text-[11px] ${classes}`}>
      {children}
    </span>
  );
}

/* ---------------- Plan tab ---------------- */

function PlanTab({
  clientId,
  isConsultant,
  miroTasks,
  setMiroTasks,
  miroLoading,
  miroError,
  miroFetched,
  expandedModule,
  setExpandedModule,
  onRefresh,
}: {
  clientId: string;
  isConsultant: boolean;
  miroTasks: MiroTask[];
  setMiroTasks: React.Dispatch<React.SetStateAction<MiroTask[]>>;
  miroLoading: boolean;
  miroError: string | null;
  miroFetched: boolean;
  expandedModule: string | null;
  setExpandedModule: (v: string | null) => void;
  onRefresh: () => void;
}) {
  const { profile } = useAuth();
  const [banner, setBanner] = useState<
    { kind: "success" | "warn"; text: string } | null
  >(null);
  const [confirmTask, setConfirmTask] = useState<MiroTask | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleComplete = async (task: MiroTask) => {
    if (!task.id) {
      setBanner({
        kind: "warn",
        text: "No se puede completar: falta id",
      });
      return;
    }

    setMiroTasks((prev) => {
      const next = prev.map((t) =>
        t.id === task.id ? { ...t, estado: "Completada" } : t
      );
      updateCachedMiroTasks(clientId, () => next);
      return next;
    });

    setSyncing(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          completedBy: profile?.full_name ?? null,
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (res.ok && data.ok) {
        setBanner({ kind: "success", text: "✓ Completada" });
      } else {
        setBanner({
          kind: "warn",
          text: "No se pudo guardar la completada",
        });
      }
    } catch {
      setBanner({
        kind: "warn",
        text: "Error de red al guardar la completada",
      });
    } finally {
      setSyncing(null);
    }
  };

  const formatIngreso = (raw: string | undefined): string | null => {
    if (!raw) return null;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}/${d.getFullYear()}`;
    }
    return raw;
  };
  const visible = miroTasks.filter(
    (t) => t.estado === "En curso" || t.estado === "Iniciativa"
  );
  const grouped: Record<string, MiroTask[]> = {};
  visible.forEach((t) => {
    const area = t.modulo || "Sin módulo";
    (grouped[area] ||= []).push(t);
  });

  if (miroLoading && miroTasks.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-surface border border-line rounded-card p-5"
          >
            <div className="h-3 w-32 rounded bg-line animate-pulse" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded bg-line animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-line animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (miroError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] uppercase tracking-label font-medium text-muted">
            Plan
          </h2>
          <RefreshButton loading={miroLoading} onClick={onRefresh} />
        </div>
        <div className="bg-surface border border-line rounded-card p-5">
          <p className="text-[13px] text-danger">{miroError}</p>
        </div>
      </div>
    );
  }

  if (miroFetched && visible.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] uppercase tracking-label font-medium text-muted">
            Plan
          </h2>
          <RefreshButton loading={miroLoading} onClick={onRefresh} />
        </div>
        <EmptyState text="Sin tareas en el plan" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] uppercase tracking-label font-medium text-muted">
          Plan
        </h2>
        <div className="flex items-center gap-2">
          {isConsultant && (
            <a
              href={`/client/${clientId}/pegar-pendientes`}
              className="h-8 px-3 rounded-btn border border-line text-[12px] font-medium text-ink hover:bg-bg transition-colors flex items-center"
            >
              Pegar pendientes
            </a>
          )}
          <RefreshButton loading={miroLoading} onClick={onRefresh} />
        </div>
      </div>
      {banner && (
        <div
          className={`rounded-card px-4 py-3 flex items-start justify-between gap-3 border ${
            banner.kind === "success"
              ? "bg-teal-50 border-teal-600/20"
              : "bg-amber-50 border-amber-500/30"
          }`}
        >
          <p
            className={`text-[13px] ${
              banner.kind === "success" ? "text-teal-600" : "text-amber-700"
            }`}
          >
            {banner.text}
          </p>
          <button
            onClick={() => setBanner(null)}
            className={`shrink-0 text-[12px] ${
              banner.kind === "success"
                ? "text-teal-600/70 hover:text-teal-600"
                : "text-amber-700/70 hover:text-amber-700"
            }`}
          >
            Cerrar
          </button>
        </div>
      )}
      {Object.entries(grouped).map(([area, tasks]) => {
        const enCurso = tasks.filter((t) => t.estado === "En curso").length;
        const iniciativas = tasks.filter(
          (t) => t.estado === "Iniciativa"
        ).length;
        const isExpanded = expandedModule === area;

        return (
          <div
            key={area}
            className="bg-surface border border-line shadow-card rounded-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedModule(isExpanded ? null : area)}
              className="w-full text-left px-5 py-4 flex items-center justify-between min-h-[44px] hover:bg-bg transition-colors"
            >
              <div className="text-[11px] uppercase tracking-label font-medium text-ink">
                {area}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted tabular-nums">
                  {enCurso} en curso · {iniciativas} iniciativa
                </span>
                <Chip>{tasks.filter((t) => t.estado !== "Completada").length}</Chip>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-line px-5 py-2">
                {tasks.map((task, i) => {
                  const done = task.estado === "Completada";
                  const ingreso = formatIngreso(task.fechaIngreso);
                  return (
                    <div
                      key={i}
                      className={`py-3 flex items-start gap-3 border-b border-line last:border-b-0 ${
                        done ? "opacity-60" : ""
                      }`}
                    >
                      {done ? (
                        <svg
                          className="mt-1 w-4 h-4 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#0D7C5F"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span
                          className="mt-2 w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              task.estado === "En curso"
                                ? "#0D7C5F"
                                : "#D1D5DB",
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[14px] leading-snug ${
                            done ? "line-through text-muted" : "text-ink"
                          }`}
                        >
                          {task.titulo}
                        </p>
                        {ingreso && (
                          <p className="text-[11px] text-muted mt-0.5">
                            Ingresó: {ingreso}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          {task.responsable && (
                            <span className="text-[12px] text-muted">
                              {task.responsable}
                            </span>
                          )}
                          {task.fecha && task.fecha !== "Por definir" && (
                            <span className="text-[12px] text-muted">
                              {task.fecha}
                            </span>
                          )}
                          <Chip
                            variant={
                              done
                                ? "default"
                                : task.estado === "En curso"
                                ? "teal"
                                : "default"
                            }
                          >
                            {task.estado}
                          </Chip>
                          {task.prioridad && task.prioridad !== "Baja" && (
                            <Chip>{task.prioridad}</Chip>
                          )}
                        </div>
                      </div>
                      {isConsultant && !done && (
                        <button
                          onClick={() => setConfirmTask(task)}
                          disabled={syncing === task.id}
                          className="shrink-0 h-8 px-2.5 rounded-btn border border-line text-[12px] font-medium text-ink hover:bg-bg disabled:opacity-50 transition-colors"
                        >
                          {syncing === task.id ? "..." : "✓ Completar"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {confirmTask && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => setConfirmTask(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface rounded-card shadow-card border border-line p-6"
          >
            <h2 className="text-[16px] font-semibold text-ink">
              ¿Marcar como completada?
            </h2>
            <p className="text-[13px] text-muted mt-2 leading-snug">
              {confirmTask.titulo}
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  const t = confirmTask;
                  setConfirmTask(null);
                  handleComplete(t);
                }}
                className="h-11 px-4 rounded-btn bg-ink text-white text-[13px] font-medium hover:bg-ink/90 transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmTask(null)}
                className="h-11 px-4 rounded-btn border border-line text-[13px] font-medium text-ink hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Indicators tab ---------------- */

function IndicatorsTab({
  metrics,
  clientId,
}: {
  metrics?: Metric[];
  clientId: string;
}) {
  if (!metrics || metrics.length === 0) {
    return (
      <EmptyState
        text="Sin datos aún"
        subtext="Se actualizarán después de cada reunión"
      />
    );
  }

  const total = ACCUMULATED_SALES_2026[clientId];
  const accumulatedNote =
    typeof total === "number"
      ? `Acumulado 2026: ${formatAccumulated(total)}`
      : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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

function formatAccumulated(total: number): string {
  if (total >= 1_000_000_000) return `$${(total / 1_000_000_000).toFixed(2)}B`;
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M`;
  return `$${total.toLocaleString()}`;
}

function MetricCard({
  metric,
  footnote,
}: {
  metric: Metric;
  footnote?: string | null;
}) {
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
    <div className="bg-surface border border-line shadow-card rounded-card p-5">
      <div className="text-[11px] uppercase tracking-label font-medium text-muted">
        {metric.label}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div
          className="text-[28px] font-semibold tabular-nums leading-none"
          style={{ color: alert ? "#DC2626" : "#111111" }}
        >
          {formatMetric(last.value, metric.unit)}
        </div>
        {prev && (
          <span
            className="text-[12px] tabular-nums"
            style={{ color: delta >= 0 ? "#059669" : "#DC2626" }}
          >
            {delta >= 0 ? "+" : "−"}
            {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      {prev && (
        <p className="text-[12px] text-muted mt-1 tabular-nums">
          {prev.month}: {formatMetric(prev.value, metric.unit)}
        </p>
      )}

      <div className="relative w-full mt-6 pt-4">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full block"
          preserveAspectRatio="none"
          style={{ height: `${h}px` }}
        >
          <path
            d={path}
            fill="none"
            stroke="#0D7C5F"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.5} fill="#0D7C5F" />
          ))}
        </svg>
        {pts.map((p, i) => (
          <span
            key={i}
            className="absolute text-[10px] font-medium tabular-nums leading-none whitespace-nowrap pointer-events-none"
            style={{
              left: `${(p.x / w) * 100}%`,
              top: `${p.y + 16 - 2}px`,
              transform: "translate(-50%, -100%)",
              color: "#0D7C5F",
            }}
          >
            {formatMetric(metric.points[i].value, metric.unit)}
          </span>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[11px] text-muted tabular-nums">
        {metric.points.map((p) => (
          <span key={p.month}>{p.month}</span>
        ))}
      </div>

      {footnote && (
        <p className="text-[11px] text-muted mt-2 tabular-nums">{footnote}</p>
      )}

      {alert && (
        <p className="text-[12px] text-danger mt-3">
          Bajo umbral {metric.threshold!.max}%
        </p>
      )}
    </div>
  );
}
