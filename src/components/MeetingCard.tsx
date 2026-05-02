"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Meeting } from "@/lib/types";

interface Props {
  meeting: Meeting;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MeetingCard({ meeting }: Props) {
  const [expanded, setExpanded] = useState(false);

  const tareasTotal =
    meeting.tareas_creadas_ids.length +
    meeting.tareas_completadas_ids.length +
    meeting.tareas_actualizadas_ids.length;

  return (
    <div className="bg-surface border border-line shadow-card rounded-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-bg/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-ink">
              {formatDate(meeting.fecha_reunion)}
            </span>
            {meeting.duracion_min && (
              <span className="text-[11px] text-muted tabular-nums">
                · {meeting.duracion_min} min
              </span>
            )}
            {meeting.pending_miro_sync && (
              <span className="text-[10px] uppercase tracking-label text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-chip">
                Sin publicar en Miro
              </span>
            )}
          </div>
          <div className="text-[12px] text-muted mt-0.5 truncate">
            {meeting.asistentes.length > 0
              ? meeting.asistentes.join(" · ")
              : "Sin asistentes registrados"}
            {tareasTotal > 0 && (
              <span className="text-muted">
                {" · "}
                {tareasTotal} tarea{tareasTotal === 1 ? "" : "s"} tocada
                {tareasTotal === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <span
          className={`text-muted shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="border-t border-line p-4 minuta-md">
          <ReactMarkdown>{meeting.minuta_md}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
