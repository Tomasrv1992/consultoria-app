"use client";

import { Task } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  canToggle: boolean;
  onToggle: (taskId: string) => void;
}

export function TaskItem({ task, canToggle, onToggle }: TaskItemProps) {
  return (
    <div
      className={`flex items-start gap-3 py-3 ${
        task.completed ? "opacity-40" : ""
      }`}
    >
      <button
        onClick={() => canToggle && onToggle(task.id)}
        disabled={!canToggle}
        className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded border flex items-center justify-center transition-colors ${
          task.completed
            ? "bg-teal border-teal"
            : "bg-surface border-line hover:border-muted"
        } ${canToggle ? "cursor-pointer" : "cursor-default"}`}
        aria-label={task.completed ? "Marcar pendiente" : "Marcar completada"}
      >
        {task.completed && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[14px] leading-snug ${
            task.completed ? "line-through text-muted" : "text-ink"
          }`}
        >
          {task.title}
        </p>
        {task.completed_at && (
          <p className="text-[12px] text-muted mt-0.5">
            Completada · {task.completed_at}
          </p>
        )}
      </div>
    </div>
  );
}
