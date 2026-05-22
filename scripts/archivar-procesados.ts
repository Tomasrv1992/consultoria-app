// One-off: archiva (remueve label INBOX) todos los correos que ya tienen
// label "Procesado". Útil después de agregar la feature de archivar al pipeline,
// para limpiar la bandeja de los correos viejos que se procesaron antes de
// que la feature existiera.
//
// Uso: npx tsx --env-file=.env.local scripts/archivar-procesados.ts

import { google } from "googleapis";

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth });

  // Buscar correos con label Procesado que SIGUEN en INBOX
  const messages: any[] = [];
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "label:Procesado label:INBOX",
      maxResults: 500,
      pageToken,
    });
    if (res.data.messages) messages.push(...res.data.messages);
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  console.log(`Encontrados ${messages.length} correos con label Procesado que siguen en INBOX`);

  if (messages.length === 0) {
    console.log("Nada que archivar — bandeja ya limpia.");
    return;
  }

  // Archivar en lotes (Gmail API soporta batchModify de hasta 1000 IDs)
  const BATCH_SIZE = 500;
  let archived = 0;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids: batch.map((m) => m.id!),
        removeLabelIds: ["INBOX"],
      },
    });
    archived += batch.length;
    console.log(`  Lote ${Math.floor(i / BATCH_SIZE) + 1}: archivados ${batch.length} (acumulado: ${archived})`);
  }

  console.log(`\n✅ ${archived} correos archivados (siguen en sus labels Facturas/YYYY-MM, fuera del INBOX)`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
