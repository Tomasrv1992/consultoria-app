"use client";

import { useEffect, useRef, useState } from "react";
import { ResponsableAutocomplete } from "./ResponsableAutocomplete";

interface Props {
  estado: string;
  responsable: string | null;
  responsableSuggestions: string[];
  onChangeEstado: (estado: string) => void;
  onChangeResponsable: (resp: string) => void;
  onDeleteRequest: () => void;
  onClose: () => void;
}

const ESTADOS = ["En curso", "Iniciativa"];

export function TaskMenu({
  estado,
  responsable,
  responsableSuggestions,
  onChangeEstado,
  onChangeResponsable,
  onDeleteRequest,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [editingResp, setEditingResp] = useState(false);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 bg-white border border-line rounded-card shadow-lg z-20 w-56 p-2"
    >
      <div className="space-y-2">
        <div>
          <label className="text-[10px] uppercase tracking-label text-muted">Estado</label>
          <select
            value={estado}
            onChange={(e) => {
              onChangeEstado(e.target.value);
              onClose();
            }}
            className="w-full text-[12px] px-2 py-1 border border-line rounded-chip outline-none mt-1"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-label text-muted">Responsable</label>
          {editingResp ? (
            <ResponsableAutocomplete
              value={responsable || ""}
              suggestions={responsableSuggestions}
              onChange={(v) => {
                onChangeResponsable(v);
                setEditingResp(false);
                onClose();
              }}
              onCancel={() => setEditingResp(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingResp(true)}
              className="w-full text-left text-[12px] px-2 py-1 border border-line rounded-chip hover:bg-gray-50"
            >
              {responsable || "(sin asignar)"}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onDeleteRequest();
            onClose();
          }}
          className="w-full text-left text-[12px] px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-chip flex items-center gap-2"
        >
          <span>🗑️</span>
          <span>Borrar tarea</span>
        </button>
      </div>
    </div>
  );
}
