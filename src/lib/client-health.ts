import { HealthStatus, Task } from "./types";
import { getTrendingSummary } from "./client-metrics";

function sameCalendarMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
  );
}

export interface HealthBreakdown {
  status: HealthStatus;
  score: number;
  completionThisMonthPct: number;
  trendingUpPct: number;
  hasTrendData: boolean;
}

export function computeClientHealth(
  clientId: string,
  tasks: Task[],
  now: Date = new Date()
): HealthBreakdown {
  const total = tasks.length;
  const completedThisMonth = tasks.filter(
    (t) => t.completed && t.completed_at && sameCalendarMonth(t.completed_at, now)
  ).length;
  const completionThisMonthPct =
    total > 0 ? (completedThisMonth / total) * 100 : 0;

  const trend = getTrendingSummary(clientId);
  const hasTrendData = trend.total > 0;
  const trendingUpPct = hasTrendData ? (trend.up / trend.total) * 100 : 0;

  const score = hasTrendData
    ? (completionThisMonthPct + trendingUpPct) / 2
    : completionThisMonthPct;

  const status: HealthStatus =
    score > 70 ? "green" : score >= 40 ? "yellow" : "red";

  return {
    status,
    score,
    completionThisMonthPct,
    trendingUpPct,
    hasTrendData,
  };
}
