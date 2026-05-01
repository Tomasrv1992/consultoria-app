import { NextRequest } from "next/server";
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
