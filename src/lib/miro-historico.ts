import { ModuleCategory } from "./types";

export type HistoricalCounts = Record<ModuleCategory, number>;

export const EMPTY_HISTORICAL: HistoricalCounts = {
  ingresos: 0,
  gestion: 0,
  operaciones: 0,
  mercadeo: 0,
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function categoryOf(title: string): ModuleCategory | null {
  const k = normalize(title);
  if (/ingreso/.test(k)) return "ingresos";
  if (/gestion|contabilidad|talento/.test(k)) return "gestion";
  if (/operacion/.test(k)) return "operaciones";
  if (/mercadeo|mercado/.test(k)) return "mercadeo";
  return null;
}

function countLi(sectionBody: string): number {
  const m = sectionBody.match(/<h2>[^<][\s\S]*?<\/h2>/);
  const body = m && m.index !== undefined ? sectionBody.slice(0, m.index) : sectionBody;
  return (body.match(/<li\b/g) || []).length;
}

export function parseHistoricoContent(content: string): HistoricalCounts {
  const out: HistoricalCounts = { ...EMPTY_HISTORICAL };
  const sections = content.split(/(?=<h1>)/);
  for (const s of sections) {
    const m = s.match(/^<h1>([^<]+)<\/h1>([\s\S]*)$/);
    if (!m) continue;
    const cat = categoryOf(m[1]);
    if (!cat) continue;
    out[cat] += countLi(m[2]);
  }
  return out;
}

export async function fetchHistoricalCounts(
  boardId: string,
  docId: string,
  token: string
): Promise<HistoricalCounts> {
  try {
    const url = `https://api.miro.com/v2/boards/${encodeURIComponent(
      boardId
    )}/items/${docId}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn("[miro/historico] fetch failed", res.status, boardId, docId);
      return EMPTY_HISTORICAL;
    }
    const data = await res.json();
    const content: string = data?.data?.content ?? "";
    return parseHistoricoContent(content);
  } catch (err) {
    console.warn("[miro/historico] exception:", err);
    return EMPTY_HISTORICAL;
  }
}

export function historicalTotal(h: HistoricalCounts): number {
  return h.ingresos + h.gestion + h.operaciones + h.mercadeo;
}
