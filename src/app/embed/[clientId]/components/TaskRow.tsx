"use client";

import { useEffect, useRef, useState } from "react";
import { MiroTask } from "@/lib/types";
import { TaskMenu } from "./TaskMenu";

interface Props {
  task: MiroTask;
  pending?: boolean;
  responsableSuggestions: string[];
  onComplete: () => void;
  onChangeEstado: (estado: string) => void;
  onChangeResponsable: (resp: string) => void;
  onChangeTitulo: (titulo: string) => void;
  onDeleteRequest: () => void;
}

function isOverdue(fecha: string | undefined): boolean {
  if (!fecha) return false;
  if (fecha === "Por definir") return false;
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
  onChangeTitulo,
  onDeleteRequest,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.titulo);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overdue = isOverdue(task.fecha);

  useEffect(() => {
    if (!editing) setDraft(task.titulo);
  }, [task.titulo, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.titulo) {
      onChangeTitulo(trimmed);
    } else {
      setDraft(task.titulo);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(task.titulo);
    setEditing(false);
  }

  return (
    <li className="grid grid-cols-[16px_1fr_auto_auto] gap-2 py-2.5 items-start group">
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
        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            disabled={pending}
            rows={1}
            className="w-full text-[13px] font-medium text-ink leading-snug bg-surface border border-teal-600 rounded-[4px] px-1.5 py-0.5 outline-none resize-none disabled:opacity-50"
          />
        ) : (
          <p
            onClick={() => !pending && setEditing(true)}
            title="Click para editar"
            className="text-[13px] font-medium text-ink leading-snug cursor-text rounded-[3px] -mx-1 px-1 -my-0.5 py-0.5 hover:bg-chip/60 transition-colors"
          >
            {task.titulo}
          </p>
        )}
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

      <button
        type="button"
        onClick={onDeleteRequest}
        disabled={pending}
        aria-label="Eliminar tarea"
        title="Eliminar"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-[20px] h-[20px] inline-flex items-center justify-center text-muted hover:text-danger hover:bg-chip rounded-chip transition-all shrink-0 disabled:opacity-30"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </li>
  );
}
