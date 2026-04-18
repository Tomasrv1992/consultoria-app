import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMiroTasks } from "@/lib/miro-data";
import { moduloToCategory } from "@/lib/miro-progress";
import { MIRO_BOARDS } from "@/lib/clients-config";
import type { ModuleCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const MIGRATION_SECRET = "migrate-2026-abril";

interface TaskRow {
  client_id: string;
  titulo: string;
  modulo: string;
  categoria: ModuleCategory;
  responsable: string | null;
  prioridad: string | null;
  fecha_limite: string | null;
  estado: string;
  miro_row_id: string | null;
  completed_at: string | null;
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== MIGRATION_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "supabase not configured" },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Pull existing completions to apply during seed
  const { data: completions } = await supabase
    .from("task_completions")
    .select("client_id, row_id, completed_at, completed_by");
  const completedByRow = new Map<string, { at: string; by: string | null }>();
  for (const c of completions ?? []) {
    if (c.row_id) {
      completedByRow.set(`${c.client_id}:${c.row_id}`, {
        at: c.completed_at,
        by: c.completed_by,
      });
    }
  }

  const rowsToInsert: TaskRow[] = [];
  const skipped: { clientId: string; titulo: string; reason: string }[] = [];

  for (const clientId of Object.keys(MIRO_BOARDS)) {
    const tasks = getMiroTasks(clientId);
    for (const t of tasks) {
      const categoria = moduloToCategory(t.modulo);
      if (!categoria) {
        skipped.push({
          clientId,
          titulo: t.titulo,
          reason: `unknown modulo: ${t.modulo}`,
        });
        continue;
      }
      const completion = t.rowId
        ? completedByRow.get(`${clientId}:${t.rowId}`)
        : undefined;
      const estado = completion ? "Completada" : t.estado;
      rowsToInsert.push({
        client_id: clientId,
        titulo: t.titulo,
        modulo: t.modulo,
        categoria,
        responsable: t.responsable || null,
        prioridad: t.prioridad || null,
        fecha_limite: t.fecha && t.fecha !== "Por definir" ? t.fecha : null,
        estado,
        miro_row_id: t.rowId || null,
        completed_at: completion ? completion.at : null,
      });
    }
  }

  // Idempotency: delete existing rows with matching miro_row_id first, then insert.
  // Alternative: use ON CONFLICT. For simplicity, truncate and re-seed since migration is one-shot.
  // Deletamos sólo las filas migradas antes (las que tienen miro_row_id). Las creadas via Pegar pendientes se preservan.
  const { error: delError } = await supabase
    .from("tasks")
    .delete()
    .not("miro_row_id", "is", null);
  if (delError) {
    return NextResponse.json(
      { error: "delete failed", detail: delError.message },
      { status: 500 }
    );
  }

  // Batch insert in chunks of 100
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
    const chunk = rowsToInsert.slice(i, i + CHUNK);
    const { error, count } = await supabase
      .from("tasks")
      .insert(chunk, { count: "exact" });
    if (error) {
      return NextResponse.json(
        {
          error: "insert failed",
          detail: error.message,
          insertedBefore: inserted,
          chunk: i,
        },
        { status: 500 }
      );
    }
    inserted += count ?? chunk.length;
  }

  return NextResponse.json({
    ok: true,
    inserted,
    skipped,
    totalParsed: rowsToInsert.length + skipped.length,
  });
}
