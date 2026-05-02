// One-off: lista todos los proveedores únicos del Sheet con sus NITs y count
// para crear las reglas de categorización iniciales.
import { google } from "googleapis";

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.INVOICES_SHEET_ID!,
    range: "'Gastos 2026'!A:I",
  });
  const rows = res.data.values || [];

  // Agrupa por NIT
  const map = new Map<string, { proveedor: string; count: number; total: number; sample: string }>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const nit = String(r[2] || "").replace(/\D+/g, "");
    const proveedor = String(r[1] || "");
    const total = parseFloat(String(r[6] || "0").replace(/[^\d.,-]/g, "").replace(",", "."));
    const concepto = String(r[7] || "");

    if (!map.has(nit)) {
      map.set(nit, { proveedor, count: 0, total: 0, sample: concepto.slice(0, 40) });
    }
    const e = map.get(nit)!;
    e.count++;
    e.total += isNaN(total) ? 0 : total;
  }

  const sorted = Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  console.log("NIT,Proveedor,#Facturas,TotalAcum,EjemploConcepto");
  for (const [nit, e] of sorted) {
    console.log(`${nit},"${e.proveedor}",${e.count},${Math.round(e.total)},"${e.sample}"`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
