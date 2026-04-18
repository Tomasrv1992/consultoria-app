"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { AppShell } from "@/components/AppShell";
import { moduloToCategory } from "@/lib/miro-progress";
import { invalidateMiroCache } from "@/lib/miro-cache";

interface ParsedTask {
  titulo: string;
  modulo: string;
  responsable?: string;
  prioridad?: string;
  fecha_limite?: string;
  estado?: string;
  _ok: boolean;
  _error?: string;
}

const EXAMPLE = `[
  {
    "titulo": "Cotizar guantes nitrilo",
    "modulo": "Operaciones",
    "responsable": "Lina",
    "prioridad": "Media",
    "fecha_limite": "22/04/2026",
    "estado": "En curso"
  },
  {
    "titulo": "Definir paquetes estrella",
    "modulo": "Ingresos",
    "prioridad": "Alta",
    "estado": "Iniciativa"
  }
]`;

const VALID_ESTADOS = new Set(["En curso", "Iniciativa", "Completada"]);

function parseInput(raw: string): {
  tasks: ParsedTask[];
  parseError: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { tasks: [], parseError: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return {
      tasks: [],
      parseError: `JSON inválido: ${(e as Error).message}`,
    };
  }
  if (!Array.isArray(parsed)) {
    return {
      tasks: [],
      parseError: "Se esperaba un array de tareas",
    };
  }
  const tasks: ParsedTask[] = parsed.map((item) => {
    const t = item as Record<string, unknown>;
    const titulo = (t.titulo as string) || "";
    const modulo = (t.modulo as string) || "";
    const estado = ((t.estado as string) || "En curso").trim();
    const errors: string[] = [];
    if (!titulo.trim()) errors.push("titulo vacío");
    if (!modulo.trim()) errors.push("modulo vacío");
    if (modulo && !moduloToCategory(modulo))
      errors.push(`modulo desconocido: ${modulo}`);
    if (!VALID_ESTADOS.has(estado))
      errors.push(`estado inválido: ${estado}`);
    return {
      titulo: titulo.trim(),
      modulo: modulo.trim(),
      responsable: (t.responsable as string) || undefined,
      prioridad: (t.prioridad as string) || undefined,
      fecha_limite:
        ((t.fecha_limite as string) || (t.fecha as string)) ?? undefined,
      estado,
      _ok: errors.length === 0,
      _error: errors.length ? errors.join(", ") : undefined,
    };
  });
  return { tasks, parseError: null };
}

export default function PegarPendientesPage() {
  const params = useParams();
  const clientId = params.id as string;
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { getClient } = useData();

  const [raw, setRaw] = useState("");
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { ok: boolean; text: string } | null
  >(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const { tasks, parseError } = useMemo(() => parseInput(raw), [raw]);

  useEffect(() => {
    const next: Record<number, boolean> = {};
    tasks.forEach((t, i) => {
      next[i] = t._ok;
    });
    setSelected(next);
  }, [tasks]);

  const client = getClient(clientId);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-line border-t-ink rounded-full animate-spin" />
      </div>
    );
  }
  if (profile?.role !== "consultant") {
    router.replace(`/client/${clientId}`);
    return null;
  }
  if (!client) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-muted text-[14px]">Cliente no encontrado</p>
      </div>
    );
  }

  const selectedTasks = tasks.filter((_, i) => selected[i] && tasks[i]._ok);

  async function handleConfirm() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/tasks/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, tasks: selectedTasks }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        invalidateMiroCache(clientId);
        setResult({
          ok: true,
          text: `✓ ${data.inserted} tareas añadidas`,
        });
        setTimeout(() => {
          router.push(`/client/${clientId}`);
        }, 900);
      } else {
        setResult({
          ok: false,
          text: data.error || "Error al insertar",
        });
      }
    } catch (e) {
      setResult({
        ok: false,
        text: `Error de red: ${(e as Error).message}`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title={`${client.name} — Pegar pendientes`}
      subtitle="Formato JSON desde Claude"
      onBack={() => router.push(`/client/${clientId}`)}
    >
      <div className="max-w-4xl space-y-4">
        <div className="bg-surface border border-line rounded-card p-5 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-label font-medium text-muted">
              JSON de tareas
            </label>
            <p className="text-[12px] text-muted mt-1">
              Array de objetos con campos: titulo, modulo, responsable,
              prioridad, fecha_limite, estado. Ejemplo abajo.
            </p>
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={EXAMPLE}
            rows={12}
            className="w-full font-mono text-[12px] leading-snug bg-bg border border-line rounded-btn p-3 text-ink focus:outline-none focus:border-ink/40"
          />
          {parseError && (
            <p className="text-[12px] text-danger">{parseError}</p>
          )}
          {!parseError && tasks.length > 0 && (
            <p className="text-[12px] text-muted">
              {tasks.filter((t) => t._ok).length} tareas válidas ·{" "}
              {tasks.filter((t) => !t._ok).length} con errores
            </p>
          )}
        </div>

        {tasks.length > 0 && (
          <div className="bg-surface border border-line rounded-card p-5">
            <div className="text-[11px] uppercase tracking-label font-medium text-muted mb-3">
              Vista previa
            </div>
            <div className="divide-y divide-line">
              {tasks.map((t, i) => (
                <div key={i} className="py-2 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected[i]}
                    disabled={!t._ok}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [i]: e.target.checked }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[14px] leading-snug ${
                        t._ok ? "text-ink" : "text-muted line-through"
                      }`}
                    >
                      {t.titulo || "(sin titulo)"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-muted">
                      <span>{t.modulo}</span>
                      {t.responsable && <span>· {t.responsable}</span>}
                      {t.prioridad && <span>· {t.prioridad}</span>}
                      {t.fecha_limite && <span>· {t.fecha_limite}</span>}
                      <span>· {t.estado}</span>
                    </div>
                    {t._error && (
                      <p className="text-[11px] text-danger mt-0.5">
                        {t._error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div
            className={`rounded-card px-4 py-3 border text-[13px] ${
              result.ok
                ? "bg-teal-50 border-teal-600/20 text-teal-600"
                : "bg-amber-50 border-amber-500/30 text-amber-700"
            }`}
          >
            {result.text}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={submitting || selectedTasks.length === 0}
            className="h-10 px-4 rounded-btn bg-ink text-white text-[13px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
          >
            {submitting
              ? "Insertando..."
              : `Confirmar (${selectedTasks.length})`}
          </button>
          <button
            onClick={() => setRaw(EXAMPLE)}
            className="h-10 px-4 rounded-btn border border-line text-[13px] font-medium text-ink hover:bg-bg transition-colors"
          >
            Cargar ejemplo
          </button>
        </div>
      </div>
    </AppShell>
  );
}
