import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "../supabase-env";

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase con service_role.
 * Bypassa RLS — usar SOLO en server endpoints después de validar auth.
 * NUNCA exponer en código que corra en el cliente.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const { url } = getSupabaseServerConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no configurado. Agregalo en .env.local y Netlify env vars."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
