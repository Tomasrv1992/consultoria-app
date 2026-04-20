import { NextRequest, NextResponse } from "next/server";
import { MIRO_BOARDS } from "@/lib/clients-config";
import { fetchHistoricalCountsDetailed } from "@/lib/miro-historico";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Endpoint de diagnóstico. Requiere sesión Supabase.
// Uso: GET /api/debug/miro-historical?clientId=client-cygnuss
// Si no pasas clientId, revisa todos los boards configurados.
export async function GET(request: NextRequest) {
  const ssr = createServerSupabaseClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const token = process.env.MIRO_ACCESS_TOKEN;
  const clientId = request.nextUrl.searchParams.get("clientId");

  const ids = clientId ? [clientId] : Object.keys(MIRO_BOARDS);
  const results = await Promise.all(
    ids.map(async (id) => {
      const board = MIRO_BOARDS[id];
      if (!board) {
        return {
          clientId: id,
          status: "unknown_client",
          detail: "clientId no existe en MIRO_BOARDS",
          counts: null,
        };
      }
      const r = await fetchHistoricalCountsDetailed(
        board.boardId,
        board.historicoDocId,
        token
      );
      const total =
        r.counts.ingresos +
        r.counts.gestion +
        r.counts.operaciones +
        r.counts.mercadeo;
      return {
        clientId: id,
        boardId: board.boardId,
        historicoDocId: board.historicoDocId ?? null,
        status: r.status,
        detail: r.detail ?? null,
        counts: r.counts,
        total,
      };
    })
  );

  return NextResponse.json({
    tokenConfigured: Boolean(token),
    results,
  });
}
