import { NextRequest, NextResponse } from "next/server";
import { MIRO_BOARDS } from "@/lib/clients-config";

export const dynamic = "force-dynamic";

const INSTALL_SECRET = "install-embeds-2026-abril";
const MIRO_API = "https://api.miro.com/v2";

interface DataTableInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface InstallResult {
  clientId: string;
  widgetId?: string;
  embedUrl?: string;
  dataTablePos?: { x: number; y: number };
  error?: string;
}

async function getDataTablePosition(
  boardId: string,
  widgetId: string,
  token: string
): Promise<DataTableInfo | null> {
  const res = await fetch(
    `${MIRO_API}/boards/${encodeURIComponent(boardId)}/items/${widgetId}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const pos = data?.position;
  const geo = data?.geometry;
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return null;
  return {
    x: pos.x,
    y: pos.y,
    width: typeof geo?.width === "number" ? geo.width : 1000,
    height: typeof geo?.height === "number" ? geo.height : 1000,
  };
}

async function createEmbed(
  boardId: string,
  token: string,
  url: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<{ id: string } | { error: string }> {
  const body = {
    data: { url, mode: "inline" },
    position: { x, y, origin: "center", relativeTo: "canvas_center" },
    geometry: { width, height },
  };
  const res = await fetch(
    `${MIRO_API}/boards/${encodeURIComponent(boardId)}/embeds`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    return { error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
  }
  try {
    const data = JSON.parse(text);
    return { id: data.id };
  } catch {
    return { error: `Invalid JSON response: ${text.slice(0, 200)}` };
  }
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== INSTALL_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = process.env.MIRO_ACCESS_TOKEN;
  const embedSecret = process.env.EMBED_SECRET;
  if (!token) {
    return NextResponse.json(
      { error: "MIRO_ACCESS_TOKEN no configurado" },
      { status: 500 }
    );
  }
  if (!embedSecret) {
    return NextResponse.json(
      { error: "EMBED_SECRET no configurado" },
      { status: 500 }
    );
  }

  const host = request.headers.get("host") || "consultoria-ea.netlify.app";
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const appUrl = `${proto}://${host}`;

  const EMBED_WIDTH = 1200;
  const EMBED_HEIGHT = 1500;
  const GAP = 200;

  const results: InstallResult[] = [];

  for (const [clientId, board] of Object.entries(MIRO_BOARDS)) {
    const result: InstallResult = { clientId };
    try {
      const dt = await getDataTablePosition(board.boardId, board.widgetId, token);
      if (!dt) {
        result.error = "no se pudo leer la posición del data_table";
        results.push(result);
        continue;
      }
      result.dataTablePos = { x: dt.x, y: dt.y };

      const embedX = dt.x + dt.width / 2 + GAP + EMBED_WIDTH / 2;
      const embedY = dt.y;
      const url = `${appUrl}/embed/${clientId}/plan?token=${encodeURIComponent(
        embedSecret
      )}`;

      const created = await createEmbed(
        board.boardId,
        token,
        url,
        embedX,
        embedY,
        EMBED_WIDTH,
        EMBED_HEIGHT
      );
      if ("error" in created) {
        result.error = created.error;
      } else {
        result.widgetId = created.id;
        result.embedUrl = url;
      }
    } catch (err) {
      result.error = `exception: ${(err as Error).message}`;
    }
    results.push(result);
  }

  const errors = results.filter((r) => r.error);
  return NextResponse.json({
    ok: errors.length === 0,
    created: results.filter((r) => r.widgetId),
    errors,
    appUrl,
  });
}
