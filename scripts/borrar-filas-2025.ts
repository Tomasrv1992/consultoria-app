// One-off: borra filas del Sheet "Gastos 2026" cuya fecha empiece con "2025-"
// (las que se procesaron del backfill de 365d que incluyó facturas de 2025).
// Tomás eliminó esas carpetas de Drive y labels de Gmail, así que limpiamos el Sheet también.
//
// Uso: npx tsx --env-file=.env.local scripts/borrar-filas-2025.ts

import { google } from "googleapis";

const SHEET_TAB = "Gastos 2026";

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.INVOICES_SHEET_ID!;

  // 1. Obtener sheetId del tab
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tab = meta.data.sheets?.find((s) => s.properties?.title === SHEET_TAB);
  if (!tab?.properties?.sheetId) throw new Error(`Tab "${SHEET_TAB}" no existe`);
  const sheetId = tab.properties.sheetId;

  // 2. Leer todas las filas
  const data = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_TAB}'!A:I`,
  });
  const rows = data.data.values || [];

  // 3. Encontrar índices de filas con fecha 2025-XX-XX (ignorar fila 0 que es header)
  const toDelete: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const fecha = String(rows[i][0] || "");
    if (fecha.startsWith("2025-")) {
      toDelete.push(i);
      console.log(`  Marcada fila ${i + 1}: ${fecha} | ${rows[i][1]} | ${rows[i][3]}`);
    }
  }

  if (toDelete.length === 0) {
    console.log("No hay filas 2025 que borrar.");
    return;
  }

  console.log(`\nBorrando ${toDelete.length} filas...`);

  // 4. Bottom-up para preservar índices durante delete
  toDelete.sort((a, b) => b - a);
  const requests = toDelete.map((i) => ({
    deleteDimension: {
      range: { sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  console.log(`✅ ${toDelete.length} filas eliminadas del Sheet "${SHEET_TAB}".`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
