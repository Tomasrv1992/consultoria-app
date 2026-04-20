import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Devuelve el acumulado de ventas (año en curso) para un cliente.
// La fuente es la env var server-only CLIENT_ACCUMULATED_SALES_JSON,
// un JSON con forma: {"client-<slug>": <monto>, ...}.
// Si el cliente no está en el mapa o la env var no existe, retorna null.
// Requiere sesión autenticada para evitar exposición pública.
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId requerido" },
      { status: 400 }
    );
  }

  const raw = process.env.CLIENT_ACCUMULATED_SALES_JSON;
  if (!raw) {
    return NextResponse.json({ accumulated: null });
  }
  try {
    const map = JSON.parse(raw) as Record<string, number | null>;
    const value = map[clientId];
    return NextResponse.json({
      accumulated: typeof value === "number" ? value : null,
    });
  } catch {
    console.warn("[clients/accumulated-sales] env var JSON inválido");
    return NextResponse.json({ accumulated: null });
  }
}
