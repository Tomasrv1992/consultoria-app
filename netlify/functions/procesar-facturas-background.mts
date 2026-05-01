// netlify/functions/procesar-facturas-background.mts
//
// Background function (suffix `-background` → 15min timeout en cualquier plan).
// Disparada por: el cron stub (procesar-facturas-cron.mts), o un POST manual
// (smoke test, futuros multi-tenant).
//
// Sin notificaciones (opción A del spec §4.4): el resultado queda en
// Netlify Function logs y en el Sheet. Si Tomás necesita notificaciones
// más adelante, el spec tiene los borradores para Resend/Telegram/Slack.

import type { Config } from "@netlify/functions";
import { run, type PipelineConfig } from "./_lib/procesar-facturas-pipeline";

interface RequestBody {
  /** Forward-compat para SaaS multi-tenant (Proyecto B). */
  customerId?: string;
  /** Override window de búsqueda (ej: "365d" para backfill manual). */
  window?: string;
  /** Solo listar, no procesar. */
  dryRun?: boolean;
}

export default async (req: Request) => {
  // 1. Auth interna: solo el cron stub o un curl con el secret correcto puede invocar
  const secret = process.env.PROCESAR_FACTURAS_INTERNAL_SECRET;
  const provided = req.headers.get("x-internal-secret");
  if (!secret || provided !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  // 2. Parse body
  let body: RequestBody = {};
  try {
    if (req.headers.get("content-length") !== "0") {
      body = await req.json();
    }
  } catch {
    /* body opcional, default {} */
  }

  // 3. Resolver config según customerId
  const cfg = await buildConfig(body);

  // 4. Ejecutar pipeline
  const startedAt = Date.now();
  let result;
  try {
    result = await run(cfg);
  } catch (err: any) {
    // Log estructurado para que sea fácil grepear en Netlify logs
    console.error(JSON.stringify({
      level: "fatal",
      customerId: body.customerId ?? "owner",
      error: err.message,
      stack: err.stack,
      hint: err.message?.includes("invalid_grant")
        ? "Refresh token expiró: corré scripts/setup-oauth.mjs local y actualizá GOOGLE_OAUTH_REFRESH_TOKEN en Netlify env vars"
        : undefined,
    }));
    return new Response("internal error", { status: 500 });
  }

  const durationMs = Date.now() - startedAt;
  console.log(JSON.stringify({
    level: "result",
    customerId: body.customerId ?? "owner",
    durationMs,
    procesadas: result.procesadas.length,
    errores: result.errores.length,
    saltadas: result.saltadas.length,
    sample: result.procesadas.slice(0, 3),
  }));

  // Background fn: respuesta vacía/202 al caller
  return new Response(JSON.stringify({ ok: true, durationMs }), {
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = {
  // Sin `schedule` → no es scheduled. El sufijo `-background` la marca como bg.
};

// ===== Config builder =====

async function buildConfig(body: RequestBody): Promise<PipelineConfig> {
  // Single-tenant (hoy): credenciales del owner desde env vars del site.
  if (!body.customerId) {
    return {
      google: {
        clientId: requireEnv("GOOGLE_CLIENT_ID"),
        clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
        refreshToken: requireEnv("GOOGLE_OAUTH_REFRESH_TOKEN"),
        driveFolderId: requireEnv("INVOICES_DRIVE_FOLDER_ID"),
        sheetId: requireEnv("INVOICES_SHEET_ID"),
        sheetTab: process.env.INVOICES_SHEET_TAB || "Gastos 2026",
      },
      options: {
        dryRun: body.dryRun ?? false,
        window: body.window ?? "30d",
      },
    };
  }

  // TODO Proyecto B: leer credenciales del customer desde Supabase
  // por `body.customerId`. Por ahora throw — la rama no se ejecuta en single-tenant.
  throw new Error("Multi-tenant aún no implementado (Proyecto B). Sacá customerId del body.");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta env var: ${name}`);
  return v;
}
