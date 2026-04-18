"use client";

import { useEffect, useMemo, useState } from "react";
import { MiroTask } from "@/lib/types";
import { HistoricalCounts, EMPTY_HISTORICAL } from "@/lib/miro-historico";
import { computeProgressFromMiro } from "@/lib/miro-progress";

const REFRESH_MS = 30_000;

export function EmbedPlanClient({ clientId }: { clientId: string }) {
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
        const res = await fetch(`/api/tasks?clientId=${clientId}`);
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
  }, [clientId]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.estado !== "Completada"),
    [tasks]
  );
  const grouped = useMemo(() => {
    const out: Record<string, MiroTask[]> = {};
    for (const t of activeTasks) {
      (out[t.modulo || "Sin módulo"] ||= []).push(t);
    }
    return out;
  }, [activeTasks]);

  const progress = useMemo(
    () => computeProgressFromMiro(tasks, historical),
    [tasks, historical]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="w-5 h-5 border-2 border-line border-t-ink rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-[13px] text-danger">{error}</div>
    );
  }

  return (
    <div className="p-4 bg-transparent">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {progress.map((p) => (
          <div
            key={p.category}
            className="bg-white/80 backdrop-blur-sm border border-line rounded-card p-3"
          >
            <div className="text-[10px] uppercase tracking-label font-medium text-muted">
              {p.label}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[18px] font-semibold text-ink tabular-nums leading-none">
                {p.percentage}%
              </span>
              <span className="text-[11px] text-muted tabular-nums">
                {p.completed}/{p.total}
              </span>
            </div>
            <div className="h-1 bg-line rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-teal-600"
                style={{ width: `${p.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([modulo, items]) => {
          const enCurso = items.filter((t) => t.estado === "En curso").length;
          const iniciativas = items.filter(
            (t) => t.estado === "Iniciativa"
          ).length;
          return (
            <div
              key={modulo}
              className="bg-white/80 backdrop-blur-sm border border-line rounded-card p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-label font-medium text-ink">
                  {modulo}
                </div>
                <div className="text-[11px] text-muted tabular-nums">
                  {enCurso} en curso · {iniciativas} iniciativa
                </div>
              </div>
              <ul className="space-y-1">
                {items.map((t) => (
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
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">{t.titulo}</p>
                      <div className="flex flex-wrap gap-x-2 text-[10px] text-muted mt-0.5">
                        {t.responsable && <span>{t.responsable}</span>}
                        {t.prioridad && t.prioridad !== "Baja" && (
                          <span>· {t.prioridad}</span>
                        )}
                        {t.fecha && t.fecha !== "Por definir" && (
                          <span>· {t.fecha}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {updatedAt && (
        <p className="text-[10px] text-muted mt-3 text-right tabular-nums">
          Actualizado: {updatedAt.toLocaleTimeString("es-CO")}
        </p>
      )}
    </div>
  );
}
