"use client";

interface Props {
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}

export function DeleteConfirmModal({ taskTitle, onConfirm, onCancel, pending }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div className="bg-white rounded-card border border-line p-4 w-full max-w-sm shadow-lg">
        <p className="text-[13px] font-medium text-ink">¿Borrar esta tarea?</p>
        <p className="text-[12px] text-muted mt-2 italic">&ldquo;{taskTitle}&rdquo;</p>
        <p className="text-[11px] text-muted mt-2">Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-3 py-1.5 text-[12px] text-muted border border-line rounded-chip hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="px-3 py-1.5 text-[12px] bg-red-600 text-white rounded-chip hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Borrando..." : "Borrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
