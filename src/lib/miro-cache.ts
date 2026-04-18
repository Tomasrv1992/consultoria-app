import { MiroTask } from "./types";
import { HistoricalCounts, EMPTY_HISTORICAL } from "./miro-historico";

export const MIRO_CACHE_TTL_MS = 5 * 60 * 1000;

export interface MiroSnapshot {
  tasks: MiroTask[];
  historical: HistoricalCounts;
}

interface Entry extends MiroSnapshot {
  expiresAt: number;
}

const cache = new Map<string, Entry>();

export function getCachedMiroSnapshot(clientId: string): MiroSnapshot | null {
  const entry = cache.get(clientId);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return { tasks: entry.tasks, historical: entry.historical };
}

export function setCachedMiroSnapshot(
  clientId: string,
  snapshot: MiroSnapshot
): void {
  cache.set(clientId, {
    ...snapshot,
    expiresAt: Date.now() + MIRO_CACHE_TTL_MS,
  });
}

export function updateCachedMiroTasks(
  clientId: string,
  updater: (prev: MiroTask[]) => MiroTask[]
): void {
  const entry = cache.get(clientId);
  if (!entry) return;
  cache.set(clientId, {
    ...entry,
    tasks: updater(entry.tasks),
  });
}

export function invalidateMiroCache(clientId: string): void {
  cache.delete(clientId);
}

export { EMPTY_HISTORICAL };
