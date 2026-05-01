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

  return (
    <li className="flex items-start gap-2 text-[12px] leading-snug py-1 px-1 -mx-1 rounded hover:bg-gray-50/50 group">
      <button
        type="button"
        onClick={onComplete}
        disabled={pending}
        aria-label="Completar tarea"
        className="mt-0.5 w-4 h-4 rounded border border-line hover:border-teal-600 flex items-center justify-center disabled:opacity-50 shrink-0"
      >
        {pending && <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-ink">{task.titulo}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted mt-0.5">
          {task.responsable && <span>{task.responsable}</span>}
          {task.fecha && task.fecha !== "Por definir" && (
            <span className="tabular-nums">· {task.fecha}</span>
          )}
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Más opciones"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-1.5 py-0.5 text-muted hover:text-ink rounded shrink-0"
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
    </li>
  );
}
