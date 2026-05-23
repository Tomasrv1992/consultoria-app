"use client";

import { useState } from "react";

const MODULOS = ["Gestión interna", "Operaciones", "Mercadeo", "Ingresos"];

interface Props {
  defaultModulo: string;
  onCreate: (data: { titulo: string; modulo: string }) => Promise<void>;
  onCancel: () => void;
}

export function NewTaskInline({ defaultModulo, onCreate, onCancel }: Props) {
  const [titulo, setTitulo] = useState("");
  const [modulo, setModulo] = useState(defaultModulo);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      setError("El título es obligatorio");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onCreate({ titulo: titulo.trim(), modulo });
      setTitulo("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50/80 border border-line rounded-card p-2 space-y-2">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        autoFocus
        placeholder="Título de la tarea..."
        disabled={pending}
        className="w-full text-[12px] px-2 py-1.5 border border-line rounded-chip outline-none focus:border-teal-600 disabled:opacity-50"
      />
      <div className="flex items-center gap-2">
        <select
          value={modulo}
          onChange={(e) => setModulo(e.target.value)}
          disabled={pending}
          className="text-[11px] px-2 py-1 border border-line rounded-chip outline-none disabled:opacity-50"
        >
          {MODULOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-[11px] px-2 py-1 text-muted hover:text-ink disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="text-[11px] px-3 py-1 bg-teal-600 text-white rounded-chip hover:bg-teal-700 disabled:opacity-50"
        >
          {pending ? "Creando..." : "Crear"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </form>
  );
}
