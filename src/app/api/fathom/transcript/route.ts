import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth-embed";

export const dynamic = "force-dynamic";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta env var ${name}`);
  return v;
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

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Math.max(1, Math.min(5, Number(limitRaw) || 1));

  try {
    const [{ getGmailClient }, { fetchUnprocessedFathomEmails }] = await Promise.all([
      import("../../../../../netlify/functions/_lib/gmail-shared"),
      import("../../../../../netlify/functions/_lib/fathom-pipeline"),
    ]);

    const gmail = getGmailClient({
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refreshToken: requireEnv("GOOGLE_OAUTH_REFRESH_TOKEN"),
    });

    const all = await fetchUnprocessedFathomEmails(gmail, clientId);
    return NextResponse.json({ ok: true, transcripts: all.slice(0, limit) });
  } catch (e) {
    console.warn("[fathom/transcript] error:", e);
    const msg = e instanceof Error ? e.message : "error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
