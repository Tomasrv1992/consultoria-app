// One-off destructivo: migra "Gastos 2026" (1 pestaña, 125 filas) a 12 pestañas
// (Enero...Diciembre) con columna N° consecutivo POR MES + renombra archivos
// en Drive a {N}.pdf / {N}.1.xml / {N}.2.xml según orden de fila del mes.
//
// Pasos en orden:
//   1. Backup: duplica "Gastos 2026" → "Backup Gastos 2026 (YYYY-MM-DD)"
//   2. Crea 12 pestañas Enero-Diciembre con headers (12 columnas)
//   3. Lee filas, agrupa por mes (de col Fecha), ordena por fecha asc
//   4. Escribe filas en pestaña del mes con N° consecutivo (1..N reinicia por mes)
//   5. Renombra archivos en Drive en cada subcarpeta YYYY-MM:
//      - PDF (con link en el Sheet) → {N}.pdf
//      - XMLs hermanos en la misma carpeta → {N}.1.xml, {N}.2.xml...
//   6. Reporta lo migrado. NO borra "Gastos 2026" original (se hace manual tras validar).
//
// Re-corre seguro: si tabs ya existen y tienen datos, sobrescribe (idempotente).
// Si Drive ya está renombrado (1.pdf etc), update no falla pero re-renombra igual al N actual.
//
// Uso: npx tsx --env-file=.env.local scripts/migrar-pestañas-mes.ts

import { google } from "googleapis";

const SOURCE_TAB = "Gastos 2026";
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const HEADERS = [
  "N°", "Fecha", "Proveedor", "NIT", "N° Factura", "Subtotal",
  "IVA", "Total", "Concepto", "Link PDF", "Categoría", "Cuenta PYG",
];

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const spreadsheetId = process.env.INVOICES_SHEET_ID!;
  const driveFolderId = process.env.INVOICES_DRIVE_FOLDER_ID!;

  // ===== 1. Backup =====
  console.log("=== 1. Backup ===");
  let meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sourceTab = meta.data.sheets?.find((s) => s.properties?.title === SOURCE_TAB);
  if (!sourceTab) {
    console.warn(`Tab "${SOURCE_TAB}" no existe — saltando backup`);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const backupName = `Backup Gastos 2026 (${today})`;
    const backupExists = meta.data.sheets?.some((s) => s.properties?.title === backupName);
    if (!backupExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            duplicateSheet: {
              sourceSheetId: sourceTab.properties!.sheetId!,
              newSheetName: backupName,
            },
          }],
        },
      });
      console.log(`✓ Backup creado: "${backupName}"`);
    } else {
      console.log(`- Backup ya existía: "${backupName}"`);
    }
  }

  // ===== 2. Leer datos fuente =====
  console.log("\n=== 2. Leer datos de Gastos 2026 ===");
  const data = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SOURCE_TAB}'!A:K`,
  });
  const rows = data.data.values ?? [];
  if (rows.length < 2) {
    console.log("Sheet vacío o solo headers — nada que migrar.");
    return;
  }
  console.log(`Filas leídas: ${rows.length - 1}`);

  // ===== 3. Agrupar por mes =====
  const byMonth = new Map<number, any[][]>();
  let invalidDates = 0;
  for (let i = 1; i < rows.length; i++) {
    const fechaStr = String(rows[i][0] ?? "");
    const date = new Date(fechaStr);
    if (isNaN(date.getTime())) {
      invalidDates++;
      continue;
    }
    const month = date.getMonth() + 1;
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(rows[i]);
  }
  console.log("\n=== 3. Agrupación por mes ===");
  for (let m = 1; m <= 12; m++) {
    const count = byMonth.get(m)?.length ?? 0;
    if (count > 0) console.log(`  ${MESES[m - 1]}: ${count} facturas`);
  }
  if (invalidDates) console.log(`  ⚠ ${invalidDates} filas con fecha inválida (skip)`);

  // ===== 4. Crear 12 pestañas si no existen =====
  console.log("\n=== 4. Crear pestañas Enero-Diciembre ===");
  meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set(meta.data.sheets?.map((s) => s.properties?.title) ?? []);
  const addRequests: any[] = [];
  for (const monthName of MESES) {
    if (!existingTitles.has(monthName)) {
      addRequests.push({
        addSheet: {
          properties: { title: monthName, gridProperties: { frozenRowCount: 1, columnCount: 12 } },
        },
      });
    }
  }
  if (addRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: addRequests } });
    console.log(`✓ Creadas ${addRequests.length} pestañas nuevas`);
  } else {
    console.log("- Las 12 pestañas ya existían");
  }

  // Refresh meta para tener IDs nuevos
  meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabsByName = new Map<string, number>();
  for (const s of meta.data.sheets ?? []) {
    if (s.properties?.title && s.properties.sheetId != null) {
      tabsByName.set(s.properties.title, s.properties.sheetId);
    }
  }

  // ===== 5. Migrar filas + numerar =====
  console.log("\n=== 5. Migrar filas a pestañas con N° consecutivo ===");
  // Mantener mapa { monthName → [{N, pdfId}] } para usar después en rename Drive
  const renameLookup = new Map<string, { N: number; pdfId: string | null; row: any[] }[]>();

  for (let m = 1; m <= 12; m++) {
    const monthName = MESES[m - 1];
    const monthRows = (byMonth.get(m) ?? []).slice();
    monthRows.sort((a, b) => String(a[0] ?? "").localeCompare(String(b[0] ?? "")));

    const matrix: any[][] = [HEADERS];
    const lookup: { N: number; pdfId: string | null; row: any[] }[] = [];

    for (let i = 0; i < monthRows.length; i++) {
      const r = monthRows[i];
      const N = i + 1;
      // Original cols: A=Fecha, B=Proveedor, C=NIT, D=N°Factura, E=Subtotal, F=IVA,
      //                G=Total, H=Concepto, I=Link PDF, J=Categoría, K=Cuenta PYG
      // New cols:      A=N°, B=Fecha, C=Proveedor, D=NIT, E=N°Factura, F=Subtotal,
      //                G=IVA, H=Total, I=Concepto, J=Link PDF, K=Categoría, L=Cuenta PYG
      matrix.push([
        N, r[0] ?? "", r[1] ?? "", r[2] ?? "", r[3] ?? "", r[4] ?? "",
        r[5] ?? "", r[6] ?? "", r[7] ?? "", r[8] ?? "", r[9] ?? "", r[10] ?? "",
      ]);

      // Extraer pdf ID del link
      const linkPdf = String(r[8] ?? "");
      const m2 = linkPdf.match(/\/d\/([^\/]+)/);
      lookup.push({ N, pdfId: m2 ? m2[1] : null, row: r });
    }

    // Limpia el rango y escribe el matrix
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${monthName}'!A:L`,
    });
    if (matrix.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${monthName}'!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: matrix },
      });
    }

    // Format header row
    const tabId = tabsByName.get(monthName);
    if (tabId != null) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: { sheetId: tabId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 12 },
              cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.95 } } },
              fields: "userEnteredFormat(textFormat,backgroundColor)",
            },
          }],
        },
      });
    }

    renameLookup.set(monthName, lookup);
    console.log(`  ✓ ${monthName}: ${monthRows.length} filas`);
  }

  // ===== 6. Renombrar archivos en Drive =====
  console.log("\n=== 6. Renombrar archivos en Drive ===");

  // Pre-fetch todos los archivos de cada subcarpeta YYYY-MM (más eficiente)
  const subfolders = await drive.files.list({
    q: `'${driveFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 100,
  });

  // Map filename "stem" antes del "__" → archivos del mismo grupo
  const filesByFolderById = new Map<string, Map<string, any>>(); // folderId → { fileId → fileObj }
  for (const folder of subfolders.data.files ?? []) {
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
    filesByFolderById.set(folder.id!, byId);
  }

  // Para cada fila migrada con pdfId, encontrar carpeta padre y renombrar PDF + XMLs hermanos
  let totalRenamed = 0;
  let totalSkipped = 0;
  for (const [monthName, lookups] of renameLookup) {
    if (lookups.length === 0) continue;
    for (const { N, pdfId } of lookups) {
      if (!pdfId) {
        totalSkipped++;
        continue;
      }
      // Buscar pdfId en alguna carpeta
      let folderIdFound: string | null = null;
      let pdfFile: any = null;
      for (const [fid, files] of filesByFolderById) {
        if (files.has(pdfId)) {
          folderIdFound = fid;
          pdfFile = files.get(pdfId);
          break;
        }
      }
      if (!folderIdFound || !pdfFile) {
        // PDF orphan o ya borrado
        totalSkipped++;
        continue;
      }

      // Encontrar baseName del PDF (sin .pdf)
      const pdfBaseName = String(pdfFile.name ?? "").replace(/\.pdf$/i, "");
      // Hermanos XML del mismo grupo: nombre que empieza igual (baseName + "__")
      const folderFiles = filesByFolderById.get(folderIdFound)!;
      const xmlSiblings = Array.from(folderFiles.values()).filter(
        (f) => /\.xml$/i.test(f.name ?? "") && String(f.name ?? "").startsWith(pdfBaseName + "__")
      );

      // Rename PDF → {N}.pdf
      try {
        await drive.files.update({ fileId: pdfId, requestBody: { name: `${N}.pdf` } });
      } catch (e: any) {
        console.warn(`  ${monthName}/${N}: rename PDF falló: ${e.message}`);
        totalSkipped++;
        continue;
      }

      // Rename XMLs → {N}.1.xml, {N}.2.xml, ...
      for (let j = 0; j < xmlSiblings.length; j++) {
        try {
          await drive.files.update({
            fileId: xmlSiblings[j].id,
            requestBody: { name: `${N}.${j + 1}.xml` },
          });
        } catch (e: any) {
          console.warn(`  ${monthName}/${N}: rename XML#${j + 1} falló: ${e.message}`);
        }
      }
      totalRenamed++;
    }
    console.log(`  ✓ ${monthName}: archivos renombrados`);
  }

  console.log(`\n=== Renombrado en Drive ===`);
  console.log(`  ${totalRenamed} sets renombrados (PDF + XMLs)`);
  console.log(`  ${totalSkipped} sin pdfId o sin archivo encontrado en Drive (esperado para algunas filas)`);

  console.log(`\n✅ Migración completa.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Verifica visualmente en Google Sheets:`);
  console.log(`     - Pestañas Enero..Diciembre con datos del mes correcto`);
  console.log(`     - Columna A = N° consecutivo (1..N por mes)`);
  console.log(`     - Pestaña Backup tiene los datos originales`);
  console.log(`  2. Verifica en Drive: subcarpetas YYYY-MM tienen archivos 1.pdf, 1.1.xml, 2.pdf, etc.`);
  console.log(`  3. Si todo OK, BORRA manualmente la pestaña "${SOURCE_TAB}" original.`);
  console.log(`  4. Después: pipeline + dashboard se modifican para la nueva estructura.`);
}

main().catch((e) => {
  console.error("ERROR:", e.message, e.stack);
  process.exit(1);
});
