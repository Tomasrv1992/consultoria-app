"use client";

import { useState } from "react";
import { Minute } from "@/lib/types";

interface MinuteCardProps {
  minute: Minute;
}

export function MinuteCard({ minute }: MinuteCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface border border-line shadow-card rounded-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-start justify-between gap-3 min-h-[44px]"
      >
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-medium text-ink">{minute.title}</h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="text-[12px] text-muted">{minute.date}</span>
            <span className="text-[12px] text-muted truncate">
              {minute.attendees.join(", ")}
            </span>
          </div>
        </div>
        <span className="text-muted text-[13px] mt-0.5">
          {expanded ? "–" : "+"}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-line space-y-4">
          {minute.sections.map((section) => (
            <div key={section.id} className="pt-3">
              <h5 className="text-[11px] font-medium uppercase tracking-label text-muted mb-2">
                {section.title}
              </h5>
              <p className="text-[14px] text-ink leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
