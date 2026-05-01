// One-off: aplicar label "Facturas/YYYY-MM" a correos viejos que tienen
// label "Procesado" pero NO tienen el label de mes (porque fueron procesados
// antes de que la feature existiera).
//
// Usa el header Date del email como aproximación de fecha de emisión
// (suele coincidir con el mes; si hay alguna en cross-month, mover a mano).
//
// Uso: npx tsx --env-file=.env.local scripts/retro-labels-mes.ts

import { google } from "googleapis";

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth });

  const labelsRes = await gmail.users.labels.list({ userId: "me" });
  const allLabels = labelsRes.data.labels || [];

  // Set de labels Facturas/* que ya existen
  const existingMonthLabels = new Map<string, string>();
  for (const l of allLabels) {
    if (l.name?.startsWith("Facturas/")) existingMonthLabels.set(l.name, l.id!);
  }

  // get-or-create helper
  async function getOrCreate(name: string): Promise<string> {
    if (existingMonthLabels.has(name)) return existingMonthLabels.get(name)!;
    const created = await gmail.users.labels.create({
      userId: "me",
      requestBody: { name, labelListVisibility: "labelShow", messageListVisibility: "show" },
    });
    existingMonthLabels.set(name, created.data.id!);
    return created.data.id!;
  }

  // Buscar todos los emails con label Procesado
  const messages: any[] = [];
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "label:Procesado",
      maxResults: 500,
      pageToken,
    });
    if (res.data.messages) messages.push(...res.data.messages);
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  console.log(`Encontrados ${messages.length} mensajes con label Procesado`);

  let applied = 0;
  let alreadyHadLabel = 0;
  let noDateHeader = 0;

  for (const m of messages) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: m.id!,
      format: "metadata",
      metadataHeaders: ["Date"],
    });

    // Skip si ya tiene algún label Facturas/*
    const labels = full.data.labelIds || [];
    const hasMonthLabel = labels.some((id) =>
      [...existingMonthLabels.values()].includes(id)
    );
    if (hasMonthLabel) {
      alreadyHadLabel++;
      continue;
    }

    const dateHeader = full.data.payload?.headers?.find((h) => h.name === "Date")?.value;
    if (!dateHeader) {
      noDateHeader++;
      continue;
    }

    const d = new Date(dateHeader);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthLabelName = `Facturas/${year}-${String(month).padStart(2, "0")}`;
    const monthLabelId = await getOrCreate(monthLabelName);

    await gmail.users.messages.modify({
      userId: "me",
      id: m.id!,
      requestBody: { addLabelIds: [monthLabelId] },
    });
    applied++;
  }

  console.log(`\n✅ Resultado:`);
  console.log(`  Labels aplicados: ${applied}`);
  console.log(`  Ya tenían label de mes: ${alreadyHadLabel}`);
  console.log(`  Sin header Date: ${noDateHeader}`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
