import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  const body = await request.json().catch(() => null);
  const completedBy = (body?.completedBy as string | undefined) ?? null;

  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "taskId requerido" },
      { status: 400 }
    );
  }

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseServerConfig();
  const supabase = createClient(supabaseUrl, supabaseKey);

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
