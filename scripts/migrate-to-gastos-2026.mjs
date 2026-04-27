#!/usr/bin/env node
// Script de migración one-time:
// 1. Crea tab "Gastos 2026" con encabezados en el spreadsheet de control
// 2. Borra las 2 filas de prueba que se insertaron en la tab "Gastos"
// 3. Remueve el label "Procesado" de los 2 correos de esas facturas
//
// Uso: node --env-file=.env.local scripts/migrate-to-gastos-2026.mjs

import { google } from 'googleapis';

const env = process.env;
const auth = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN });
const sheets = google.sheets({ version: 'v4', auth });
const gmail = google.gmail({ version: 'v1', auth });

const NEW_TAB = 'Gastos 2026';
const OLD_TAB = 'Gastos';
const HEADERS = ['Fecha', 'Proveedor', 'NIT', 'N° Factura', 'Subtotal', 'IVA', 'Total', 'Concepto', 'Link PDF'];
const DRIVE_IDS_TO_REMOVE = [
  '1hG78bbi0sQlOAbBcUYIjy8miOuJ7ySo4',
  '1nijz880nj_h-GfQXcNPOeH0Q9rd_Ts9E',
];
const MESSAGE_IDS_TO_UNMARK = ['19dbc2f1d27b7bc7', '19dbab0c9911465d'];

async function main() {
  const spreadsheetId = env.INVOICES_SHEET_ID;

  // 1. Meta de tabs
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs = meta.data.sheets.map(s => ({ id: s.properties.sheetId, title: s.properties.title }));
  const oldTab = tabs.find(t => t.title === OLD_TAB);

  // 2. Crear tab nuevo si no existe
  let newTab = tabs.find(t => t.title === NEW_TAB);
  if (!newTab) {
    const created = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: NEW_TAB } } }] },
    });
    newTab = { id: created.data.replies[0].addSheet.properties.sheetId, title: NEW_TAB };
    console.log(`✓ Creado tab "${NEW_TAB}"`);
  } else {
    console.log(`- Tab "${NEW_TAB}" ya existía`);
  }

  // 3. Encabezados en fila 1 (bold + congelado)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${NEW_TAB}'!A1:I1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: newTab.id, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.95 } } },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId: newTab.id, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });
  console.log(`✓ Encabezados con formato en "${NEW_TAB}"`);

  // 4. Borrar las 2 filas de prueba en tab Gastos
  if (oldTab) {
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${OLD_TAB}'!A:I`,
    });
    const rows = data.data.values || [];
    const toDelete = [];
    for (let i = 0; i < rows.length; i++) {
      const linkPdf = rows[i][8] || '';
      if (DRIVE_IDS_TO_REMOVE.some(id => linkPdf.includes(id))) toDelete.push(i);
    }
    if (toDelete.length) {
      toDelete.sort((a, b) => b - a); // bottom-up
      const reqs = toDelete.map(i => ({
        deleteDimension: {
          range: { sheetId: oldTab.id, dimension: 'ROWS', startIndex: i, endIndex: i + 1 },
        },
      }));
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: reqs } });
      console.log(`✓ Eliminadas ${toDelete.length} filas de "${OLD_TAB}"`);
    } else {
      console.log(`- No había filas de prueba para eliminar en "${OLD_TAB}"`);
    }
  }

  // 5. Quitar label Procesado de los 2 correos
  const labelsList = await gmail.users.labels.list({ userId: 'me' });
  const procesadoLabel = labelsList.data.labels.find(l => l.name === 'Procesado');
  if (procesadoLabel) {
    let unmarked = 0;
    for (const id of MESSAGE_IDS_TO_UNMARK) {
      try {
        await gmail.users.messages.modify({
          userId: 'me',
          id,
          requestBody: { removeLabelIds: [procesadoLabel.id] },
        });
        unmarked++;
      } catch (e) {
        console.warn(`  ⚠ No pude unmark ${id}: ${e.message}`);
      }
    }
    console.log(`✓ Removido label "Procesado" de ${unmarked}/${MESSAGE_IDS_TO_UNMARK.length} correos`);
  } else {
    console.log('- No existe label "Procesado" todavía');
  }

  console.log('\n✅ Migración completa.');
  console.log('\nSiguientes pasos:');
  console.log(`  1. Actualiza .env.local: INVOICES_SHEET_TAB=${NEW_TAB}`);
  console.log('  2. Corre el backfill: node --env-file=.env.local scripts/procesar-facturas.mjs --window 365d');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
