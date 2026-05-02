"use client";

import { useState } from "react";
import { MiroTask } from "@/lib/types";
import { TaskMenu } from "./TaskMenu";

interface Props {
  task: MiroTask;
  pending?: boolean;
  responsableSuggestions: string[];
  onComplete: () => void;
  onChangeEstado: (estado: string) => void;
  onChangeResponsable: (resp: string) => void;
  onDeleteRequest: () => void;
}

function isOverdue(fecha: string | undefined): boolean {
  if (!fecha) return false;
  if (fecha === "Por definir") return false;
  // intenta parsear; si no se puede, no marcar
  const t = Date.parse(fecha);
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

export function TaskRow({
  task,
  pending,
  responsableSuggestions,
  onComplete,
  onChangeEstado,
  onChangeResponsable,
  onDeleteRequest,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const overdue = isOverdue(task.fecha);

  return (
    <li className="grid grid-cols-[16px_1fr_auto_18px] gap-2.5 py-2.5 items-start group">
      <button
        type="button"
        onClick={onComplete}
        disabled={pending}
        aria-label="Completar tarea"
        className="mt-0.5 w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-line hover:border-teal-600 bg-surface flex items-center justify-center disabled:opacity-50 transition-colors shrink-0"
      >
        {pending && <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink leading-snug">{task.titulo}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted mt-0.5">
          {task.responsable && (
            <span className="text-chipink font-medium">{task.responsable}</span>
          )}
          {task.fecha && task.fecha !== "Por definir" && (
            <>
              {task.responsable && <span className="text-line" aria-hidden="true">·</span>}
              <span className={`tabular-nums ${overdue ? "text-danger font-semibold" : ""}`}>
                {task.fecha}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Más opciones"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-[18px] h-[18px] inline-flex items-center justify-center text-muted hover:text-ink hover:bg-chip rounded-chip transition-all shrink-0"
        >
          ⋯
        </button>
        {menuOpen && (
          <TaskMenu
            estado={task.estado}
            responsable={task.responsable || null}
            responsableSuggestions={responsableSuggestions}
            pending={pending}
            onChangeEstado={onChangeEstado}
            onChangeResponsable={onChangeResponsable}
            onDeleteRequest={onDeleteRequest}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
      <span aria-hidden="true" />
    </li>
  );
}
