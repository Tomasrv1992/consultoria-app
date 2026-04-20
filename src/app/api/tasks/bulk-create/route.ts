import { NextRequest, NextResponse } from "next/server";
import { MIRO_BOARDS } from "@/lib/clients-config";
import { moduloToCategory } from "@/lib/miro-progress";
import type { ModuleCategory } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TASKS_PER_REQUEST = 200;
const MAX_TITULO_LEN = 500;
const MAX_FIELD_LEN = 200;

interface InputTask {
  titulo?: string;
  modulo?: string;
  responsable?: string | null;
  prioridad?: string | null;
  fecha_limite?: string | null;
  fecha?: string | null;
  estado?: string;
}

interface InsertRow {
  client_id: string;
  titulo: string;
  modulo: string;
  categoria: ModuleCategory;
  responsable: string | null;
  prioridad: string | null;
  fecha_limite: string | null;
  estado: string;
}

const VALID_ESTADOS = new Set(["En curso", "Iniciativa", "Completada"]);

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const clientId = body?.clientId as string | undefined;
  const rawTasks = body?.tasks as InputTask[] | undefined;

  if (!clientId || !MIRO_BOARDS[clientId]) {
    return NextResponse.json(
      { ok: false, error: "clientId inválido" },
      { status: 400 }
    );
  }
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Se esperaba un array no vacío en `tasks`" },
      { status: 400 }
    );
  }
  if (rawTasks.length > MAX_TASKS_PER_REQUEST) {
    return NextResponse.json(
      {
        ok: false,
        error: `Máximo ${MAX_TASKS_PER_REQUEST} tareas por request (recibidas ${rawTasks.length})`,
      },
      { status: 400 }
    );
  }

  const rows: InsertRow[] = [];
  const errors: { index: number; reason: string }[] = [];
  const clip = (s: string, max: number) =>
    s.length > max ? s.slice(0, max) : s;

  rawTasks.forEach((t, i) => {
    if (!t.titulo || !t.titulo.trim()) {
      errors.push({ index: i, reason: "titulo vacío" });
      return;
    }
    if (!t.modulo || !t.modulo.trim()) {
      errors.push({ index: i, reason: "modulo vacío" });
      return;
    }
    const tituloTrim = t.titulo.trim();
    if (tituloTrim.length > MAX_TITULO_LEN) {
      errors.push({
        index: i,
        reason: `titulo excede ${MAX_TITULO_LEN} caracteres`,
      });
      return;
    }
    const categoria = moduloToCategory(t.modulo);
    if (!categoria) {
      errors.push({ index: i, reason: `modulo desconocido: ${t.modulo}` });
      return;
    }
    const estado = (t.estado || "En curso").trim();
    if (!VALID_ESTADOS.has(estado)) {
      errors.push({ index: i, reason: `estado inválido: ${estado}` });
      return;
    }
    rows.push({
      client_id: clientId,
      titulo: tituloTrim,
      modulo: clip(t.modulo.trim(), MAX_FIELD_LEN),
      categoria,
      responsable:
        clip((t.responsable || "").toString().trim(), MAX_FIELD_LEN) || null,
      prioridad:
        clip((t.prioridad || "").toString().trim(), MAX_FIELD_LEN) || null,
      fecha_limite:
        clip(
          (t.fecha_limite || t.fecha || "").toString().trim(),
          MAX_FIELD_LEN
        ) || null,
      estado,
    });
  });

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Ninguna tarea válida", errors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.from("tasks").insert(rows).select("id");
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    inserted: data?.length ?? 0,
    ids: (data ?? []).map((r) => r.id as string),
    errors,
  });
}
