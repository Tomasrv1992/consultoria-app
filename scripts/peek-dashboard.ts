import { google } from "googleapis";
async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.INVOICES_SHEET_ID!,
    range: "'Dashboard'!A27:C75",
  });
  for (const r of res.data.values || []) console.log(JSON.stringify(r));
}
main().catch((e) => { console.error(e.message); process.exit(1); });
