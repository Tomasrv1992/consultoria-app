"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  onCancel: () => void;
}

export function ResponsableAutocomplete({ value, suggestions, onChange, onCancel }: Props) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [onCancel]);

  const filtered = useMemo(() => {
    const q = draft.toLowerCase().trim();
    if (!q) return suggestions.slice(0, 5);
    return suggestions
      .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, 5);
  }, [draft, suggestions]);

  function commit(val: string) {
    if (val.trim()) onChange(val.trim());
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={draft}
        autoFocus
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") onCancel();
        }}
        onFocus={() => setOpen(true)}
        className="w-full text-[12px] px-2 py-1 border border-line rounded-chip outline-none focus:border-teal-600"
        placeholder="Responsable..."
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-line rounded-card shadow-lg z-10 max-h-40 overflow-auto">
          {filtered.map((s) => (
            <li
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(s);
              }}
              className="px-2 py-1.5 text-[12px] hover:bg-gray-50 cursor-pointer"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
