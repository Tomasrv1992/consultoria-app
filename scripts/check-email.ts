// Diagnóstico de un email específico — labels, adjuntos, si fue procesado
import { google } from "googleapis";

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth });

  const search = await gmail.users.messages.list({
    userId: "me",
    q: 'subject:"facturas seguridad social"',
    maxResults: 5,
  });

  const msgs = search.data.messages || [];
  console.log(`Encontrados ${msgs.length} emails matching "facturas seguridad social"\n`);

  const labelsRes = await gmail.users.labels.list({ userId: "me" });
  const labelMap = new Map((labelsRes.data.labels || []).map((l) => [l.id!, l.name!]));

  for (const m of msgs) {
    const full = await gmail.users.messages.get({ userId: "me", id: m.id!, format: "full" });
    const headers = full.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value;
    const from = headers.find((h) => h.name === "From")?.value;
    const date = headers.find((h) => h.name === "Date")?.value;
    const labels = (full.data.labelIds || []).map((id) => labelMap.get(id) || id);

    // Inspect attachments
    const attachments: { filename: string; size: number; mime?: string }[] = [];
    const walk = (part: any): void => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({ filename: part.filename, size: part.body.size || 0, mime: part.mimeType });
      }
      if (part.parts) part.parts.forEach(walk);
    };
    if (full.data.payload) walk(full.data.payload);

    console.log("Subject:", subject);
    console.log("From:", from);
    console.log("Date:", date);
    console.log("Labels:", labels);
    console.log("Attachments:", attachments.length);
    for (const a of attachments) {
      console.log(`  - ${a.filename} (${(a.size / 1024).toFixed(1)} KB) ${a.mime}`);
    }
    console.log("---");
  }
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
