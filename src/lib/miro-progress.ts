import {
  MiroTask,
  ModuleCategory,
  ProgressByModule,
  MODULE_LABELS,
} from "./types";
import {
  HistoricalCounts,
  EMPTY_HISTORICAL,
  historicalTotal,
} from "./miro-historico";

export function moduloToCategory(modulo: string): ModuleCategory | null {
  const key = modulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/ingreso/.test(key)) return "ingresos";
  if (/gestion|contabilidad|talento|finanz/.test(key)) return "gestion";
  if (/operacion|importaci|expansi/.test(key)) return "operaciones";
  if (/mercadeo|mercado/.test(key)) return "mercadeo";
  return null;
}

export function computeProgressFromMiro(
  tasks: MiroTask[],
  historical: HistoricalCounts = EMPTY_HISTORICAL
): ProgressByModule[] {
  const categories: ModuleCategory[] = [
    "ingresos",
    "gestion",
    "operaciones",
    "mercadeo",
  ];
  const buckets: Record<ModuleCategory, { total: number; completed: number }> = {
    ingresos: { total: 0, completed: 0 },
    gestion: { total: 0, completed: 0 },
    operaciones: { total: 0, completed: 0 },
    mercadeo: { total: 0, completed: 0 },
  };
  for (const t of tasks) {
    const cat = moduloToCategory(t.modulo);
    if (!cat) continue;
    buckets[cat].total += 1;
    if (t.estado === "Completada") buckets[cat].completed += 1;
  }
  return categories.map((cat) => {
    const hist = historical[cat];
    const total = buckets[cat].total + hist;
    const completed = buckets[cat].completed + hist;
    return {
      category: cat,
      label: MODULE_LABELS[cat],
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });
}

export function miroTotals(
  tasks: MiroTask[],
  historical: HistoricalCounts = EMPTY_HISTORICAL
): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const t of tasks) {
    total += 1;
    if (t.estado === "Completada") completed += 1;
  }
  const histTotal = historicalTotal(historical);
  return { total: total + histTotal, completed: completed + histTotal };
}
