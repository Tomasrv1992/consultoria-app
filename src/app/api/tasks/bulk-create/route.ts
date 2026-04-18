import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MIRO_BOARDS } from "@/lib/clients-config";
import { moduloToCategory } from "@/lib/miro-progress";
import type { ModuleCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  const rows: InsertRow[] = [];
  const errors: { index: number; reason: string }[] = [];
  rawTasks.forEach((t, i) => {
    if (!t.titulo || !t.titulo.trim()) {
      errors.push({ index: i, reason: "titulo vacío" });
      return;
    }
    if (!t.modulo || !t.modulo.trim()) {
      errors.push({ index: i, reason: "modulo vacío" });
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
      titulo: t.titulo.trim(),
      modulo: t.modulo.trim(),
      categoria,
      responsable: (t.responsable || "").toString().trim() || null,
      prioridad: (t.prioridad || "").toString().trim() || null,
      fecha_limite:
        (t.fecha_limite || t.fecha || "").toString().trim() || null,
      estado,
    });
  });

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Ninguna tarea válida", errors },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase no configurado" },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

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
    errors,
  });
}
