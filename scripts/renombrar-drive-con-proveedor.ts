// One-off: renombra los archivos en Drive del formato "{N}.pdf" / "{N}.1.xml"
// al formato "{Mes} {N}. {Proveedor}.pdf" / "{Mes} {N}.1. {Proveedor}.xml".
//
// Lee proveedor desde cada pestaña-mes. Idempotente — re-correr no rompe nada.
//
// Uso: npx tsx --env-file=.env.local scripts/renombrar-drive-con-proveedor.ts

import { google } from "googleapis";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function buildFileBaseName(n: number, proveedor: string, subIdx?: number): string {
  const N = subIdx != null ? `${n}.${subIdx}` : `${n}`;
  const provClean = String(proveedor || "Sin Proveedor")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 60)
    .trim();
  return `${N}. ${provClean}`;
}

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const spreadsheetId = process.env.INVOICES_SHEET_ID!;
  const driveFolderId = process.env.INVOICES_DRIVE_FOLDER_ID!;

  // Pre-fetch todos los archivos de cada subcarpeta YYYY-MM
  const subfolders = await drive.files.list({
    q: `'${driveFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 100,
  });

  // Map: subcarpeta YYYY-MM → { archivos } indexados por id
  const filesByFolder = new Map<string, Map<string, any>>();
  for (const folder of subfolders.data.files ?? []) {
    if (folder.name === "Seguridad Social") continue; // skip carpeta de planillas
    const allFiles: any[] = [];
    let pageToken: string | undefined;
    do {
      const res = await drive.files.list({
        q: `'${folder.id}' in parents and trashed=false`,
        fields: "nextPageToken, files(id, name)",
        pageSize: 100,
        pageToken,
      });
      allFiles.push(...(res.data.files ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    const byId = new Map<string, any>();
    for (const f of allFiles) byId.set(f.id, f);
    filesByFolder.set(folder.id!, byId);
  }

  let totalRenamed = 0;
  let totalSkipped = 0;

  // Para cada pestaña-mes, leer las filas y renombrar archivos
  for (let m = 1; m <= 12; m++) {
    const monthName = MESES[m - 1];
    let rows: any[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${monthName}'!A:L`,
      });
      rows = res.data.values || [];
    } catch {
      continue; // pestaña no existe
    }
    if (rows.length < 2) continue;

    let monthRenamed = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      // Cols nuevas: A=N°, B=Fecha, C=Proveedor, D=NIT, E=N°Factura, ..., J=Link PDF
      const N = parseInt(String(r[0] ?? ""), 10);
      const proveedor = String(r[2] ?? "");
      const linkPdf = String(r[9] ?? "");
      const idMatch = linkPdf.match(/\/d\/([^\/]+)/);
      if (!idMatch || isNaN(N) || !proveedor) {
        totalSkipped++;
        continue;
      }
      const pdfId = idMatch[1];

      // Buscar el PDF en alguna carpeta
      let folderIdFound: string | null = null;
      for (const [fid, files] of filesByFolder) {
        if (files.has(pdfId)) { folderIdFound = fid; break; }
      }
      if (!folderIdFound) {
        totalSkipped++;
        continue;
      }

      const folderFiles = filesByFolder.get(folderIdFound)!;
      const pdfFile = folderFiles.get(pdfId)!;
      // Buscar XMLs hermanos: aceptamos varios patrones legacy.
      const xmlSiblings = Array.from(folderFiles.values()).filter((f) => {
        const name = String(f.name ?? "");
        if (!/\.xml$/i.test(name)) return false;
        // Patrón v1 ("{N}.{idx}.xml"), v2 ("{Mes} {N}.{idx}. ...xml"), o v3 nuevo ("{N}.{idx}. ...xml")
        return (
          name.startsWith(`${N}.`) ||
          name.startsWith(`${monthName} ${N}.`)
        );
      });
      xmlSiblings.sort((a, b) => String(a.name).localeCompare(String(b.name)));

      // Rename PDF — sin mes en el filename (mes ya está en la carpeta padre)
      const newPdfName = `${buildFileBaseName(N, proveedor)}.pdf`;
      try {
        if (pdfFile.name !== newPdfName) {
          await drive.files.update({ fileId: pdfId, requestBody: { name: newPdfName } });
        }
      } catch (e: any) {
        console.warn(`  ${monthName}/${N} PDF rename failed: ${e.message}`);
      }

      // Rename XMLs
      for (let j = 0; j < xmlSiblings.length; j++) {
        const newXmlName = `${buildFileBaseName(N, proveedor, j + 1)}.xml`;
        try {
          if (xmlSiblings[j].name !== newXmlName) {
            await drive.files.update({ fileId: xmlSiblings[j].id, requestBody: { name: newXmlName } });
          }
        } catch (e: any) {
          console.warn(`  ${monthName}/${N} XML#${j + 1} rename failed: ${e.message}`);
        }
      }
      monthRenamed++;
    }
    if (monthRenamed > 0) console.log(`  ✓ ${monthName}: ${monthRenamed} sets renombrados`);
    totalRenamed += monthRenamed;
  }

  console.log(`\n✅ Total: ${totalRenamed} sets renombrados, ${totalSkipped} sin link/N° (esperado para algunos)`);
}

main().catch((e) => { console.error("ERROR:", e.message, e.stack); process.exit(1); });
