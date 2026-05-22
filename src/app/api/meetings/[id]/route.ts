import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkAuth } from "@/lib/auth-embed";

export const dynamic = "force-dynamic";

interface PatchBody {
  miro_doc_id?: string | null;
  miro_synced_at?: string | null;
  pending_miro_sync?: boolean;
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

  const meetingId = params.id;
  if (!meetingId) {
    return NextResponse.json(
      { ok: false, error: "meetingId requerido" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "body inválido" },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.miro_doc_id !== undefined) patch.miro_doc_id = body.miro_doc_id;
  if (body.miro_synced_at !== undefined) patch.miro_synced_at = body.miro_synced_at;
  if (body.pending_miro_sync !== undefined) patch.pending_miro_sync = body.pending_miro_sync;

  if (Object.keys(patch).length === 1) {
    return NextResponse.json(
      { ok: false, error: "no hay campos para actualizar" },
      { status: 400 }
    );
  }

  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const { data, error } = await supabase
    .from("meetings")
    .update(patch)
    .eq("id", meetingId)
    .select()
    .single();

  if (error) {
    console.warn("[meetings/PATCH] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, meeting: data });
}
