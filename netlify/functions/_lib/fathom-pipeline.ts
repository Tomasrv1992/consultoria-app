// netlify/functions/_lib/fathom-pipeline.ts
//
// Lee transcripts de reuniones Fathom desde Gmail y marca emails procesados.
// Usado por src/app/api/fathom/* para que Claude Code no tenga que copiar/pegar
// el transcript: lo lee directo del inbox vía OAuth.
//
// Convención: Tomás configura un filtro Gmail que aplica el label
// "Fathom/sin-procesar" a todo email de notifications@fathom.video.
// Cuando este pipeline procesa un email, mueve el label a "Fathom/procesado-YYYY-MM".

import {
  findEmailsByQuery,
  getMessageFull,
  getHeader,
  getMessageBodyText,
  getOrCreateLabel,
} from "./gmail-shared";
import { getClientFromSubject } from "../../../src/lib/fathom-client-mapping";

export const FATHOM_UNPROCESSED_LABEL = "Fathom/sin-procesar";

export interface FathomEmail {
  gmail_message_id: string;
  subject: string;
  date: string;
  body: string;
  internal_date_ms: number;
}

/**
 * Devuelve todos los emails Fathom etiquetados como "sin-procesar" cuyo subject
 * matchea el clientId. Ordenados por fecha desc (más reciente primero).
 */
export async function fetchUnprocessedFathomEmails(
  gmail: any,
  clientId: string,
): Promise<FathomEmail[]> {
  const candidates = await findEmailsByQuery(gmail, `label:${FATHOM_UNPROCESSED_LABEL}`);
  const out: FathomEmail[] = [];
  for (const m of candidates) {
    const full = await getMessageFull(gmail, m.id);
    const subject = getHeader(full, "Subject") || "";
    if (getClientFromSubject(subject) !== clientId) continue;
    out.push({
      gmail_message_id: m.id,
      subject,
      date: getHeader(full, "Date") || "",
      body: getMessageBodyText(full),
      internal_date_ms: Number(full.internalDate || 0),
    });
  }
  out.sort((a, b) => b.internal_date_ms - a.internal_date_ms);
  return out;
}

/**
 * Quita el label "Fathom/sin-procesar" del mensaje y le aplica
 * "Fathom/procesado-YYYY-MM" (lo crea si no existe).
 */
export async function markFathomEmailProcessed(
  gmail: any,
  messageId: string,
  year: number,
  month: number,
): Promise<void> {
  const unprocessedId = await getOrCreateLabel(gmail, FATHOM_UNPROCESSED_LABEL);
  const processedLabelName = `Fathom/procesado-${year}-${String(month).padStart(2, "0")}`;
  const processedId = await getOrCreateLabel(gmail, processedLabelName);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: [processedId],
      removeLabelIds: [unprocessedId],
    },
  });
}
