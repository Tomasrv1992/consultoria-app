import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth-embed";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
    .from("tasks")
    .select("responsable")
    .eq("client_id", clientId)
    .not("responsable", "is", null);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const set = new Set<string>();
  (data || []).forEach((r) => {
    const v = ((r as { responsable: string | null }).responsable || "").trim();
    if (v) set.add(v);
  });
  const responsables = Array.from(set).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ ok: true, responsables });
}
