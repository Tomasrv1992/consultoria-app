import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkAuth } from "@/lib/auth-embed";

export const dynamic = "force-dynamic";

export async function POST(
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

  const taskId = params.id;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "taskId requerido" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const completedBy = (body?.completedBy as string | undefined) ?? null;

  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const { data, error } = await supabase
    .from("tasks")
    .update({
      estado: "Completada",
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.warn("[tasks/complete] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, task: data });
}
