import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkAuth } from "@/lib/auth-embed";

export const dynamic = "force-dynamic";

interface PostBody {
  clientId?: string;
  fecha_reunion?: string;
  duracion_min?: number | null;
  asistentes?: string[];
  transcript_raw?: string;
  minuta_md?: string;
  tareas_creadas_ids?: string[];
  tareas_completadas_ids?: string[];
  tareas_actualizadas_ids?: string[];
  created_by?: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as PostBody | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "body inválido" },
      { status: 400 }
    );
  }

  const required: Array<keyof PostBody> = [
    "clientId",
    "fecha_reunion",
    "transcript_raw",
    "minuta_md",
  ];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json(
        { ok: false, error: `Campo requerido: ${key}` },
        { status: 400 }
      );
    }
  }

  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      client_id: body.clientId,
      fecha_reunion: body.fecha_reunion,
      duracion_min: body.duracion_min ?? null,
      asistentes: body.asistentes ?? [],
      transcript_raw: body.transcript_raw,
      minuta_md: body.minuta_md,
      tareas_creadas_ids: body.tareas_creadas_ids ?? [],
      tareas_completadas_ids: body.tareas_completadas_ids ?? [],
      tareas_actualizadas_ids: body.tareas_actualizadas_ids ?? [],
      pending_miro_sync: true,
      created_by: body.created_by ?? null,
    })
    .select()
    .single();

  if (error) {
    console.warn("[meetings/POST] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, meeting: data });
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "clientId requerido" },
      { status: 400 }
    );
  }

  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("client_id", clientId)
    .order("fecha_reunion", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, meetings: data ?? [] });
}
