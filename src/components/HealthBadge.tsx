"use client";

import { HealthStatus } from "@/lib/types";

const colors: Record<HealthStatus, string> = {
  green: "#10B981",
  yellow: "#F59E0B",
  red: "#DC2626",
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: colors[status] }}
      aria-label={status}
    />
  );
}
