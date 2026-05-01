// Cuenta forwards recientes del otro Gmail llegando al principal
import { google } from "googleapis";

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.list({
    userId: "me",
    q: "from:tomasramirezvilla92@gmail.com filename:zip newer_than:1h",
    maxResults: 500,
  });
  console.log("Forwards llegados de tomasramirezvilla92 (última hora):", res.data.resultSizeEstimate ?? 0);

  const all = await gmail.users.messages.list({
    userId: "me",
    q: "filename:zip -label:Procesado newer_than:365d",
    maxResults: 500,
  });
  console.log("Total ZIPs pendientes a procesar (365d):", all.data.resultSizeEstimate ?? 0);

  // Count distintos remitentes para ver si hay más por reenviar
  const recent = await gmail.users.messages.list({
    userId: "me",
    q: "from:tomasramirezvilla92@gmail.com filename:zip newer_than:5m",
    maxResults: 100,
  });
  console.log("Forwards llegados en últimos 5 min (si > 0, todavía está corriendo):", recent.data.resultSizeEstimate ?? 0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
