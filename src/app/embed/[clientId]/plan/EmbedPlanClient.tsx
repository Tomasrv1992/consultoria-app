"use client";

import { useEffect, useMemo, useState } from "react";
import { MiroTask } from "@/lib/types";
import { HistoricalCounts, EMPTY_HISTORICAL } from "@/lib/miro-historico";
import { computeProgressFromMiro } from "@/lib/miro-progress";

const REFRESH_MS = 30_000;

const PRIORITY_ORDER: Record<string, number> = {
  Inmediato: 0,
  Alta: 1,
  Media: 2,
  Baja: 3,
};

const ESTADO_ORDER: Record<string, number> = {
  "En curso": 0,
  Iniciativa: 1,
  Completada: 2,
};

function priorityTone(prioridad: string | undefined): string | null {
  if (!prioridad) return null;
  if (prioridad === "Inmediato")
    return "bg-red-50 text-red-700 border-red-100";
  if (prioridad === "Alta")
    return "bg-amber-50 text-amber-700 border-amber-100";
  return null;
}

export function EmbedPlanClient({
  clientId,
  token,
}: {
  clientId: string;
  token: string;
}) {
  const [tasks, setTasks] = useState<MiroTask[]>([]);
  const [historical, setHistorical] =
    useState<HistoricalCounts>(EMPTY_HISTORICAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const res = await fetch(
          `/api/tasks?clientId=${encodeURIComponent(
            clientId
          )}&embedToken=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Error al cargar");
        } else {
          setTasks(data.tasks || []);
          setHistorical(data.historical || EMPTY_HISTORICAL);
          setError(null);
          setUpdatedAt(new Date());
        }
      } catch (e) {
        if (!cancelled) setError(`Error: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOnce();
    const iv = setInterval(fetchOnce, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [clientId, token]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.estado !== "Completada"),
    [tasks]
  );

  const grouped = useMemo(() => {
    const out: Record<string, MiroTask[]> = {};
    for (const t of activeTasks) {
      (out[t.modulo || "Sin módulo"] ||= []).push(t);
    }
    for (const key of Object.keys(out)) {
      out[key].sort((a, b) => {
        const estA = ESTADO_ORDER[a.estado] ?? 99;
        const estB = ESTADO_ORDER[b.estado] ?? 99;
        if (estA !== estB) return estA - estB;
        const prA = PRIORITY_ORDER[a.prioridad ?? ""] ?? 99;
        const prB = PRIORITY_ORDER[b.prioridad ?? ""] ?? 99;
        return prA - prB;
      });
    }
    return out;
  }, [activeTasks]);

  const progress = useMemo(
    () => computeProgressFromMiro(tasks, historical),
    [tasks, historical]
  );

  if (loading) {
    return (
      <div className="p-4 animate-pulse" aria-label="Cargando plan">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/90 border border-line rounded-card p-3 h-[74px]"
            />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-white/90 border border-line rounded-card p-3 h-24"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-100 rounded-card p-3 flex items-start gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-600 mt-0.5 shrink-0"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-red-700">
              No pudimos cargar el plan
            </p>
            <p className="text-[11px] text-red-600 mt-0.5 break-words">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasActive = activeTasks.length > 0;

  return (
    <div className="p-4 bg-transparent animate-[fadeIn_200ms_ease-out]">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {progress.map((p) => (
          <div
            key={p.category}
            className="bg-white/90 backdrop-blur-sm border border-line rounded-card p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-label font-medium text-muted truncate">
                {p.label}
              </div>
              <div className="text-[10px] text-muted tabular-nums shrink-0">
                {p.completed}/{p.total}
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[22px] font-semibold text-ink tabular-nums leading-none">
                {p.percentage}
              </span>
              <span className="text-[12px] text-muted">%</span>
            </div>
            <div
              className="h-1 bg-line rounded-full mt-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={p.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${p.label}: ${p.percentage}%`}
            >
              <div
                className="h-full bg-teal-600 transition-[width] duration-500"
                style={{ width: `${p.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {!hasActive ? (
        <div className="bg-white/90 border border-line rounded-card p-6 text-center">
          <p className="text-[13px] font-medium text-ink">
            Todo al día por ahora
          </p>
          <p className="text-[11px] text-muted mt-1">
            No hay tareas activas en este momento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([modulo, items]) => {
            const enCurso = items.filter(
              (t) => t.estado === "En curso"
            ).length;
            const iniciativas = items.filter(
              (t) => t.estado === "Iniciativa"
            ).length;
            return (
              <div
                key={modulo}
                className="bg-white/90 backdrop-blur-sm border border-line rounded-card p-3"
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h2 className="text-[11px] uppercase tracking-label font-medium text-ink truncate">
                    {modulo}
                  </h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {enCurso > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-teal-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                        {enCurso}
                      </span>
                    )}
                    {iniciativas > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        {iniciativas}
                      </span>
                    )}
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {items.map((t) => {
                    const tone = priorityTone(t.prioridad);
                    return (
                      <li
                        key={t.id}
                        className="flex items-start gap-2 text-[12px] leading-snug"
                      >
                        <span
                          className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              t.estado === "En curso" ? "#0D7C5F" : "#D1D5DB",
                          }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-ink">{t.titulo}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted mt-0.5">
                            {t.responsable && <span>{t.responsable}</span>}
                            {t.fecha && t.fecha !== "Por definir" && (
                              <span className="tabular-nums">· {t.fecha}</span>
                            )}
                            {tone && t.prioridad && (
                              <span
                                className={`inline-flex items-center px-1.5 py-[1px] rounded-chip border text-[10px] font-medium ${tone}`}
                              >
                                {t.prioridad}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {updatedAt && (
        <p className="text-[10px] text-muted mt-3 text-right tabular-nums">
          Actualizado {updatedAt.toLocaleTimeString("es-CO")}
        </p>
      )}
    </div>
  );
}
