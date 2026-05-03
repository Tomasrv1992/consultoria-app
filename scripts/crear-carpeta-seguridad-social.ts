// One-off: crea la subcarpeta "Seguridad Social" dentro del folder principal
// de facturas, para que aparezca en Drive aunque todavía no haya procesado
// planillas. Idempotente — si ya existe, no la duplica.
//
// Uso: npx tsx --env-file=.env.local scripts/crear-carpeta-seguridad-social.ts

import { google } from "googleapis";

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const drive = google.drive({ version: "v3", auth });

  const parent = process.env.INVOICES_DRIVE_FOLDER_ID!;
  const name = "Seguridad Social";

  const list = await drive.files.list({
    q: `name='${name}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name, webViewLink)",
  });

  if (list.data.files?.length) {
    const f = list.data.files[0];
    console.log(`✓ Ya existía: ${f.name} (${f.id})`);
    console.log(`  Link: https://drive.google.com/drive/folders/${f.id}`);
    return;
  }

  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parent] },
    fields: "id, name",
  });
  console.log(`✓ Creada: ${created.data.name} (${created.data.id})`);
  console.log(`  Link: https://drive.google.com/drive/folders/${created.data.id}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
