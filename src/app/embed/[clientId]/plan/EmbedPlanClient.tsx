"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MiroTask } from "@/lib/types";
import { HistoricalCounts, EMPTY_HISTORICAL } from "@/lib/miro-historico";
import { computeProgressFromMiro, miroTotals } from "@/lib/miro-progress";
import { TaskRow } from "./components/TaskRow";
import { NewTaskInline } from "./components/NewTaskInline";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { IndicatorsPanel } from "./components/IndicatorsPanel";
import { CLIENT_METRICS } from "@/lib/client-metrics";
import {
  completeTask,
  patchTask,
  deleteTask,
  createTask,
  fetchResponsables,
} from "./lib/embed-api";

const REFRESH_MS = 30_000;

const ESTADO_ORDER: Record<string, number> = {
  "En curso": 0,
  Iniciativa: 1,
  Completada: 2,
};

const PRIORITY_ORDER: Record<string, number> = {
  Inmediato: 0,
  Alta: 1,
  Media: 2,
  Baja: 3,
};

type MainTab = "resumen" | "plan" | "indicadores";
type ModuleTab = "encurso" | "iniciativa";

const CLIENT_LABEL: Record<string, string> = {
  "client-cygnuss": "CYGNUSS",
  "client-dentilandia": "Dentilandia",
  "client-acautos": "AC Autos",
  "client-paulina": "Paulina Zarrabe",
  c5: "Lativo",
};

export function EmbedPlanClient({
  clientId,
  token,
}: {
  clientId: string;
  token: string;
}) {
  const [tasks, setTasks] = useState<MiroTask[]>([]);
  const [historical, setHistorical] = useState<HistoricalCounts>(EMPTY_HISTORICAL);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [responsableSuggestions, setResponsableSuggestions] = useState<string[]>([]);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MiroTask | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("resumen");
  const [moduleTabs, setModuleTabs] = useState<Record<string, ModuleTab>>({});

  const apiOpts = useMemo(() => ({ token, clientId }), [token, clientId]);
  const cancelledRef = useRef(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tasks?clientId=${encodeURIComponent(clientId)}&embedToken=${encodeURIComponent(token)}`
      );
      const data = await res.json();
      if (cancelledRef.current) return;
      if (!res.ok) {
        setLoadError(data.error || "Error al cargar");
      } else {
        setTasks(data.tasks || []);
        setHistorical(data.historical || EMPTY_HISTORICAL);
        setLoadError(null);
        setUpdatedAt(new Date());
      }
    } catch (e) {
      if (!cancelledRef.current) setLoadError(`Error: ${(e as Error).message}`);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchTasks();
    const iv = setInterval(fetchTasks, REFRESH_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(iv);
    };
  }, [fetchTasks]);

  const refreshResponsables = useCallback(async () => {
    const list = await fetchResponsables(apiOpts);
    setResponsableSuggestions(list);
  }, [apiOpts]);

  useEffect(() => {
    refreshResponsables();
  }, [refreshResponsables]);

  function setPending(id: string, pending: boolean) {
    setPendingTaskIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function getModuleTab(modulo: string): ModuleTab {
    return moduleTabs[modulo] ?? "encurso";
  }

  function setModuleTab(modulo: string, tab: ModuleTab) {
    setModuleTabs((prev) => ({ ...prev, [modulo]: tab }));
  }

  async function handleComplete(taskId: string) {
    setPending(taskId, true);
    const original = tasks.find((t) => t.id === taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, estado: "Completada" } : t))
    );
    try {
      await completeTask(taskId, apiOpts);
      await fetchTasks();
    } catch (err) {
      setActionError((err as Error).message);
      if (original) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? original : t)));
      }
    } finally {
      setPending(taskId, false);
    }
  }

  async function handleChangeEstado(taskId: string, estado: string) {
    setPending(taskId, true);
    const original = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, estado } : t)));
    try {
      await patchTask(taskId, { estado }, apiOpts);
      await fetchTasks();
    } catch (err) {
      setActionError((err as Error).message);
      if (original) setTasks((prev) => prev.map((t) => (t.id === taskId ? original : t)));
    } finally {
      setPending(taskId, false);
    }
  }

  async function handleChangeResponsable(taskId: string, responsable: string) {
    setPending(taskId, true);
    const original = tasks.find((t) => t.id === taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, responsable } : t))
    );
    try {
      await patchTask(taskId, { responsable }, apiOpts);
      await refreshResponsables();
      await fetchTasks();
    } catch (err) {
      setActionError((err as Error).message);
      if (original) setTasks((prev) => prev.map((t) => (t.id === taskId ? original : t)));
    } finally {
      setPending(taskId, false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      await deleteTask(confirmDelete.id, apiOpts);
      const deletedId = confirmDelete.id;
      setTasks((prev) => prev.filter((t) => t.id !== deletedId));
      setConfirmDelete(null);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreate(data: { titulo: string; modulo: string }) {
    await createTask({ ...data, clientId }, apiOpts);
    setCreatingFor(null);
    await fetchTasks();
  }

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.estado !== "Completada"),
    [tasks]
  );

  const grouped = useMemo(() => {
    const out: Record<string, MiroTask[]> = {};
    for (const t of activeTasks) {
      const key = t.modulo || "Sin módulo";
      if (!out[key]) out[key] = [];
      out[key].push(t);
    }
    for (const key of Object.keys(out)) {
      out[key].sort((a, b) => {
        const estA = ESTADO_ORDER[a.estado] ?? 99;
        const estB = ESTADO_ORDER[b.estado] ?? 99;
        if (estA !== estB) return estA - estB;
        const prA = PRIORITY_ORDER[a.prioridad ?? ""] ?? 99;
        const prB = PRIORITY_ORDER[b.prioridad ?? ""] ?? 99;
        if (prA !== prB) return prA - prB;
        return a.titulo.localeCompare(b.titulo);
      });
    }
    return out;
  }, [activeTasks]);

  const progress = useMemo(
    () => computeProgressFromMiro(tasks, historical),
    [tasks, historical]
  );

  const totals = useMemo(() => miroTotals(tasks, historical), [tasks, historical]);
  const overallPct =
    totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;

  const clientLabel = CLIENT_LABEL[clientId] ?? clientId;

  if (loading) {
    return (
      <div className="p-4 animate-pulse" aria-label="Cargando plan">
        <div className="h-12 mb-4" />
        <div className="h-9 bg-chip rounded-btn mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-surface border border-line rounded-card h-[68px] shadow-card" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-line rounded-card h-[110px] shadow-card" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4">
        <div className="bg-surface border border-line rounded-card p-4 shadow-card">
          <p className="text-[12px] font-semibold text-ink mb-1">No pudimos cargar el plan</p>
          <p className="text-[11px] text-muted break-words">{loadError}</p>
        </div>
      </div>
    );
  }

  const hasActive = activeTasks.length > 0;

  return (
    <div className="bg-bg min-h-screen">
      <div className="max-w-[640px] mx-auto p-4 animate-[fadeIn_200ms_ease-out]">

        {/* HEADER */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-label text-muted font-medium">
              Estrategia en Acción
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-label text-teal-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
              En vivo
            </span>
          </div>
          <h1 className="text-[20px] font-semibold text-ink leading-tight tracking-[-0.01em]">
            {clientLabel} · Plan de trabajo
          </h1>
          <p className="text-[12px] text-muted mt-0.5">
            Refresca cada 30 s
          </p>
        </header>

        {/* ACTION ERROR BANNER */}
        {actionError && (
          <div className="mb-3 bg-surface border border-line rounded-card p-3 shadow-card flex items-start justify-between gap-2">
            <p className="text-[12px] text-danger">{actionError}</p>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-[11px] text-muted hover:text-ink shrink-0"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* MAIN TABS */}
        <nav
          className="flex gap-1 bg-chip p-[3px] rounded-btn mb-4"
          role="tablist"
          aria-label="Vista del plan"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "resumen"}
            onClick={() => setMainTab("resumen")}
            className={`flex-1 px-3 py-1.5 text-[13px] rounded-chip transition-all ${
              mainTab === "resumen"
                ? "bg-surface text-ink font-semibold shadow-card"
                : "text-muted hover:text-ink font-medium"
            }`}
          >
            Resumen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "plan"}
            onClick={() => setMainTab("plan")}
            className={`flex-1 px-3 py-1.5 text-[13px] rounded-chip transition-all ${
              mainTab === "plan"
                ? "bg-surface text-ink font-semibold shadow-card"
                : "text-muted hover:text-ink font-medium"
            }`}
          >
            Plan de trabajo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "indicadores"}
            onClick={() => setMainTab("indicadores")}
            className={`flex-1 px-3 py-1.5 text-[13px] rounded-chip transition-all ${
              mainTab === "indicadores"
                ? "bg-surface text-ink font-semibold shadow-card"
                : "text-muted hover:text-ink font-medium"
            }`}
          >
            Indicadores
          </button>
        </nav>

        {/* RESUMEN PANEL */}
        {mainTab === "resumen" && (
          <section>
            {/* Totals strip */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <StatCard label="Activas" value={(totals.total - totals.completed).toString()} compact />
              <StatCard label="Completadas" value={totals.completed.toString()} compact />
              <StatCard label="Avance" value={overallPct.toString()} unit="%" compact />
            </div>

            {/* Per-module progress */}
            <div className="grid grid-cols-2 gap-3">
              {progress.map((p) => (
                <div
                  key={p.category}
                  className="bg-surface border border-line rounded-card p-4 shadow-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] uppercase tracking-label text-muted font-medium truncate">
                      {p.label}
                    </div>
                    <div className="text-[11px] text-muted tabular-nums shrink-0">
                      {p.completed}/{p.total}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-0.5 mt-2">
                    <span className="text-[28px] font-semibold text-ink tabular-nums leading-none tracking-[-0.01em]">
                      {p.percentage}
                    </span>
                    <span className="text-[13px] text-muted font-medium">%</span>
                  </div>
                  <div
                    className="h-1.5 bg-line rounded-full mt-2.5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={p.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${p.label}: ${p.percentage}%`}
                  >
                    <div
                      className="h-full bg-teal-600 transition-[width] duration-700 ease-out"
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PLAN PANEL */}
        {mainTab === "plan" && (
          <section>
            {!hasActive && !creatingFor ? (
              <div className="bg-surface border border-line rounded-card p-6 text-center shadow-card">
                <p className="text-[14px] font-semibold text-ink">Todo al día por ahora</p>
                <p className="text-[12px] text-muted mt-1">
                  No hay tareas activas en este momento.
                </p>
                <button
                  type="button"
                  onClick={() => setCreatingFor("Gestión interna")}
                  className="mt-3 inline-flex items-center text-[12px] px-3 py-1.5 border border-line rounded-btn text-ink hover:bg-chip transition-colors"
                >
                  + Nueva tarea
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(grouped).map(([modulo, items]) => {
                  const enCurso = items.filter((t) => t.estado === "En curso");
                  const iniciativas = items.filter((t) => t.estado === "Iniciativa");
                  const tab = getModuleTab(modulo);
                  const visible = tab === "encurso" ? enCurso : iniciativas;
                  return (
                    <div
                      key={modulo}
                      className="bg-surface border border-line rounded-card p-4 shadow-card"
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h2 className="text-[11px] uppercase tracking-label text-ink font-semibold truncate">
                          {modulo}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setCreatingFor(modulo)}
                          className="text-[12px] px-2.5 py-1 border border-line rounded-btn text-ink hover:bg-chip transition-colors shrink-0"
                        >
                          + Nueva
                        </button>
                      </div>

                      <div className="inline-flex gap-0 bg-chip p-[2px] rounded-chip mb-2.5" role="tablist">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tab === "encurso"}
                          onClick={() => setModuleTab(modulo, "encurso")}
                          className={`px-2.5 py-1 text-[12px] rounded-[3px] transition-all inline-flex items-center gap-1.5 ${
                            tab === "encurso"
                              ? "bg-surface text-ink font-semibold shadow-card"
                              : "text-muted hover:text-ink font-medium"
                          }`}
                        >
                          En curso
                          <span className={`text-[11px] tabular-nums ${tab === "encurso" ? "text-ink" : "text-muted"}`}>
                            {enCurso.length}
                          </span>
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tab === "iniciativa"}
                          onClick={() => setModuleTab(modulo, "iniciativa")}
                          className={`px-2.5 py-1 text-[12px] rounded-[3px] transition-all inline-flex items-center gap-1.5 ${
                            tab === "iniciativa"
                              ? "bg-surface text-ink font-semibold shadow-card"
                              : "text-muted hover:text-ink font-medium"
                          }`}
                        >
                          Iniciativa
                          <span className={`text-[11px] tabular-nums ${tab === "iniciativa" ? "text-ink" : "text-muted"}`}>
                            {iniciativas.length}
                          </span>
                        </button>
                      </div>

                      {creatingFor === modulo && (
                        <div className="mb-2">
                          <NewTaskInline
                            defaultModulo={modulo}
                            onCreate={handleCreate}
                            onCancel={() => setCreatingFor(null)}
                          />
                        </div>
                      )}

                      {visible.length === 0 ? (
                        <p className="text-[12px] text-muted italic py-2">
                          Sin tareas {tab === "encurso" ? "en curso" : "iniciativa"} en este módulo.
                        </p>
                      ) : (
                        <ul className="divide-y divide-line">
                          {visible.map((t) => (
                            <TaskRow
                              key={t.id}
                              task={t}
                              pending={t.id ? pendingTaskIds.has(t.id) : false}
                              responsableSuggestions={responsableSuggestions}
                              onComplete={() => t.id && handleComplete(t.id)}
                              onChangeEstado={(e) => t.id && handleChangeEstado(t.id, e)}
                              onChangeResponsable={(r) => t.id && handleChangeResponsable(t.id, r)}
                              onDeleteRequest={() => setConfirmDelete(t)}
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}

                {creatingFor && !grouped[creatingFor] && (
                  <div className="bg-surface border border-line rounded-card p-4 shadow-card">
                    <h2 className="text-[11px] uppercase tracking-label text-ink font-semibold mb-2.5">
                      {creatingFor}
                    </h2>
                    <NewTaskInline
                      defaultModulo={creatingFor}
                      onCreate={handleCreate}
                      onCancel={() => setCreatingFor(null)}
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* INDICADORES PANEL */}
        {mainTab === "indicadores" && (
          <section>
            <IndicatorsPanel
              metrics={CLIENT_METRICS[clientId]}
              clientId={clientId}
              token={token}
            />
          </section>
        )}

        {updatedAt && (
          <p className="text-[11px] text-muted mt-4 text-right tabular-nums">
            Actualizado {updatedAt.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true })}
          </p>
        )}

        {confirmDelete && (
          <DeleteConfirmModal
            taskTitle={confirmDelete.titulo}
            pending={deleting}
            onConfirm={handleConfirmDelete}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  compact,
}: {
  label: string;
  value: string;
  unit?: string;
  compact?: boolean;
}) {
  return (
    <div className={`bg-surface border border-line rounded-card shadow-card ${compact ? "p-3" : "p-4"}`}>
      <div className="text-[11px] uppercase tracking-label text-muted font-medium truncate">
        {label}
      </div>
      <div className="flex items-baseline gap-0.5 mt-1.5">
        <span className={`${compact ? "text-[22px]" : "text-[28px]"} font-semibold text-ink tabular-nums leading-none tracking-[-0.01em]`}>
          {value}
        </span>
        {unit && <span className="text-[13px] text-muted font-medium">{unit}</span>}
      </div>
    </div>
  );
}
