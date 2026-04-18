"use client";

interface ProgressBarProps {
  percentage: number;
  label?: string;
  completed?: number;
  total?: number;
}

export function ProgressBar({
  percentage,
  label,
  completed,
  total,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      {(label || total !== undefined) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-[13px] text-ink">{label}</span>
          )}
          {total !== undefined && (
            <span className="text-[12px] text-muted tabular-nums">
              {completed}/{total} · {percentage}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full bg-teal transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
