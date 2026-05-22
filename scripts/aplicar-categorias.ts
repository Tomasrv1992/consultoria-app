// One-off: aplica categorías y cuenta PYG retroactivas a todas las filas
// existentes del Sheet "Gastos 2026". Lee las reglas del JSON compartido
// con el pipeline para garantizar consistencia.
//
// Pasos:
//   1. Agrega headers J ("Categoría") + K ("Cuenta PYG") al Sheet
//   2. Para cada fila existente, asigna categoría según reglas (NIT → keyword → default)
//   3. Escribe las 2 columnas de un solo batch update
//
// Uso: npx tsx --env-file=.env.local scripts/aplicar-categorias.ts

import { google } from "googleapis";
import reglas from "../netlify/functions/_lib/categorizacion-reglas.json" with { type: "json" };

const SHEET_TAB = "Gastos 2026";

interface ReglaCategoria { proveedor?: string; categoria: string; cuenta_pyg: string }
interface ReglaKeyword { patron: string; categoria: string; cuenta_pyg: string }

function categorizar(nit: string, concepto: string): { categoria: string; cuentaPyg: string } {
  const nitNorm = String(nit || "").replace(/\D+/g, "");
  const r = reglas as any;
  const reglasPorNit = r.reglas_por_nit as Record<string, ReglaCategoria>;
  if (reglasPorNit[nitNorm]) {
    return { categoria: reglasPorNit[nitNorm].categoria, cuentaPyg: reglasPorNit[nitNorm].cuenta_pyg };
  }
  const keywords = r.reglas_por_keyword_concepto as ReglaKeyword[];
  for (const k of keywords) {
    try {
      if (new RegExp(k.patron).test(concepto || "")) {
        return { categoria: k.categoria, cuentaPyg: k.cuenta_pyg };
      }
    } catch { /* ignorar regla con regex inválida */ }
  }
  return { categoria: r.default.categoria, cuentaPyg: r.default.cuenta_pyg };
}

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.INVOICES_SHEET_ID!;

  // 1. Get sheetId of tab
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tab = meta.data.sheets?.find((s) => s.properties?.title === SHEET_TAB);
  if (!tab?.properties?.sheetId) throw new Error(`Tab "${SHEET_TAB}" no existe`);
  const sheetId = tab.properties.sheetId;

  // 2. Leer todas las filas (A:I) para usar concepto + NIT
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_TAB}'!A:I`,
  });
  const rows = dataRes.data.values || [];
  if (rows.length < 2) {
    console.log("Sheet vacío — nada que categorizar.");
    return;
  }

  console.log(`Filas a categorizar: ${rows.length - 1}`);

  // 3. Construir matriz J:K (headers + categorías)
  const newCells: any[][] = [["Categoría", "Cuenta PYG"]]; // header row J1:K1
  const categorias = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const nit = String(rows[i][2] || "");
    const concepto = String(rows[i][7] || "");
    const { categoria, cuentaPyg } = categorizar(nit, concepto);
    newCells.push([categoria, cuentaPyg]);
    categorias.set(categoria, (categorias.get(categoria) || 0) + 1);
  }

  // 4. Batch update J1:K{n}
  const lastRow = rows.length;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SHEET_TAB}'!J1:K${lastRow}`,
    valueInputOption: "RAW",
    requestBody: { values: newCells },
  });

  // 5. Formato bold + fondo en headers J1:K1
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 9, endColumnIndex: 11 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.95 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        },
        // Anchos columnas J (categoría) + K (cuenta PYG)
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "COLUMNS", startIndex: 9, endIndex: 10 },
            properties: { pixelSize: 220 },
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "COLUMNS", startIndex: 10, endIndex: 11 },
            properties: { pixelSize: 240 },
            fields: "pixelSize",
          },
        },
      ],
    },
  });

  console.log("\n✅ Categorización aplicada.");
  console.log("\nDistribución:");
  const sorted = Array.from(categorias.entries()).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    console.log(`  ${count.toString().padStart(3)}x  ${cat}`);
  }
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
