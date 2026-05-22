// netlify/functions/_lib/gmail-shared.ts
//
// Helpers genéricos para consumir la API Gmail v1 desde cualquier pipeline
// (facturas, fathom, etc.). Antes vivían inline en procesar-facturas-pipeline.ts;
// extraídos acá para que fathom-pipeline.ts (transcripts de reuniones) los reuse.
//
// Sin estado global: cada función recibe el cliente `gmail` ya autenticado.
// `getGmailClient()` arma el OAuth2 + cliente Gmail a partir de creds simples.

import { google } from "googleapis";

export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export function getGmailClient(cfg: GmailOAuthConfig) {
  const auth = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret);
  auth.setCredentials({ refresh_token: cfg.refreshToken });
  return google.gmail({ version: "v1", auth });
}

export async function getOrCreateLabel(gmail: any, name: string): Promise<string> {
  const list = await gmail.users.labels.list({ userId: "me" });
  const found = list.data.labels?.find((l: any) => l.name === name);
  if (found) return found.id;
  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: { name, labelListVisibility: "labelShow", messageListVisibility: "show" },
  });
  return created.data.id;
}

export async function findEmailsByQuery(gmail: any, query: string) {
  const out: any[] = [];
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 100,
      pageToken,
    });
    if (res.data.messages) out.push(...res.data.messages);
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

export async function getMessageFull(gmail: any, messageId: string) {
  const res = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  return res.data;
}

export function getHeader(msg: any, name: string): string | null {
  return msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

export async function markEmailProcessed(gmail: any, messageId: string, labelId: string) {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds: [labelId] },
  });
}

/**
 * Extrae el texto plano de un mensaje Gmail. Recorre el árbol de partes y
 * prefiere `text/plain`; si no hay, usa `text/html` y le quita los tags.
 * Retorna "" si no encuentra body.
 */
export function getMessageBodyText(msg: any): string {
  const parts: Array<{ mimeType: string; data: string }> = [];

  function walk(part: any) {
    if (!part) return;
    if (part.body?.data && part.mimeType) {
      parts.push({ mimeType: part.mimeType, data: part.body.data });
    }
    if (part.parts) part.parts.forEach(walk);
  }
  walk(msg.payload);

  const decode = (b64: string) => Buffer.from(b64, "base64url").toString("utf8");

  const plain = parts.find((p) => p.mimeType === "text/plain");
  if (plain) return decode(plain.data);

  const html = parts.find((p) => p.mimeType === "text/html");
  if (html) {
    return decode(html.data)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}
