#!/usr/bin/env node
// Procesa facturas DIAN (ZIP con PDF + XML) desde Gmail.
// Flujo: lista emails con factura sin etiqueta "Procesado" → descarga ZIP →
//        descomprime → parsea XML → sube PDF/XML a Drive (subcarpeta YYYY-MM)
//        → registra fila en Sheets → etiqueta el email como "Procesado".
//
// Uso:
//   node --env-file=.env.local scripts/procesar-facturas.mjs            # corre real
//   node --env-file=.env.local scripts/procesar-facturas.mjs --dry-run  # solo lista

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { google } from 'googleapis';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

// ===== Config =====
// Nota: DIAN Colombia no pone "factura" en el asunto, usa formato NIT;RAZON;NUMERO.
// Detectamos por adjunto ZIP, que es el denominador común.
const PROCESSED_LABEL = 'Procesado';

// --limit N procesa solo las primeras N facturas (útil para probar)
const limitIdx = process.argv.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : null;

// --window Nd ventana de búsqueda (default 30d, útil para backfill histórico)
const winIdx = process.argv.indexOf('--window');
const WINDOW = winIdx !== -1 ? process.argv[winIdx + 1] : '30d';

const SEARCH_QUERY = `filename:zip -label:Procesado newer_than:${WINDOW}`;

const env = process.env;
const required = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_OAUTH_REFRESH_TOKEN',
  'INVOICES_DRIVE_FOLDER_ID',
  'INVOICES_SHEET_ID',
];
for (const k of required) {
  if (!env[k]) {
    console.error(JSON.stringify({ fatal: `Falta env ${k}` }));
    process.exit(1);
  }
}
const SHEET_TAB = env.INVOICES_SHEET_TAB || 'Gastos';
// Tab names with spaces/special chars must be quoted in A1 ranges
const TAB_RANGE = `'${SHEET_TAB.replace(/'/g, "''")}'`;

// ===== Auth =====
const auth = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth });
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});

// ===== Gmail =====
async function getOrCreateLabel(name) {
  const list = await gmail.users.labels.list({ userId: 'me' });
  const found = list.data.labels?.find(l => l.name === name);
  if (found) return found.id;
  const created = await gmail.users.labels.create({
    userId: 'me',
    requestBody: { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
  });
  return created.data.id;
}

async function findInvoiceEmails() {
  const out = [];
  let pageToken;
  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: SEARCH_QUERY,
      maxResults: 100,
      pageToken,
    });
    if (res.data.messages) out.push(...res.data.messages);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return out;
}

async function getMessageFull(messageId) {
  const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  return res.data;
}

function getHeader(msg, name) {
  return msg.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;
}

function findZipParts(payload) {
  const out = [];
  function walk(part) {
    if (part.filename && /\.zip$/i.test(part.filename) && part.body?.attachmentId) {
      out.push({ filename: part.filename, attachmentId: part.body.attachmentId });
    }
    if (part.parts) part.parts.forEach(walk);
  }
  if (payload) walk(payload);
  return out;
}

async function downloadAttachment(messageId, attachmentId, filename) {
  const res = await gmail.users.messages.attachments.get({
    userId: 'me', messageId, id: attachmentId,
  });
  const buf = Buffer.from(res.data.data, 'base64url');
  const safeName = filename.replace(/[\\/:*?"<>|]/g, '_');
  const tmpPath = path.join(os.tmpdir(), `factura-${Date.now()}-${safeName}`);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

async function markEmailProcessed(messageId, labelId) {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds: [labelId] },
  });
}

// ===== ZIP & XML =====
function extractZip(zipPath) {
  const zip = new AdmZip(zipPath);
  const tmpDir = path.join(os.tmpdir(), `factura-extracted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  zip.extractAllTo(tmpDir, true);
  // Walk recursively (some ZIPs nest)
  const all = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else all.push(full);
    }
  }
  walk(tmpDir);
  return {
    pdfPath: all.find(p => /\.pdf$/i.test(p)) || null,
    xmlPaths: all.filter(p => /\.xml$/i.test(p)),
    allPaths: all,
  };
}

function pick(obj, ...paths) {
  for (const p of paths) {
    let cur = obj;
    let ok = true;
    for (const k of p.split('.')) {
      if (cur == null) { ok = false; break; }
      cur = cur[k];
    }
    if (ok && cur != null && cur !== '') return cur;
  }
  return null;
}

function asNumber(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v['#text'] != null) return parseFloat(v['#text']) || 0;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function asString(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object' && v['#text'] != null) return String(v['#text']);
  return String(v);
}

// DIAN AttachedDocument envuelve el Invoice como CDATA en cac:Attachment/cac:ExternalReference/cbc:Description
function unwrapAttachedDocument(parsed) {
  const ad = parsed.AttachedDocument;
  if (!ad) return null;
  // Buscar Description que contenga <Invoice
  function findInvoiceXml(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (const x of node) {
        const f = findInvoiceXml(x);
        if (f) return f;
      }
      return null;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'Description' && typeof v === 'string' && v.includes('<Invoice')) return v;
      if (k === 'Description' && Array.isArray(v)) {
        for (const x of v) if (typeof x === 'string' && x.includes('<Invoice')) return x;
      }
      const nested = findInvoiceXml(v);
      if (nested) return nested;
    }
    return null;
  }
  const innerXml = findInvoiceXml(ad);
  if (!innerXml) return null;
  return xmlParser.parse(innerXml);
}

function parseInvoiceXml(xmlPath) {
  const raw = fs.readFileSync(xmlPath, 'utf8');
  const parsed = xmlParser.parse(raw);

  let invoice = parsed.Invoice;
  if (!invoice) {
    const unwrapped = unwrapAttachedDocument(parsed);
    if (unwrapped) invoice = unwrapped.Invoice;
  }
  if (!invoice) return null;

  const supplier = invoice.AccountingSupplierParty?.Party;
  const proveedor = asString(
    pick(supplier, 'PartyTaxScheme.RegistrationName')
    ?? pick(supplier, 'PartyLegalEntity.RegistrationName')
    ?? pick(supplier, 'PartyName.Name')
    ?? 'Desconocido'
  );
  const nit = asString(
    pick(supplier, 'PartyTaxScheme.CompanyID')
    ?? pick(supplier, 'PartyIdentification.ID')
    ?? ''
  ).replace(/\D+/g, ''); // normaliza solo dígitos

  const totals = invoice.LegalMonetaryTotal;
  const subtotal = asNumber(pick(totals, 'LineExtensionAmount'));
  const total = asNumber(
    pick(totals, 'TaxInclusiveAmount')
    ?? pick(totals, 'PayableAmount')
  );

  let iva = 0;
  const taxArr = Array.isArray(invoice.TaxTotal) ? invoice.TaxTotal
                : invoice.TaxTotal ? [invoice.TaxTotal] : [];
  for (const t of taxArr) iva += asNumber(t.TaxAmount);

  const lines = Array.isArray(invoice.InvoiceLine) ? invoice.InvoiceLine
                : invoice.InvoiceLine ? [invoice.InvoiceLine] : [];
  let concepto = '';
  if (lines.length === 1) {
    concepto = asString(pick(lines[0], 'Item.Description', 'Item.Name'));
  } else if (lines.length > 1) {
    const first = asString(pick(lines[0], 'Item.Description', 'Item.Name'));
    concepto = first ? `${first} (+${lines.length - 1} más)` : `${lines.length} ítems`;
  }

  return {
    fecha: asString(pick(invoice, 'IssueDate')),
    proveedor,
    nit,
    numero: asString(pick(invoice, 'ID')),
    cufe: asString(pick(invoice, 'UUID')),
    subtotal,
    iva,
    total,
    concepto,
  };
}

// ===== Drive =====
async function getOrCreateMonthFolder(year, month) {
  const name = `${year}-${String(month).padStart(2, '0')}`;
  const q = `name='${name}' and '${env.INVOICES_DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive' });
  if (list.data.files?.length) return list.data.files[0].id;
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [env.INVOICES_DRIVE_FOLDER_ID],
    },
    fields: 'id',
  });
  return created.data.id;
}

async function uploadFile(localPath, parentId, name) {
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId] },
    media: { body: fs.createReadStream(localPath) },
    fields: 'id, webViewLink',
  });
  return res.data;
}

// ===== Sheets =====
let _sheetCache = null;
async function loadSheetRows() {
  if (_sheetCache) return _sheetCache;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.INVOICES_SHEET_ID,
    range: `${TAB_RANGE}!A:I`,
  });
  _sheetCache = res.data.values || [];
  return _sheetCache;
}

function isDuplicate(rows, numero, nit) {
  if (!numero) return false;
  const nitNorm = String(nit || '').replace(/\D+/g, '');
  // Cols: A Fecha, B Proveedor, C NIT, D N° Factura, E Subtotal, F IVA, G Total, H Concepto, I Link PDF
  return rows.some(r => {
    const rowNum = String(r[3] || '').trim();
    const rowNit = String(r[2] || '').replace(/\D+/g, '');
    return rowNum === String(numero).trim() && (rowNit === nitNorm || !nitNorm || !rowNit);
  });
}

async function appendToSheet(d) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: env.INVOICES_SHEET_ID,
    range: `${TAB_RANGE}!A:I`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[d.fecha, d.proveedor, d.nit, d.numero, d.subtotal, d.iva, d.total, d.concepto, d.driveLink]],
    },
  });
  // Invalidate cache so subsequent invoices in same run see this row
  if (_sheetCache) {
    _sheetCache.push([d.fecha, d.proveedor, d.nit, d.numero, d.subtotal, d.iva, d.total, d.concepto, d.driveLink]);
  }
}

// ===== Pipeline =====
async function processOne(messageId, labelId) {
  const msg = await getMessageFull(messageId);
  const subject = getHeader(msg, 'Subject') || '(sin asunto)';
  const from = getHeader(msg, 'From') || '';

  const zips = findZipParts(msg.payload);
  if (!zips.length) return { skip: true, reason: 'sin-zip', subject, from };

  // Procesar primer ZIP (típicamente DIAN manda uno solo)
  const z = zips[0];
  const zipPath = await downloadAttachment(messageId, z.attachmentId, z.filename);
  let extracted;
  try {
    extracted = extractZip(zipPath);
  } catch (e) {
    throw new Error('ZIP corrupto: ' + e.message);
  }
  const { pdfPath, xmlPaths } = extracted;
  if (!xmlPaths.length) throw new Error('ZIP sin XML');

  let data = null;
  let lastErr = null;
  for (const x of xmlPaths) {
    try {
      const candidate = parseInvoiceXml(x);
      if (candidate && (candidate.numero || candidate.cufe)) { data = candidate; break; }
    } catch (e) { lastErr = e; }
  }
  // Si ningún XML parseó como factura DIAN, salta (no error — puede ser ZIP de otra cosa)
  if (!data) return { skip: true, reason: 'no-es-factura-dian', subject, from };

  // Idempotencia secundaria: dup por N° factura + NIT
  const sheetRows = await loadSheetRows();
  if (isDuplicate(sheetRows, data.numero, data.nit)) {
    await markEmailProcessed(messageId, labelId);
    return { dup: true, motivo: `${data.proveedor} ${data.numero} (ya en Sheet)`, subject };
  }

  // Carpeta del mes según fecha de emisión
  const issue = data.fecha ? new Date(data.fecha) : new Date();
  const year = issue.getFullYear();
  const month = issue.getMonth() + 1;
  const folderId = await getOrCreateMonthFolder(year, month);

  let driveLink = '';
  const baseName = `${data.fecha || 'sin-fecha'}_${data.proveedor.slice(0, 40)}_${data.numero || data.cufe.slice(0, 8)}`
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_');

  if (pdfPath) {
    const uploaded = await uploadFile(pdfPath, folderId, `${baseName}.pdf`);
    driveLink = uploaded.webViewLink || '';
  }
  for (const x of xmlPaths) {
    await uploadFile(x, folderId, `${baseName}__${path.basename(x)}`);
  }

  await appendToSheet({ ...data, driveLink });
  await markEmailProcessed(messageId, labelId);

  return {
    ok: true,
    proveedor: data.proveedor,
    total: data.total,
    factura: data.numero,
    fecha: data.fecha,
    driveLink,
    subject,
  };
}

// ===== Main =====
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const labelId = await getOrCreateLabel(PROCESSED_LABEL);
  let emails = await findInvoiceEmails();
  if (LIMIT != null && LIMIT > 0) emails = emails.slice(0, LIMIT);

  if (dryRun) {
    // Listar asunto + from para que veas qué encontró sin tocar nada
    const detailed = [];
    for (const e of emails.slice(0, 20)) {
      const m = await getMessageFull(e.id);
      detailed.push({
        id: e.id,
        subject: getHeader(m, 'Subject'),
        from: getHeader(m, 'From'),
        date: getHeader(m, 'Date'),
        zips: findZipParts(m.payload).map(z => z.filename),
      });
    }
    console.log(JSON.stringify({ dryRun: true, query: SEARCH_QUERY, total: emails.length, sample: detailed }, null, 2));
    return;
  }

  const result = { procesadas: [], errores: [], saltadas: [] };
  for (const e of emails) {
    try {
      const r = await processOne(e.id, labelId);
      if (r.ok) result.procesadas.push(r);
      else if (r.dup) result.saltadas.push({ messageId: e.id, motivo: r.motivo, asunto: r.subject });
      else if (r.skip) result.saltadas.push({ messageId: e.id, motivo: r.reason, asunto: r.subject });
      else result.errores.push({ messageId: e.id, error: 'desconocido', asunto: r.subject });
    } catch (err) {
      result.errores.push({ messageId: e.id, error: err.message });
    }
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ fatal: err.message, stack: err.stack }));
  process.exit(1);
});
