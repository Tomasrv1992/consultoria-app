export type MetricPoint = { month: string; value: number };

export type Metric = {
  key: string;
  label: string;
  unit: "currency" | "percent" | "count";
  points: MetricPoint[];
  threshold?: { max: number };
};

export const CLIENT_METRICS: Record<string, Metric[]> = {
  "client-cygnuss": [
    {
      key: "ventas",
      label: "Ventas mensuales",
      unit: "currency",
      points: [
        { month: "Ene", value: 56417000 },
        { month: "Feb", value: 59975940 },
        { month: "Mar", value: 56384050 },
      ],
    },
    {
      key: "pilates",
      label: "Ocupación Pilates",
      unit: "percent",
      points: [
        { month: "Ene", value: 57 },
        { month: "Feb", value: 61 },
        { month: "Mar", value: 68 },
      ],
    },
    {
      key: "barre",
      label: "Ocupación Barre",
      unit: "percent",
      points: [
        { month: "Ene", value: 68 },
        { month: "Feb", value: 71 },
        { month: "Mar", value: 79 },
      ],
    },
    {
      key: "planes",
      label: "Planes activos",
      unit: "count",
      points: [
        { month: "Ene", value: 121 },
        { month: "Feb", value: 145 },
        { month: "Mar", value: 120 },
      ],
    },
    {
      key: "conversion",
      label: "Tasa de conversión",
      unit: "percent",
      points: [
        { month: "Ene", value: 28 },
        { month: "Feb", value: 28 },
        { month: "Mar", value: 21 },
      ],
      threshold: { max: 25 },
    },
    {
      key: "margen",
      label: "Margen",
      unit: "percent",
      points: [
        { month: "Ene", value: 42.8 },
        { month: "Feb", value: 34.3 },
      ],
    },
    {
      key: "roi",
      label: "ROI",
      unit: "percent",
      points: [
        { month: "Ene", value: 20.1 },
        { month: "Feb", value: 17.14 },
      ],
    },
  ],
  "client-dentilandia": [
    {
      key: "ventas",
      label: "Ventas mensuales",
      unit: "currency",
      points: [
        { month: "Ene", value: 166428820 },
        { month: "Feb", value: 202189183 },
        { month: "Mar", value: 216502174 },
      ],
    },
    {
      key: "atendidos",
      label: "Pacientes atendidos",
      unit: "count",
      points: [
        { month: "Ene", value: 978 },
        { month: "Feb", value: 1075 },
        { month: "Mar", value: 1052 },
      ],
    },
    {
      key: "nuevos",
      label: "Pacientes nuevos",
      unit: "count",
      points: [
        { month: "Ene", value: 166 },
        { month: "Feb", value: 124 },
        { month: "Mar", value: 127 },
      ],
    },
    {
      key: "ticket",
      label: "Ticket promedio",
      unit: "currency",
      points: [
        { month: "Ene", value: 107173 },
        { month: "Feb", value: 188083 },
        { month: "Mar", value: 205801 },
      ],
    },
  ],
  "client-acautos": [
    {
      key: "ventas",
      label: "Ventas mensuales",
      unit: "currency",
      points: [
        { month: "Ene", value: 40356000 },
        { month: "Feb", value: 71500000 },
        { month: "Mar", value: 62534000 },
      ],
    },
    {
      key: "captados",
      label: "Vehículos captados",
      unit: "count",
      points: [
        { month: "Ene", value: 15 },
        { month: "Feb", value: 34 },
        { month: "Mar", value: 38 },
      ],
    },
    {
      key: "inventario",
      label: "Vehículos en inventario",
      unit: "count",
      points: [
        { month: "Ene", value: 43 },
        { month: "Feb", value: 53 },
        { month: "Mar", value: 65 },
      ],
    },
    {
      key: "margen",
      label: "Margen",
      unit: "percent",
      points: [
        { month: "Ene", value: 27.3 },
        { month: "Feb", value: 38.5 },
        { month: "Mar", value: 31.2 },
      ],
      threshold: { max: 25 },
    },
  ],
};

export function getTrendingSummary(clientId: string): {
  total: number;
  up: number;
} {
  const metrics = CLIENT_METRICS[clientId];
  if (!metrics || metrics.length === 0) return { total: 0, up: 0 };
  let up = 0;
  for (const m of metrics) {
    if (m.points.length < 2) continue;
    const first = m.points[0].value;
    const last = m.points[m.points.length - 1].value;
    if (last > first) up += 1;
  }
  return { total: metrics.length, up };
}
