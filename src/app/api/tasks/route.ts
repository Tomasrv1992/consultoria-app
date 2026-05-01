import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MIRO_BOARDS } from "@/lib/clients-config";
import { MiroTask } from "@/lib/types";
import {
  fetchHistoricalCounts,
  EMPTY_HISTORICAL,
  HistoricalCounts,
} from "@/lib/miro-historico";
import { getSupabaseServerConfig } from "@/lib/supabase-env";
import { checkAuth } from "@/lib/auth-embed";

export const dynamic = "force-dynamic";

interface TaskRow {
  id: string;
  titulo: string;
  modulo: string;
  responsable: string | null;
  prioridad: string | null;
  fecha_limite: string | null;
  estado: string;
  fecha_ingreso: string | null;
  miro_row_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
}

function rowToTask(r: TaskRow): MiroTask {
  return {
    id: r.id,
    titulo: r.titulo,
    modulo: r.modulo,
    responsable: r.responsable ?? "",
    prioridad: r.prioridad ?? "",
    fecha: r.fecha_limite ?? "",
    estado: r.estado,
    fechaIngreso: r.fecha_ingreso ?? undefined,
    rowId: r.miro_row_id ?? undefined,
    completedAt: r.completed_at ?? undefined,
    completedBy: r.completed_by ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  }

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseServerConfig();
  const supabase = createClient(supabaseUrl, supabaseKey);

  const token = process.env.MIRO_ACCESS_TOKEN;
  const board = MIRO_BOARDS[clientId];

  const [tasksRes, historical] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, titulo, modulo, responsable, prioridad, fecha_limite, estado, fecha_ingreso, miro_row_id, completed_at, completed_by"
      )
      .eq("client_id", clientId)
      .order("fecha_ingreso", { ascending: false }),
    token && board?.historicoDocId
      ? fetchHistoricalCounts(board.boardId, board.historicoDocId, token)
      : Promise.resolve<HistoricalCounts>(EMPTY_HISTORICAL),
  ]);

  if (tasksRes.error) {
    console.warn("[api/tasks] error:", tasksRes.error);
    return NextResponse.json(
      { error: tasksRes.error.message, tasks: [], historical },
      { status: 500 }
    );
  }

  const tasks = (tasksRes.data ?? []).map((r) => rowToTask(r as TaskRow));
  return NextResponse.json({
    tasks,
    historical,
    total: tasks.length,
    source: "supabase",
  });
}
