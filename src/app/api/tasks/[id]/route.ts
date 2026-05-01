import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkAuth, assertTaskBelongsToClient } from "@/lib/auth-embed";
import { moduloToCategory } from "@/lib/miro-progress";

export const dynamic = "force-dynamic";

const VALID_ESTADOS = new Set(["En curso", "Iniciativa", "Completada"]);
const MAX_TITULO_LEN = 500;
const MAX_FIELD_LEN = 200;

interface PatchBody {
  titulo?: string;
  modulo?: string;
  responsable?: string | null;
  prioridad?: string | null;
  fecha_limite?: string | null;
  estado?: string;
}

type UpdateRow = {
  titulo?: string;
  modulo?: string;
  categoria?: string;
  responsable?: string | null;
  prioridad?: string | null;
  fecha_limite?: string | null;
  estado?: string;
  completed_at?: string | null;
  completed_by?: string | null;
};

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }
  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const taskId = params.id;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "taskId requerido" },
      { status: 400 }
    );
  }

  if (auth.via === "token") {
    const expected = request.nextUrl.searchParams.get("clientId");
    const fail = await assertTaskBelongsToClient(supabase, taskId, expected);
    if (fail) return fail;
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "body inválido" },
      { status: 400 }
    );
  }

  const patch: UpdateRow = {};

  if (typeof body.titulo === "string") {
    const t = body.titulo.trim();
    if (!t) {
      return NextResponse.json(
        { ok: false, error: "titulo no puede ser vacío" },
        { status: 400 }
      );
    }
    if (t.length > MAX_TITULO_LEN) {
      return NextResponse.json(
        { ok: false, error: `titulo excede ${MAX_TITULO_LEN} caracteres` },
        { status: 400 }
      );
    }
    patch.titulo = t;
  }

  if (typeof body.modulo === "string") {
    const m = body.modulo.trim();
    if (!m) {
      return NextResponse.json(
        { ok: false, error: "modulo no puede ser vacío" },
        { status: 400 }
      );
    }
    const cat = moduloToCategory(m);
    if (!cat) {
      return NextResponse.json(
        { ok: false, error: `modulo desconocido: ${m}` },
        { status: 400 }
      );
    }
    patch.modulo = clip(m, MAX_FIELD_LEN);
    patch.categoria = cat;
  }

  if (body.responsable !== undefined) {
    patch.responsable =
      clip((body.responsable ?? "").toString().trim(), MAX_FIELD_LEN) || null;
  }

  if (body.prioridad !== undefined) {
    patch.prioridad =
      clip((body.prioridad ?? "").toString().trim(), MAX_FIELD_LEN) || null;
  }

  if (body.fecha_limite !== undefined) {
    patch.fecha_limite =
      clip((body.fecha_limite ?? "").toString().trim(), MAX_FIELD_LEN) || null;
  }

  if (typeof body.estado === "string") {
    const e = body.estado.trim();
    if (!VALID_ESTADOS.has(e)) {
      return NextResponse.json(
        { ok: false, error: `estado inválido: ${e}` },
        { status: 400 }
      );
    }
    patch.estado = e;
    if (e !== "Completada") {
      patch.completed_at = null;
      patch.completed_by = null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "no hay campos para actualizar" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.warn("[tasks/PATCH] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, task: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }
  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const taskId = params.id;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "taskId requerido" },
      { status: 400 }
    );
  }

  if (auth.via === "token") {
    const expected = request.nextUrl.searchParams.get("clientId");
    const fail = await assertTaskBelongsToClient(supabase, taskId, expected);
    if (fail) return fail;
  }

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) {
    console.warn("[tasks/DELETE] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
