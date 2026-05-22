// One-off (idempotente): aplica formato visual a las 12 pestañas mensuales:
//   - Header bold + fondo gris claro + frozen
//   - Anchos de columnas optimizados
//   - Centrar texto en N°, NIT, N° Factura, Categoría, Cuenta PYG
//   - Formato moneda (es-CO) en Subtotal, IVA, Total
//   - Formato fecha en col Fecha
//
// Uso: npx tsx --env-file=.env.local scripts/formatear-pestañas-mes.ts

import { google } from "googleapis";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Config de columnas: width + alignment + numberFormat
// Cols: A=N° B=Fecha C=Proveedor D=NIT E=N°Factura F=Subtotal G=IVA H=Total
//        I=Concepto J=LinkPDF K=Categoría L=CuentaPYG
const COLS = [
  { idx: 0,  width: 50,  align: "CENTER", format: { type: "NUMBER", pattern: "#,##0" } },         // N°
  { idx: 1,  width: 95,  align: "CENTER", format: { type: "DATE", pattern: "yyyy-mm-dd" } },      // Fecha
  { idx: 2,  width: 280, align: "LEFT",   format: null },                                          // Proveedor
  { idx: 3,  width: 100, align: "CENTER", format: null },                                          // NIT
  { idx: 4,  width: 130, align: "CENTER", format: null },                                          // N° Factura
  { idx: 5,  width: 110, align: "RIGHT",  format: { type: "CURRENCY", pattern: "\"$\"#,##0" } },  // Subtotal
  { idx: 6,  width: 95,  align: "RIGHT",  format: { type: "CURRENCY", pattern: "\"$\"#,##0" } },  // IVA
  { idx: 7,  width: 110, align: "RIGHT",  format: { type: "CURRENCY", pattern: "\"$\"#,##0" } },  // Total
  { idx: 8,  width: 280, align: "LEFT",   format: null },                                          // Concepto
  { idx: 9,  width: 80,  align: "CENTER", format: null },                                          // Link PDF
  { idx: 10, width: 200, align: "LEFT",   format: null },                                          // Categoría
  { idx: 11, width: 220, align: "LEFT",   format: null },                                          // Cuenta PYG
];

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.INVOICES_SHEET_ID!;

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabsByName = new Map<string, number>();
  for (const s of meta.data.sheets ?? []) {
    if (s.properties?.title && s.properties.sheetId != null) {
      tabsByName.set(s.properties.title, s.properties.sheetId);
    }
  }

  const requests: any[] = [];
  for (const monthName of MESES) {
    const sheetId = tabsByName.get(monthName);
    if (sheetId == null) continue;

    // Header row (row 0): bold + fondo + center + frozen
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 12 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true, fontSize: 11 },
            backgroundColor: { red: 0.9, green: 0.9, blue: 0.95 },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,verticalAlignment)",
      },
    });

    // Frozen row 1
    requests.push({
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    });

    // Por cada columna: width + alignment del cuerpo + numberFormat
    for (const c of COLS) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: c.idx, endIndex: c.idx + 1 },
          properties: { pixelSize: c.width },
          fields: "pixelSize",
        },
      });
      // Body format (rows 1+)
      const cell: any = {
        userEnteredFormat: { horizontalAlignment: c.align },
      };
      if (c.format) cell.userEnteredFormat.numberFormat = c.format;
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: c.idx, endColumnIndex: c.idx + 1 },
          cell,
          fields: c.format
            ? "userEnteredFormat(horizontalAlignment,numberFormat)"
            : "userEnteredFormat.horizontalAlignment",
        },
      });
    }
  }

  if (requests.length === 0) {
    console.log("No hay pestañas mensuales — nada que formatear.");
    return;
  }

  // Aplicar en chunks (Sheets API tiene límite de 100 requests por batchUpdate)
  const CHUNK = 90;
  for (let i = 0; i < requests.length; i += CHUNK) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: requests.slice(i, i + CHUNK) },
    });
  }

  console.log(`✅ Formato aplicado a las ${MESES.length} pestañas (${requests.length} requests en ${Math.ceil(requests.length / CHUNK)} chunks).`);
}

main().catch((e) => { console.error("ERROR:", e.message, e.stack); process.exit(1); });
