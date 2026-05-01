"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MiroTask } from "@/lib/types";
import { HistoricalCounts, EMPTY_HISTORICAL } from "@/lib/miro-historico";
import { computeProgressFromMiro } from "@/lib/miro-progress";
import { TaskRow } from "./components/TaskRow";
import { NewTaskInline } from "./components/NewTaskInline";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
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

type MainTab = "resumen" | "plan";
type ModuleTab = "encurso" | "iniciativa";

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
        return a.titulo.localeCompare(b.titulo);
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

  if (loadError) {
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
              {loadError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasActive = activeTasks.length > 0;

  return (
    <div className="p-4 bg-transparent animate-[fadeIn_200ms_ease-out]">
      {actionError && (
        <div className="mb-3 bg-red-50 border border-red-100 rounded-card p-2.5 flex items-start justify-between gap-2">
          <p className="text-[11px] text-red-700">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[11px] text-red-700 hover:underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Tab principal: Resumen vs Plan de trabajo */}
      <div className="flex gap-1 mb-4 bg-white/60 border border-line rounded-chip p-0.5" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "resumen"}
          onClick={() => setMainTab("resumen")}
          className={`flex-1 text-[11px] uppercase tracking-label font-medium px-3 py-1.5 rounded-chip transition-colors ${
            mainTab === "resumen"
              ? "bg-teal-600 text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          Resumen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "plan"}
          onClick={() => setMainTab("plan")}
          className={`flex-1 text-[11px] uppercase tracking-label font-medium px-3 py-1.5 rounded-chip transition-colors ${
            mainTab === "plan"
              ? "bg-teal-600 text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          Plan de trabajo
        </button>
      </div>

      {mainTab === "resumen" && (
        <div className="grid grid-cols-2 gap-3">
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
      )}

      {mainTab === "plan" && (
        <>
          {!hasActive && !creatingFor ? (
            <div className="bg-white/90 border border-line rounded-card p-6 text-center">
              <p className="text-[13px] font-medium text-ink">Todo al día por ahora</p>
              <p className="text-[11px] text-muted mt-1">
                No hay tareas activas en este momento.
              </p>
              <button
                type="button"
                onClick={() => setCreatingFor("Gestión interna")}
                className="mt-3 text-[11px] px-3 py-1 text-teal-700 hover:bg-teal-50 rounded-chip"
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
                    className="bg-white/90 backdrop-blur-sm border border-line rounded-card p-3"
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h2 className="text-[11px] uppercase tracking-label font-medium text-ink truncate">
                        {modulo}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setCreatingFor(modulo)}
                        className="text-[11px] px-2 py-0.5 text-teal-700 hover:bg-teal-50 rounded-chip shrink-0"
                      >
                        + Nueva
                      </button>
                    </div>

                    <div className="flex gap-1 mb-2 border-b border-line" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={tab === "encurso"}
                        onClick={() => setModuleTab(modulo, "encurso")}
                        className={`text-[11px] px-2 py-1 -mb-px border-b-2 transition-colors ${
                          tab === "encurso"
                            ? "border-teal-600 text-ink font-medium"
                            : "border-transparent text-muted hover:text-ink"
                        }`}
                      >
                        En curso <span className="tabular-nums text-muted">({enCurso.length})</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={tab === "iniciativa"}
                        onClick={() => setModuleTab(modulo, "iniciativa")}
                        className={`text-[11px] px-2 py-1 -mb-px border-b-2 transition-colors ${
                          tab === "iniciativa"
                            ? "border-teal-600 text-ink font-medium"
                            : "border-transparent text-muted hover:text-ink"
                        }`}
                      >
                        Iniciativa <span className="tabular-nums text-muted">({iniciativas.length})</span>
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
                      <p className="text-[11px] text-muted italic py-2">
                        Sin tareas {tab === "encurso" ? "en curso" : "iniciativa"} en este módulo.
                      </p>
                    ) : (
                      <ul className="space-y-1">
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
                <div className="bg-white/90 backdrop-blur-sm border border-line rounded-card p-3">
                  <h2 className="text-[11px] uppercase tracking-label font-medium text-ink mb-2">
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
        </>
      )}

      {updatedAt && (
        <p className="text-[10px] text-muted mt-3 text-right tabular-nums">
          Actualizado {updatedAt.toLocaleTimeString("es-CO")}
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
  );
}
