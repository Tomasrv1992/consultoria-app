import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth-embed";

export const dynamic = "force-dynamic";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta env var ${name}`);
  return v;
}

interface PatchBody {
  gmail_message_id?: string;
  year?: number;
  month?: number;
}

export async function PATCH(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || !body.gmail_message_id) {
    return NextResponse.json(
      { ok: false, error: "gmail_message_id requerido" },
      { status: 400 }
    );
  }

  const now = new Date();
  const year = body.year ?? now.getFullYear();
  const month = body.month ?? now.getMonth() + 1;

  try {
    const [{ getGmailClient }, { markFathomEmailProcessed }] = await Promise.all([
      import("../../../../../netlify/functions/_lib/gmail-shared"),
      import("../../../../../netlify/functions/_lib/fathom-pipeline"),
    ]);

    const gmail = getGmailClient({
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refreshToken: requireEnv("GOOGLE_OAUTH_REFRESH_TOKEN"),
    });

    await markFathomEmailProcessed(gmail, body.gmail_message_id, year, month);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.warn("[fathom/mark-processed] error:", e);
    const msg = e instanceof Error ? e.message : "error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
