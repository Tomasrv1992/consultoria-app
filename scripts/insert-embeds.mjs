#!/usr/bin/env node
/**
 * Inserta el embed widget en los 4 boards de Miro restantes
 * (Dentilandia ya tiene). Idempotente: si ya hay un embed con la
 * misma URL en el board, lo skipea.
 *
 * Uso:
 *   node scripts/insert-embeds.mjs --dry-run   # solo muestra qué haría
 *   node scripts/insert-embeds.mjs             # ejecuta
 */

import fs from "node:fs";
import path from "node:path";

// Load .env.local manually (no dotenv dep needed)
function loadEnv() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) {
    console.error("ERROR: .env.local no encontrado en", process.cwd());
    process.exit(1);
  }
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const TOKEN = process.env.MIRO_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("ERROR: MIRO_ACCESS_TOKEN no encontrado en .env.local");
  process.exit(1);
}

const EMBED_SECRET = process.env.EMBED_SECRET || "embed-consultoria-a7x9k2m5p3";

const BOARDS = [
  { name: "CYGNUSS",                   boardId: "uXjVGVc5G44=", clientId: "client-cygnuss",     expectedTasks: 40 },
  { name: "AC AUTOS",                  boardId: "uXjVGNKVGKI=", clientId: "client-acautos",     expectedTasks: 13 },
  { name: "Paulina Zarrabe Odontologia", boardId: "uXjVGNKZkmM=", clientId: "client-paulina",   expectedTasks: 18 },
  { name: "Lativo",                    boardId: "uXjVGrJ405k=", clientId: "c5",                 expectedTasks: 5 },
];

const DRY_RUN = process.argv.includes("--dry-run");
const APP_BASE = "https://consultoria-ea.netlify.app";

function embedUrl(clientId) {
  return `${APP_BASE}/embed/${clientId}/plan?token=${EMBED_SECRET}`;
}

async function listEmbeds(boardId) {
  const url = `https://api.miro.com/v2/boards/${encodeURIComponent(boardId)}/items?type=embed&limit=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`listEmbeds ${boardId}: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.data || [];
}

async function createEmbed(boardId, clientId) {
  const url = `https://api.miro.com/v2/boards/${encodeURIComponent(boardId)}/embeds`;
  const body = {
    data: {
      url: embedUrl(clientId),
      mode: "inline",
    },
    position: { x: 0, y: 0, origin: "center" },
    geometry: { width: 1200 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`createEmbed ${boardId}: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

async function main() {
  console.log(`==> ${DRY_RUN ? "DRY RUN — " : ""}insert-embeds en ${BOARDS.length} boards`);
  console.log();

  for (const b of BOARDS) {
    const targetUrl = embedUrl(b.clientId);
    console.log(`---- ${b.name} (${b.clientId}) ----`);
    console.log(`  board_id: ${b.boardId}`);
    console.log(`  embed_url: ${targetUrl}`);

    let existing;
    try {
      existing = await listEmbeds(b.boardId);
    } catch (e) {
      console.log(`  FAIL al listar embeds: ${e.message}`);
      continue;
    }

    const dup = existing.find((e) => e.data?.url === targetUrl);
    if (dup) {
      console.log(`  SKIP — ya existe (item ${dup.id})`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [dry-run] crearía embed nuevo`);
      continue;
    }

    try {
      const created = await createEmbed(b.boardId, b.clientId);
      console.log(`  OK — creado item ${created.id}`);
    } catch (e) {
      console.log(`  FAIL al crear: ${e.message}`);
    }
  }

  console.log();
  console.log("==> done");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
