// Crea/actualiza pestaña "Dashboard" con métricas vivas que agregan entre las
// 12 pestañas-mes (Enero..Diciembre). Estructura del Sheet por mes:
//   A=N°, B=Fecha, C=Proveedor, D=NIT, E=N°Factura, F=Subtotal, G=IVA,
//   H=Total, I=Concepto, J=Link PDF, K=Categoría, L=Cuenta PYG
//
// Uso: npx tsx --env-file=.env.local scripts/crear-dashboard.ts

import { google } from "googleapis";

const TAB_NAME = "Dashboard";
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.INVOICES_SHEET_ID!;

  // 1. Crear (o reusar) tab Dashboard
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs = meta.data.sheets || [];
  let tab = tabs.find((s) => s.properties?.title === TAB_NAME);

  if (!tab) {
    const created = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: TAB_NAME,
              gridProperties: { rowCount: 100, columnCount: 8, frozenRowCount: 1 },
              tabColor: { red: 0.2, green: 0.5, blue: 0.9 },
            },
          },
        }],
      },
    });
    const newSheet = created.data.replies?.[0]?.addSheet?.properties;
    if (!newSheet?.sheetId) throw new Error("No se pudo crear el tab");
    tab = { properties: newSheet };
    console.log(`✓ Tab "${TAB_NAME}" creado`);
  } else {
    console.log(`- Tab "${TAB_NAME}" ya existía, sobrescribiendo`);
  }
  const sheetId = tab.properties!.sheetId!;

  // Helpers para fórmulas
  // Suma de col H (Total) entre todas las pestañas-mes
  const sumAllMonths = (col: string) => MESES.map((m) => `SUM('${m}'!${col}:${col})`).join("+");
  // Count de col A (N°) entre todas las pestañas-mes
  const countAllMonths = (col: string) =>
    MESES.map((m) => `COUNTA('${m}'!${col}2:${col})`).join("+");
  // Vstack para QUERY: { Enero!A2:L; Febrero!A2:L; ... } — separador es-CO usa `;` para
  // arrays verticales y `\` para arrays horizontales.
  const vstackData = `{${MESES.map((m) => `'${m}'!A2:L`).join(";")}}`;

  // Filas del Sheet
  const monthRows = MESES.map((m) => [
    m,
    `=COUNTA('${m}'!A2:A)`,
    `=SUM('${m}'!F:F)`,
    `=SUM('${m}'!G:G)`,
    `=SUM('${m}'!H:H)`,
  ]);

  const rows: any[][] = [
    ["DASHBOARD GASTOS 2026", "", "", "", ""],                                                    // 1
    ["Actualizado en vivo desde las 12 pestañas mensuales", "", "", "", ""],                       // 2
    ["", "", "", "", ""],                                                                            // 3
    ["📊 KPIs Anuales", "", "", "", ""],                                                            // 4
    ["Total facturas",       `=${countAllMonths("A")}`, "", "", ""],                                // 5
    ["Total gastado",        `=${sumAllMonths("H")}`, "", "", ""],                                  // 6
    ["Promedio por factura", `=IFERROR(B6/B5;0)`, "", "", ""],                                       // 7
    ["IVA acumulado",        `=${sumAllMonths("G")}`, "", "", ""],                                   // 8
    ["Subtotal acumulado",   `=${sumAllMonths("F")}`, "", "", ""],                                   // 9
    ["", "", "", "", ""],                                                                            // 10
    ["📅 Gastos por mes", "", "", "", ""],                                                          // 11
    ["Mes", "# Facturas", "Subtotal", "IVA", "Total"],                                              // 12
    ...monthRows,                                                                                    // 13-24
    ["TOTAL", `=SUM(B13:B24)`, `=SUM(C13:C24)`, `=SUM(D13:D24)`, `=SUM(E13:E24)`],                  // 25
    ["", "", "", "", ""],                                                                            // 26
    ["💼 Por Cuenta PYG (PUC)", "", "", "", ""],                                                    // 27
    ["Cuenta PYG", "# Facturas", "Total", "", ""],                                                  // 28
    [`=IFERROR(QUERY(${vstackData};"select Col12, count(Col12), sum(Col8) where Col12 is not null and Col12<>'' group by Col12 order by sum(Col8) desc label Col12 '', count(Col12) '', sum(Col8) ''";0);"sin datos")`, "", "", "", ""],
    ...Array(14).fill(["", "", "", "", ""]),                                                         // 30-43
    ["", "", "", "", ""],                                                                            // 44
    ["🏷️ Por Categoría", "", "", "", ""],                                                           // 45
    ["Categoría", "# Facturas", "Total", "", ""],                                                   // 46
    [`=IFERROR(QUERY(${vstackData};"select Col11, count(Col11), sum(Col8) where Col11 is not null and Col11<>'' group by Col11 order by sum(Col8) desc label Col11 '', count(Col11) '', sum(Col8) ''";0);"sin datos")`, "", "", "", ""],
    ...Array(14).fill(["", "", "", "", ""]),                                                         // 48-61
    ["", "", "", "", ""],                                                                            // 62
    ["🏆 Top 10 proveedores", "", "", "", ""],                                                     // 63
    ["Proveedor", "# Facturas", "Total", "", ""],                                                   // 64
    [`=IFERROR(QUERY(${vstackData};"select Col3, count(Col3), sum(Col8) where Col3 is not null and Col3<>'' group by Col3 order by sum(Col8) desc limit 10 label Col3 '', count(Col3) '', sum(Col8) ''";0);"sin datos")`, "", "", "", ""],
  ];

  // 3. Escribir
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${TAB_NAME}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
  console.log(`✓ ${rows.length} filas escritas`);

  // 4. Formato (igual al previo, ajustado a las nuevas posiciones)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Título
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
            mergeType: "MERGE_ALL",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.4, blue: 0.7 },
                textFormat: { bold: true, fontSize: 16, foregroundColor: { red: 1, green: 1, blue: 1 } },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
          },
        },
        // Subtítulo
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 5 },
            mergeType: "MERGE_ALL",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 5 },
            cell: {
              userEnteredFormat: {
                textFormat: { italic: true, foregroundColor: { red: 0.5, green: 0.5, blue: 0.5 } },
                horizontalAlignment: "CENTER",
              },
            },
            fields: "userEnteredFormat(textFormat,horizontalAlignment)",
          },
        },
        // Sección headers
        ...[3, 10, 26, 44, 62].map((row) => ({
          repeatCell: {
            range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 5 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.93, green: 0.93, blue: 0.97 },
                textFormat: { bold: true, fontSize: 12 },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        })),
        // KPIs labels
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 4, endRowIndex: 9, startColumnIndex: 0, endColumnIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat",
          },
        },
        // KPIs values currency
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 5, endRowIndex: 9, startColumnIndex: 1, endColumnIndex: 2 },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: "CURRENCY", pattern: "\"$\"#,##0" },
                textFormat: { bold: true, fontSize: 12 },
              },
            },
            fields: "userEnteredFormat(numberFormat,textFormat)",
          },
        },
        // Total facturas (entero)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 1, endColumnIndex: 2 },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: "NUMBER", pattern: "#,##0" },
                textFormat: { bold: true, fontSize: 12 },
              },
            },
            fields: "userEnteredFormat(numberFormat,textFormat)",
          },
        },
        // Headers tabla mensual
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 11, endRowIndex: 12, startColumnIndex: 0, endColumnIndex: 5 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.85, green: 0.85, blue: 0.95 },
                textFormat: { bold: true },
                horizontalAlignment: "CENTER",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
          },
        },
        // Tabla mensual: # facturas number, montos currency
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 12, endRowIndex: 25, startColumnIndex: 1, endColumnIndex: 2 },
            cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" } } },
            fields: "userEnteredFormat.numberFormat",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 12, endRowIndex: 25, startColumnIndex: 2, endColumnIndex: 5 },
            cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "\"$\"#,##0" } } },
            fields: "userEnteredFormat.numberFormat",
          },
        },
        // Fila TOTAL destacada
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 24, endRowIndex: 25, startColumnIndex: 0, endColumnIndex: 5 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.4, blue: 0.7 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
        // Headers de las 3 tablas QUERY
        ...[27, 45, 63].map((row) => ({
          repeatCell: {
            range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 3 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.85, green: 0.85, blue: 0.95 },
                textFormat: { bold: true },
                horizontalAlignment: "CENTER",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
          },
        })),
        // Cuerpos QUERY: # facturas number, total currency
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 28, endRowIndex: 80, startColumnIndex: 1, endColumnIndex: 2 },
            cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" }, horizontalAlignment: "CENTER" } },
            fields: "userEnteredFormat(numberFormat,horizontalAlignment)",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 28, endRowIndex: 80, startColumnIndex: 2, endColumnIndex: 3 },
            cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "\"$\"#,##0" } } },
            fields: "userEnteredFormat.numberFormat",
          },
        },
        // Anchos
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 220 },
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 5 },
            properties: { pixelSize: 130 },
            fields: "pixelSize",
          },
        },
        // Alto título
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 40 },
            fields: "pixelSize",
          },
        },
      ],
    },
  });

  console.log("✓ Formato aplicado");
  console.log(`\n✅ Dashboard listo: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`);
}

main().catch((e) => { console.error("ERROR:", e.message, e.stack); process.exit(1); });
