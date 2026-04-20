import { ModuleCategory } from "./types";

export type HistoricalCounts = Record<ModuleCategory, number>;

export const EMPTY_HISTORICAL: HistoricalCounts = {
  ingresos: 0,
  gestion: 0,
  operaciones: 0,
  mercadeo: 0,
};

export type HistoricalFetchStatus =
  | "ok"
  | "skipped_no_token"
  | "skipped_no_doc"
  | "http_error"
  | "parse_empty"
  | "exception";

export interface HistoricalFetchResult {
  counts: HistoricalCounts;
  status: HistoricalFetchStatus;
  detail?: string;
}

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
  if (/gestion|contabilidad|talento|finanz/.test(k)) return "gestion";
  if (/operacion|importaci|expansi/.test(k)) return "operaciones";
  if (/mercadeo|mercado/.test(k)) return "mercadeo";
  return null;
}

// Cuenta <li> dentro del cuerpo de una sección. Corta cuando aparece
// el siguiente H1/H2 (empieza otra sección).
function countLi(sectionBody: string): number {
  const next = sectionBody.match(/<h[12]\b/i);
  const body =
    next && next.index !== undefined
      ? sectionBody.slice(0, next.index)
      : sectionBody;
  return (body.match(/<li\b/gi) || []).length;
}

export function parseHistoricoContent(content: string): HistoricalCounts {
  const out: HistoricalCounts = { ...EMPTY_HISTORICAL };
  if (!content) return out;

  // Partimos por apariciones de <h1>. Dentro de cada bloque buscamos el
  // título y contamos <li> hasta el siguiente H1/H2.
  const sections = content.split(/(?=<h1\b)/i);
  for (const s of sections) {
    const m = s.match(/^<h1\b[^>]*>([\s\S]*?)<\/h1>([\s\S]*)$/i);
    if (!m) continue;
    const rawTitle = m[1].replace(/<[^>]+>/g, "");
    const cat = categoryOf(rawTitle);
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
  const r = await fetchHistoricalCountsDetailed(boardId, docId, token);
  return r.counts;
}

export async function fetchHistoricalCountsDetailed(
  boardId: string | undefined,
  docId: string | undefined,
  token: string | undefined
): Promise<HistoricalFetchResult> {
  if (!token) {
    return {
      counts: EMPTY_HISTORICAL,
      status: "skipped_no_token",
      detail: "MIRO_ACCESS_TOKEN no configurado",
    };
  }
  if (!boardId || !docId) {
    return {
      counts: EMPTY_HISTORICAL,
      status: "skipped_no_doc",
      detail: "boardId o historicoDocId faltan",
    };
  }
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
      const body = await res.text().catch(() => "");
      console.warn(
        "[miro/historico] http error",
        res.status,
        "board",
        boardId,
        "doc",
        docId,
        body.slice(0, 200)
      );
      return {
        counts: EMPTY_HISTORICAL,
        status: "http_error",
        detail: `HTTP ${res.status}`,
      };
    }
    const data = await res.json();
    const content: string = data?.data?.content ?? "";
    const counts = parseHistoricoContent(content);
    const total =
      counts.ingresos + counts.gestion + counts.operaciones + counts.mercadeo;
    if (total === 0) {
      console.warn(
        "[miro/historico] parseo devolvió 0 tareas — verificar formato del doc",
        "board",
        boardId,
        "doc",
        docId,
        "len",
        content.length
      );
      return {
        counts,
        status: "parse_empty",
        detail: `doc leído (${content.length} chars) pero 0 <li> reconocidos`,
      };
    }
    return { counts, status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[miro/historico] exception", boardId, docId, msg);
    return {
      counts: EMPTY_HISTORICAL,
      status: "exception",
      detail: msg,
    };
  }
}

export function historicalTotal(h: HistoricalCounts): number {
  return h.ingresos + h.gestion + h.operaciones + h.mercadeo;
}
