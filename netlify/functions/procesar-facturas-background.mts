// netlify/functions/procesar-facturas-background.mts
// DRAFT 2026-04-29 — pendiente revisión spec
//
// Background function (suffix `-background` → 15min timeout en cualquier plan).
// Disparada por: el cron stub (procesar-facturas-cron.mts), o un POST manual
// (smoke test, futuros multi-tenant).

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
    console.error("FATAL:", err.message, err.stack);
    // Notificación de error fatal (§4.4 spec)
    await notifyError(err, body.customerId);
    return new Response("internal error", { status: 500 });
  }

  const durationMs = Date.now() - startedAt;
  console.log(JSON.stringify({
    customerId: body.customerId ?? "owner",
    durationMs,
    procesadas: result.procesadas.length,
    errores: result.errores.length,
    saltadas: result.saltadas.length,
    sample: result.procesadas.slice(0, 3),
  }));

  // 5. Notificar resultado (si hay novedad)
  await notifyResult(result, body.customerId);

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
        sheetTab: process.env.INVOICES_SHEET_TAB || "Gastos",
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

// ===== Notificaciones =====
//
// 🟡 TODO PENDIENTE — depende de la respuesta de Tomás (spec §4.4):
//   A) Nada: dejar las dos fns vacías (return).
//   B) Email Resend (RECO): completar con SDK de Resend.
//   C) Telegram bot: reemplazar con bot.sendMessage().
//   D) Slack webhook: POST al webhook URL.
//
// Borradores listos para A y B abajo. C y D los armamos si los elegís.

async function notifyResult(result: any, customerId?: string): Promise<void> {
  const total = result.procesadas.length + result.errores.length;
  if (total === 0) return; // cero spam: sin novedad, no notificamos

  // ── Opción A — nada
  // (return acá si elegís A)

  // ── Opción B — Resend
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO || "tomasramirezvilla@gmail.com";
  if (!apiKey) {
    console.warn("RESEND_API_KEY ausente; no se envía notificación");
    return;
  }

  const subject = result.errores.length
    ? `⚠️ Procesar-Facturas: ${result.errores.length} errores`
    : `✅ Procesar-Facturas: ${result.procesadas.length} nuevas`;

  const html = renderHtmlSummary(result, customerId);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.NOTIFY_EMAIL_FROM || "Procesar-Facturas <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
  }
}

async function notifyError(err: Error, customerId?: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO || "tomasramirezvilla@gmail.com";
  if (!apiKey) return;

  const subject = `🔴 Procesar-Facturas: fatal`;
  const html = `
    <h2>Pipeline cayó</h2>
    <p><b>Cliente:</b> ${customerId || "owner"}</p>
    <p><b>Error:</b> <code>${escapeHtml(err.message)}</code></p>
    <p>Revisá Netlify Function logs para el stack trace completo.</p>
    <p>Si dice <code>invalid_grant</code> → corré <code>node scripts/setup-oauth.mjs</code> local para regenerar el refresh token.</p>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.NOTIFY_EMAIL_FROM || "Procesar-Facturas <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
}

function renderHtmlSummary(result: any, customerId?: string): string {
  const procRows = result.procesadas
    .map(
      (p: any) =>
        `<tr><td>${escapeHtml(p.fecha)}</td><td>${escapeHtml(p.proveedor)}</td><td>${escapeHtml(p.numero)}</td><td style="text-align:right">$${Number(p.total).toLocaleString("es-CO")}</td><td><a href="${escapeHtml(p.driveLink)}">PDF</a></td></tr>`
    )
    .join("");
  const errRows = result.errores
    .map((e: any) => `<tr><td>${escapeHtml(e.asunto || "(sin asunto)")}</td><td><code>${escapeHtml(e.error)}</code></td></tr>`)
    .join("");

  return `
    <h2>Resumen ${customerId ? `(${customerId})` : ""}</h2>
    <p>${result.procesadas.length} procesadas · ${result.saltadas.length} saltadas · ${result.errores.length} errores</p>
    ${procRows ? `<h3>Procesadas</h3><table border="1" cellpadding="6">${procRows}</table>` : ""}
    ${errRows ? `<h3>Errores</h3><table border="1" cellpadding="6">${errRows}</table>` : ""}
  `;
}

function escapeHtml(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
