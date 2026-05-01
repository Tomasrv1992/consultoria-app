import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "./supabase/server";
import { getEmbedSecret } from "./supabase-env";

export type AuthResult =
  | { ok: true; via: "session" | "token" }
  | { ok: false };

export async function checkAuth(req: NextRequest): Promise<AuthResult> {
  // 1. Intentar sesión Supabase
  const ssr = createServerSupabaseClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (user) return { ok: true, via: "session" };

  // 2. Intentar embedToken (URL param)
  const urlToken = req.nextUrl.searchParams.get("embedToken");
  const expected = getEmbedSecret();
  if (urlToken && urlToken === expected) {
    return { ok: true, via: "token" };
  }

  return { ok: false };
}

/**
 * Verifica que la tarea pertenezca al clientId esperado.
 * Solo aplica cuando la auth vino vía token (porque el token es shared
 * entre clientes). Sessions no necesitan este check porque RLS gobierna.
 *
 * Returns null si OK, o un NextResponse listo para retornar (400/403/404/500).
 */
export async function assertTaskBelongsToClient(
  supabase: SupabaseClient,
  taskId: string,
  expectedClientId: string | null
): Promise<NextResponse | null> {
  if (!expectedClientId) {
    return NextResponse.json(
      { ok: false, error: "clientId requerido cuando se autoriza via token" },
      { status: 400 }
    );
  }
  const { data, error } = await supabase
    .from("tasks")
    .select("client_id")
    .eq("id", taskId)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Tarea no encontrada" },
      { status: 404 }
    );
  }
  if ((data as { client_id: string }).client_id !== expectedClientId) {
    return NextResponse.json(
      { ok: false, error: "Tarea no pertenece a este cliente" },
      { status: 403 }
    );
  }
  return null;
}
