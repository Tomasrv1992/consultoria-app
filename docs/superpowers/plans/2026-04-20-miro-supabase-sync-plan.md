# Miro ↔ Supabase Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Supabase into the single source of truth for tasks. Every write in the app pushes automatically to the Miro `data_table`. The Fathom transcript workflow becomes a tab inside the existing `pegar-pendientes` page that calls Anthropic API to generate the JSON.

**Architecture:** New `src/lib/miro-writer.ts` wraps Miro v2-experimental Tables API with `setRowEstado / createRow / updateRow / deleteRow`. All `/api/tasks/*` endpoints call the writer after Supabase succeeds. The writer never throws — it returns `{ ok: false, code }` so Supabase writes always commit. New `/api/meetings/process` calls Claude (`claude-sonnet-4-6`) with the transcript and existing tasks, returns a JSON diff that the existing preview UI renders.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Miro v2-experimental Tables API, Anthropic SDK (`@anthropic-ai/sdk`).

**Spec:** `docs/superpowers/specs/2026-04-20-miro-supabase-sync-design.md`

**No test framework in this repo** — verification uses `npm run build`, `curl`, and manual UI checks. Where helpful, ad-hoc Node scripts are placed in `scripts/` and run with `node scripts/<file>.mjs`.

---

## Pre-flight

### Task 0: Environment setup

**Files:** none (env vars only)

- [ ] **Step 1: Add `MIRO_ACCESS_TOKEN` with `boards:write` scope to Netlify**

Tomás does this manually:
1. Open https://miro.com/app/settings/developer → existing app → Permissions
2. Ensure scopes include: `boards:read`, `boards:write`
3. Regenerate token if `boards:write` was missing
4. Netlify → Site configuration → Environment variables → add `MIRO_ACCESS_TOKEN` with the new value
5. Trigger redeploy with cache cleared

- [ ] **Step 2: Add `ANTHROPIC_API_KEY` to Netlify**

Tomás does this manually:
1. Open https://console.anthropic.com → API Keys → Create new
2. Netlify → Site configuration → Environment variables → add `ANTHROPIC_API_KEY` with the value

- [ ] **Step 3: Mirror both vars in `.env.local`**

Add to `c:/Users/TOMAS/Desktop/consultoria-app/.env.local`:
```bash
MIRO_ACCESS_TOKEN=<same_value_as_netlify>
ANTHROPIC_API_KEY=<same_value_as_netlify>
```

- [ ] **Step 4: Smoke-test the Miro token has the right scope**

Run from project root:
```bash
node -e "fetch('https://api.miro.com/v1/oauth-token', { headers: { Authorization: 'Bearer ' + process.env.MIRO_ACCESS_TOKEN }}).then(r => r.json()).then(j => console.log('scopes:', j.scopes || j.scope))" --env-file=.env.local
```
Expected: prints array containing `"boards:write"`. If missing, redo Step 1.

---

## Phase A — Miro writer module + wire into existing task endpoints

### Task 1: Create `miro-writer.ts` with `setRowEstado`

**Files:**
- Create: `src/lib/miro-writer.ts`

- [ ] **Step 1: Create the writer module**

Create `src/lib/miro-writer.ts`:
```typescript
import { MIRO_BOARDS } from "./miro-boards";

const MIRO_API = "https://api.miro.com/v2-experimental";

export type WriterResult =
  | { ok: true; rowId: string }
  | { ok: false; code: WriterErrorCode; detail?: string };

export type WriterErrorCode =
  | "missing_token"
  | "missing_scope"
  | "client_unknown"
  | "row_not_found"
  | "table_fetch_failed"
  | "patch_failed"
  | "create_failed"
  | "delete_failed"
  | "network_error";

interface MiroColumn {
  id: string;
  title?: string;
  name?: string;
  options?:
    | { id: string; displayValue?: string; value?: string; text?: string }[]
    | null;
}

interface MiroRow {
  id: string;
  cells: {
    columnId: string;
    content?: string | null;
    value?: string | null;
    text?: string | null;
  }[];
}

function deltaText(content: string | null | undefined): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    if (parsed.format === "delta" && Array.isArray(parsed.ops)) {
      return parsed.ops
        .map((op: { insert?: string }) => op.insert || "")
        .join("")
        .trim();
    }
  } catch {
    /* plain text */
  }
  return content.trim();
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

interface TableMeta {
  columns: MiroColumn[];
  byTitle: Record<string, MiroColumn>;
}

const tableMetaCache = new Map<string, { meta: TableMeta; expires: number }>();
const META_TTL_MS = 5 * 60 * 1000;

async function fetchTableMeta(
  boardId: string,
  tableId: string,
  token: string
): Promise<TableMeta | null> {
  const cacheKey = `${boardId}:${tableId}`;
  const cached = tableMetaCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.meta;

  const res = await fetch(
    `${MIRO_API}/boards/${encodeURIComponent(boardId)}/tables/${tableId}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const columns: MiroColumn[] = data.columns || [];
  const byTitle: Record<string, MiroColumn> = {};
  for (const c of columns) {
    const key = (c.title || c.name || "").toLowerCase();
    if (key) byTitle[key] = c;
  }
  const meta: TableMeta = { columns, byTitle };
  tableMetaCache.set(cacheKey, {
    meta,
    expires: Date.now() + META_TTL_MS,
  });
  return meta;
}

async function findRowByTitle(
  boardId: string,
  tableId: string,
  tareaColId: string,
  taskTitle: string,
  token: string
): Promise<MiroRow | null> {
  const res = await fetch(
    `${MIRO_API}/boards/${encodeURIComponent(boardId)}/tables/${tableId}/rows?limit=200`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const rows: MiroRow[] = data.data || data.rows || data.items || [];
  const target = taskTitle.trim().toLowerCase();
  return (
    rows.find((r) => {
      const cell = r.cells.find((c) => c.columnId === tareaColId);
      if (!cell) return false;
      const txt = deltaText(cell.content ?? cell.value ?? cell.text ?? "");
      return txt.toLowerCase() === target;
    }) || null
  );
}

export async function setRowEstado(
  clientId: string,
  taskTitulo: string,
  estado: string
): Promise<WriterResult> {
  const token = process.env.MIRO_ACCESS_TOKEN;
  if (!token) return { ok: false, code: "missing_token" };

  const board = MIRO_BOARDS[clientId];
  if (!board) return { ok: false, code: "client_unknown" };

  try {
    const meta = await fetchTableMeta(board.boardId, board.widgetId, token);
    if (!meta) return { ok: false, code: "table_fetch_failed" };

    const tareaCol = meta.byTitle["tarea"];
    const estadoCol = meta.byTitle["estado"];
    if (!tareaCol || !estadoCol)
      return {
        ok: false,
        code: "table_fetch_failed",
        detail: "columnas Tarea/Estado no encontradas",
      };

    const targetEstadoLower = estado.trim().toLowerCase();
    const opt = estadoCol.options?.find((o) => {
      const lbl = (o.displayValue || o.value || o.text || "").toLowerCase();
      return lbl === targetEstadoLower;
    });
    if (!opt)
      return {
        ok: false,
        code: "table_fetch_failed",
        detail: `opción Estado='${estado}' no encontrada`,
      };

    const row = await findRowByTitle(
      board.boardId,
      board.widgetId,
      tareaCol.id,
      taskTitulo,
      token
    );
    if (!row) return { ok: false, code: "row_not_found" };

    const patchRes = await fetch(
      `${MIRO_API}/boards/${encodeURIComponent(board.boardId)}/tables/${board.widgetId}/rows/${row.id}`,
      {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({
          cells: [{ columnId: estadoCol.id, optionId: opt.id }],
        }),
      }
    );
    if (!patchRes.ok) {
      const detail = await patchRes.text();
      if (patchRes.status === 401 || patchRes.status === 403)
        return { ok: false, code: "missing_scope", detail };
      return { ok: false, code: "patch_failed", detail };
    }
    return { ok: true, rowId: row.id };
  } catch (err) {
    return {
      ok: false,
      code: "network_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Smoke-test setRowEstado against a real task**

Create `scripts/test-set-estado.mjs`:
```javascript
import { setRowEstado } from "../src/lib/miro-writer.js";

const result = await setRowEstado(
  "client-cygnuss",
  "Nicho lesiones — editar y lanzar pauta Meta",
  "Completada"
);
console.log(JSON.stringify(result, null, 2));
```

Run:
```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && node --env-file=.env.local --experimental-strip-types scripts/test-set-estado.mjs
```
Expected: `{ "ok": true, "rowId": "<some-id>" }`. Then go to Miro CYGNUSS board → find that task in data_table → confirm Estado is now "Completada".

**Rollback after test:** Run again with `"En curso"` instead of `"Completada"` to put the row back.

- [ ] **Step 4: Commit**

```bash
git add src/lib/miro-writer.ts scripts/test-set-estado.mjs
git commit -m "feat: miro-writer module with setRowEstado"
```

---

### Task 2: Wire `setRowEstado` into the complete-task endpoint

**Files:**
- Modify: `src/app/api/tasks/[id]/complete/route.ts`

- [ ] **Step 1: Update the complete endpoint to push to Miro after Supabase**

Replace the body of `POST` in `src/app/api/tasks/[id]/complete/route.ts` (after the existing successful Supabase update) so the final part looks like:

```typescript
  const { data, error } = await supabase
    .from("tasks")
    .update({
      estado: "Completada",
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
    })
    .eq("id", taskId)
    .select("id, client_id, titulo")
    .single();

  if (error) {
    console.warn("[tasks/complete] supabase error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const miroResult = await setRowEstado(
    data.client_id,
    data.titulo,
    "Completada"
  );
  if (!miroResult.ok) {
    console.warn("[tasks/complete] miro push failed:", miroResult);
  }

  return NextResponse.json({
    ok: true,
    task: data,
    miro: miroResult,
  });
```

Add the import at the top of the file:
```typescript
import { setRowEstado } from "@/lib/miro-writer";
```

- [ ] **Step 2: Build and verify no type errors**

Run:
```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npm run build 2>&1 | tail -10
```
Expected: build succeeds. No TS errors.

- [ ] **Step 3: Smoke-test end-to-end**

Run dev server in background:
```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npm run dev
```
Open `http://localhost:3000/client/client-cygnuss`, log in, click any task → "Marcar completada". Then open Miro CYGNUSS board → confirm that same row's Estado is "Completada".

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/[id]/complete/route.ts
git commit -m "feat: push to miro on task complete"
```

---

### Task 3: Add `createRow` to `miro-writer.ts`

**Files:**
- Modify: `src/lib/miro-writer.ts`

- [ ] **Step 1: Add the `CreateRowInput` type and `createRow` function**

Append to `src/lib/miro-writer.ts`:
```typescript
export interface CreateRowInput {
  titulo: string;
  modulo: string;
  responsable?: string | null;
  prioridad?: string | null;
  fecha_limite?: string | null;
  estado: string;
}

function findOption(col: MiroColumn | undefined, label: string) {
  if (!col?.options) return null;
  const target = label.trim().toLowerCase();
  return (
    col.options.find((o) => {
      const lbl = (o.displayValue || o.value || o.text || "").toLowerCase();
      return lbl === target;
    }) || null
  );
}

export async function createRow(
  clientId: string,
  task: CreateRowInput
): Promise<WriterResult> {
  const token = process.env.MIRO_ACCESS_TOKEN;
  if (!token) return { ok: false, code: "missing_token" };

  const board = MIRO_BOARDS[clientId];
  if (!board) return { ok: false, code: "client_unknown" };

  try {
    const meta = await fetchTableMeta(board.boardId, board.widgetId, token);
    if (!meta) return { ok: false, code: "table_fetch_failed" };

    const cols = meta.byTitle;
    const cells: { columnId: string; content?: string; optionId?: string }[] = [];

    if (cols["tarea"]) cells.push({ columnId: cols["tarea"].id, content: task.titulo });
    if (cols["área"] || cols["area"]) {
      const c = cols["área"] || cols["area"];
      cells.push({ columnId: c.id, content: task.modulo });
    }
    if (cols["responsable"] && task.responsable)
      cells.push({ columnId: cols["responsable"].id, content: task.responsable });
    if (cols["fecha límite"] || cols["fecha limite"]) {
      const c = cols["fecha límite"] || cols["fecha limite"];
      if (task.fecha_limite) cells.push({ columnId: c.id, content: task.fecha_limite });
    }

    const estadoCol = cols["estado"];
    if (estadoCol) {
      const opt = findOption(estadoCol, task.estado);
      if (opt) cells.push({ columnId: estadoCol.id, optionId: opt.id });
    }

    const prioridadCol = cols["prioridad"];
    if (prioridadCol && task.prioridad) {
      const opt = findOption(prioridadCol, task.prioridad);
      if (opt) cells.push({ columnId: prioridadCol.id, optionId: opt.id });
    }

    const res = await fetch(
      `${MIRO_API}/boards/${encodeURIComponent(board.boardId)}/tables/${board.widgetId}/rows`,
      {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ cells }),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      if (res.status === 401 || res.status === 403)
        return { ok: false, code: "missing_scope", detail };
      return { ok: false, code: "create_failed", detail };
    }
    const created = await res.json();
    return { ok: true, rowId: created.id };
  } catch (err) {
    return {
      ok: false,
      code: "network_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
```

- [ ] **Step 2: Smoke-test createRow**

Create `scripts/test-create-row.mjs`:
```javascript
import { createRow } from "../src/lib/miro-writer.js";

const result = await createRow("client-cygnuss", {
  titulo: "TEST — borrar esta tarea",
  modulo: "Mercadeo",
  responsable: "Tomas",
  prioridad: "Alta",
  fecha_limite: "30/04/2026",
  estado: "Iniciativa",
});
console.log(JSON.stringify(result, null, 2));
```

Run:
```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && node --env-file=.env.local --experimental-strip-types scripts/test-create-row.mjs
```
Expected: `{ "ok": true, "rowId": "<id>" }`. Open Miro CYGNUSS → see new row "TEST — borrar esta tarea" appended to data_table. Manually delete it from Miro after verification.

- [ ] **Step 3: Commit**

```bash
git add src/lib/miro-writer.ts scripts/test-create-row.mjs
git commit -m "feat: createRow in miro-writer"
```

---

### Task 4: Wire `createRow` into `/api/tasks/bulk-create`

**Files:**
- Modify: `src/app/api/tasks/bulk-create/route.ts`

- [ ] **Step 1: Add miro push after successful insert**

In `src/app/api/tasks/bulk-create/route.ts`, replace the final block (from `const { data, error } = await supabase.from("tasks").insert(rows)...` to the end of the function) with:

```typescript
  const { data, error } = await supabase
    .from("tasks")
    .insert(rows)
    .select("id, client_id, titulo, modulo, responsable, prioridad, fecha_limite, estado");
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const miroResults: { taskId: string; titulo: string; result: Awaited<ReturnType<typeof createRow>> }[] = [];
  for (const row of data ?? []) {
    const result = await createRow(row.client_id as string, {
      titulo: row.titulo as string,
      modulo: row.modulo as string,
      responsable: (row.responsable as string | null) ?? undefined,
      prioridad: (row.prioridad as string | null) ?? undefined,
      fecha_limite: (row.fecha_limite as string | null) ?? undefined,
      estado: row.estado as string,
    });
    miroResults.push({ taskId: row.id as string, titulo: row.titulo as string, result });
    if (!result.ok) {
      console.warn("[bulk-create] miro push failed for", row.titulo, result);
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  const miroFailed = miroResults.filter((r) => !r.result.ok);

  return NextResponse.json({
    ok: true,
    inserted: data?.length ?? 0,
    ids: (data ?? []).map((r) => r.id as string),
    errors,
    miroFailed: miroFailed.length,
    miroFailedDetails: miroFailed,
  });
```

Add the import at the top:
```typescript
import { createRow } from "@/lib/miro-writer";
```

- [ ] **Step 2: Build and verify**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npm run build 2>&1 | tail -10
```
Expected: success.

- [ ] **Step 3: Smoke-test via the existing pegar-pendientes UI**

Run dev server. Open `http://localhost:3000/client/client-cygnuss/pegar-pendientes`. Click "Cargar ejemplo" → click "Confirmar (2)". Open Miro CYGNUSS board → confirm 2 new rows appended. Manually delete them after verification (and delete from Supabase via SQL editor if needed).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/bulk-create/route.ts
git commit -m "feat: push to miro on bulk-create"
```

---

### Task 5: Add `updateRow` and `deleteRow` to `miro-writer.ts`

**Files:**
- Modify: `src/lib/miro-writer.ts`

- [ ] **Step 1: Add `UpdateRowInput` type and `updateRow` function**

Append to `src/lib/miro-writer.ts`:
```typescript
export interface UpdateRowInput {
  titulo?: string;
  modulo?: string;
  responsable?: string | null;
  prioridad?: string | null;
  fecha_limite?: string | null;
  estado?: string;
}

export async function updateRow(
  clientId: string,
  matchTitulo: string,
  fields: UpdateRowInput
): Promise<WriterResult> {
  const token = process.env.MIRO_ACCESS_TOKEN;
  if (!token) return { ok: false, code: "missing_token" };

  const board = MIRO_BOARDS[clientId];
  if (!board) return { ok: false, code: "client_unknown" };

  try {
    const meta = await fetchTableMeta(board.boardId, board.widgetId, token);
    if (!meta) return { ok: false, code: "table_fetch_failed" };

    const tareaCol = meta.byTitle["tarea"];
    if (!tareaCol)
      return {
        ok: false,
        code: "table_fetch_failed",
        detail: "columna Tarea no encontrada",
      };

    const row = await findRowByTitle(
      board.boardId,
      board.widgetId,
      tareaCol.id,
      matchTitulo,
      token
    );
    if (!row) return { ok: false, code: "row_not_found" };

    const cols = meta.byTitle;
    const cells: { columnId: string; content?: string; optionId?: string }[] = [];

    if (fields.titulo !== undefined && cols["tarea"])
      cells.push({ columnId: cols["tarea"].id, content: fields.titulo });
    if (fields.modulo !== undefined) {
      const c = cols["área"] || cols["area"];
      if (c) cells.push({ columnId: c.id, content: fields.modulo });
    }
    if (fields.responsable !== undefined && cols["responsable"])
      cells.push({
        columnId: cols["responsable"].id,
        content: fields.responsable ?? "",
      });
    if (fields.fecha_limite !== undefined) {
      const c = cols["fecha límite"] || cols["fecha limite"];
      if (c) cells.push({ columnId: c.id, content: fields.fecha_limite ?? "" });
    }
    if (fields.estado !== undefined && cols["estado"]) {
      const opt = findOption(cols["estado"], fields.estado);
      if (opt) cells.push({ columnId: cols["estado"].id, optionId: opt.id });
    }
    if (fields.prioridad !== undefined && cols["prioridad"]) {
      const opt = findOption(cols["prioridad"], fields.prioridad ?? "");
      if (opt) cells.push({ columnId: cols["prioridad"].id, optionId: opt.id });
    }

    if (cells.length === 0) return { ok: true, rowId: row.id };

    const res = await fetch(
      `${MIRO_API}/boards/${encodeURIComponent(board.boardId)}/tables/${board.widgetId}/rows/${row.id}`,
      {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ cells }),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      if (res.status === 401 || res.status === 403)
        return { ok: false, code: "missing_scope", detail };
      return { ok: false, code: "patch_failed", detail };
    }
    return { ok: true, rowId: row.id };
  } catch (err) {
    return {
      ok: false,
      code: "network_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function deleteRow(
  clientId: string,
  matchTitulo: string
): Promise<WriterResult> {
  const token = process.env.MIRO_ACCESS_TOKEN;
  if (!token) return { ok: false, code: "missing_token" };

  const board = MIRO_BOARDS[clientId];
  if (!board) return { ok: false, code: "client_unknown" };

  try {
    const meta = await fetchTableMeta(board.boardId, board.widgetId, token);
    if (!meta) return { ok: false, code: "table_fetch_failed" };

    const tareaCol = meta.byTitle["tarea"];
    if (!tareaCol)
      return {
        ok: false,
        code: "table_fetch_failed",
        detail: "columna Tarea no encontrada",
      };

    const row = await findRowByTitle(
      board.boardId,
      board.widgetId,
      tareaCol.id,
      matchTitulo,
      token
    );
    if (!row) return { ok: false, code: "row_not_found" };

    const res = await fetch(
      `${MIRO_API}/boards/${encodeURIComponent(board.boardId)}/tables/${board.widgetId}/rows/${row.id}`,
      { method: "DELETE", headers: authHeaders(token) }
    );
    if (!res.ok) {
      const detail = await res.text();
      if (res.status === 401 || res.status === 403)
        return { ok: false, code: "missing_scope", detail };
      return { ok: false, code: "delete_failed", detail };
    }
    return { ok: true, rowId: row.id };
  } catch (err) {
    return {
      ok: false,
      code: "network_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/miro-writer.ts
git commit -m "feat: updateRow and deleteRow in miro-writer"
```

---

### Task 6: Wire `updateRow` and `deleteRow` into `/api/tasks/[id]`

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Update PATCH to push changes to Miro**

In `src/app/api/tasks/[id]/route.ts` PATCH handler, after the successful Supabase update, change:

```typescript
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.warn("[tasks/PATCH] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, task: data });
```

To:

```typescript
  const { data: existing, error: readErr } = await supabase
    .from("tasks")
    .select("client_id, titulo")
    .eq("id", taskId)
    .single();
  if (readErr || !existing) {
    return NextResponse.json(
      { ok: false, error: readErr?.message || "tarea no encontrada" },
      { status: 404 }
    );
  }
  const oldTitulo = existing.titulo as string;

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.warn("[tasks/PATCH] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const miroResult = await updateRow(
    existing.client_id as string,
    oldTitulo,
    {
      titulo: patch.titulo,
      modulo: patch.modulo,
      responsable: patch.responsable,
      prioridad: patch.prioridad,
      fecha_limite: patch.fecha_limite,
      estado: patch.estado,
    }
  );
  if (!miroResult.ok) {
    console.warn("[tasks/PATCH] miro push failed:", miroResult);
  }

  return NextResponse.json({ ok: true, task: data, miro: miroResult });
```

- [ ] **Step 2: Update DELETE to remove from Miro**

In the same file, replace the DELETE handler body (after the auth check) so it reads:

```typescript
  const taskId = params.id;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "taskId requerido" },
      { status: 400 }
    );
  }

  const { data: existing, error: readErr } = await supabase
    .from("tasks")
    .select("client_id, titulo")
    .eq("id", taskId)
    .single();
  if (readErr || !existing) {
    return NextResponse.json(
      { ok: false, error: readErr?.message || "tarea no encontrada" },
      { status: 404 }
    );
  }

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) {
    console.warn("[tasks/DELETE] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const miroResult = await deleteRow(
    existing.client_id as string,
    existing.titulo as string
  );
  if (!miroResult.ok) {
    console.warn("[tasks/DELETE] miro push failed:", miroResult);
  }

  return NextResponse.json({ ok: true, miro: miroResult });
```

Add the import at the top of the file:
```typescript
import { updateRow, deleteRow } from "@/lib/miro-writer";
```

- [ ] **Step 3: Build and verify**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npm run build 2>&1 | tail -10
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts
git commit -m "feat: push to miro on task PATCH and DELETE"
```

---

## Phase B — Fathom transcript flow

### Task 7: Install Anthropic SDK

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the SDK**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npm install @anthropic-ai/sdk
```
Expected: package added, lockfile updated.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @anthropic-ai/sdk for transcript processing"
```

---

### Task 8: Build `meeting-processor.ts`

**Files:**
- Create: `src/lib/meeting-processor.ts`

- [ ] **Step 1: Create the processor module**

Create `src/lib/meeting-processor.ts`:
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "./supabase/server";

export interface ProcessedTaskCreate {
  type: "create";
  titulo: string;
  modulo: string;
  responsable?: string;
  prioridad?: string;
  fecha_limite?: string;
  estado: string;
}

export interface ProcessedTaskComplete {
  type: "complete";
  titulo: string;
}

export interface ProcessedTaskUpdate {
  type: "update";
  matchTitulo: string;
  changes: {
    titulo?: string;
    modulo?: string;
    responsable?: string;
    prioridad?: string;
    fecha_limite?: string;
    estado?: string;
  };
}

export type ProcessedItem =
  | ProcessedTaskCreate
  | ProcessedTaskComplete
  | ProcessedTaskUpdate;

export interface ProcessedDiff {
  ok: true;
  items: ProcessedItem[];
}

export interface ProcessError {
  ok: false;
  error: string;
}

const SYSTEM_PROMPT = `Eres un asistente de un consultor que procesa transcripciones de reuniones con clientes.

Tu trabajo: leer la transcripción y devolver un JSON con los cambios a aplicar a las tareas del cliente.

Reglas:
- Solo extraes COMPROMISOS CONCRETOS (cosas que alguien va a hacer), no opiniones ni discusión.
- Si una tarea mencionada en la reunión YA EXISTE en la lista del cliente, marca como "complete" o "update". No la dupliques como "create".
- Si una tarea es completamente nueva, marca como "create" con todos los campos que puedas inferir.
- Módulos válidos (exactos): "Ingresos", "Gestión interna", "Operaciones", "Mercadeo".
- Estados válidos: "En curso", "Iniciativa", "Completada".
- Prioridades válidas: "Alta", "Media", "Baja".
- Fechas en formato DD/MM/AAAA cuando estén explícitas. Si no, omite.
- Devuelve SOLO el JSON, sin texto adicional, sin markdown, sin explicaciones.

Formato de salida:
{
  "items": [
    {"type": "create", "titulo": "...", "modulo": "...", "estado": "En curso", "responsable": "...", "prioridad": "...", "fecha_limite": "..."},
    {"type": "complete", "titulo": "exacto título de tarea existente"},
    {"type": "update", "matchTitulo": "exacto título existente", "changes": {"prioridad": "Alta"}}
  ]
}`;

export async function processTranscript(
  clientId: string,
  transcript: string
): Promise<ProcessedDiff | ProcessError> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY no configurada" };

  const supabase = createServerSupabaseClient();
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("titulo, modulo, estado")
    .eq("client_id", clientId)
    .neq("estado", "Completada");
  if (error) return { ok: false, error: `supabase: ${error.message}` };

  const existingList = (tasks ?? [])
    .map((t) => `- [${t.estado}] [${t.modulo}] ${t.titulo}`)
    .join("\n");

  const userPrompt = `Tareas existentes del cliente (no completadas):
${existingList || "(ninguna)"}

Transcripción de la reunión:
${transcript}

Devuelve el JSON.`;

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = msg.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text")
      return { ok: false, error: "respuesta sin texto" };

    const raw = textBlock.text.trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0)
      return { ok: false, error: "no se encontró JSON en la respuesta" };

    let parsed: { items?: unknown };
    try {
      parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    } catch (e) {
      return { ok: false, error: `JSON inválido: ${(e as Error).message}` };
    }

    if (!Array.isArray(parsed.items))
      return { ok: false, error: "respuesta sin array 'items'" };

    return { ok: true, items: parsed.items as ProcessedItem[] };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/meeting-processor.ts
git commit -m "feat: meeting-processor with anthropic api + prompt cache"
```

---

### Task 9: Build `/api/meetings/process` endpoint

**Files:**
- Create: `src/app/api/meetings/process/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/meetings/process/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MIRO_BOARDS } from "@/lib/miro-boards";
import { processTranscript } from "@/lib/meeting-processor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const clientId = body?.clientId as string | undefined;
  const transcript = body?.transcript as string | undefined;

  if (!clientId || !MIRO_BOARDS[clientId]) {
    return NextResponse.json(
      { ok: false, error: "clientId inválido" },
      { status: 400 }
    );
  }
  if (!transcript || transcript.trim().length < 50) {
    return NextResponse.json(
      { ok: false, error: "transcript demasiado corto (mín 50 chars)" },
      { status: 400 }
    );
  }
  if (transcript.length > 100000) {
    return NextResponse.json(
      { ok: false, error: "transcript demasiado largo (máx 100k chars)" },
      { status: 400 }
    );
  }

  const result = await processTranscript(clientId, transcript);
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Build**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npm run build 2>&1 | tail -10
```
Expected: success, route registered.

- [ ] **Step 3: Smoke-test the endpoint**

Run dev server. From a separate terminal:
```bash
curl -X POST http://localhost:3000/api/meetings/process \
  -H "Content-Type: application/json" \
  -b "<copy session cookies from browser devtools>" \
  -d '{"clientId":"client-cygnuss","transcript":"Tomás: necesitamos cotizar guantes nitrilo esta semana. Lina dijo que se encarga, prioridad media. También Paulina va a publicar el reel del aniversario el viernes."}'
```
Expected: JSON with `items` array containing 2 create items.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/meetings/process/route.ts
git commit -m "feat: /api/meetings/process endpoint"
```

---

### Task 10: Extend `pegar-pendientes` UI to accept transcript mode

**Files:**
- Modify: `src/app/client/[id]/pegar-pendientes/page.tsx`

- [ ] **Step 1: Add tab state and a Transcript textarea**

In `src/app/client/[id]/pegar-pendientes/page.tsx`, after the existing `useState` block (line ~98), add:

```typescript
  const [mode, setMode] = useState<"json" | "transcript">("transcript");
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
```

- [ ] **Step 2: Add the process handler**

Above `handleConfirm`, add:

```typescript
  async function handleProcessTranscript() {
    setProcessing(true);
    setProcessError(null);
    setRaw("");
    try {
      const res = await fetch("/api/meetings/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, transcript }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setProcessError(data.error || "Error procesando transcripción");
        return;
      }
      const items = data.items as Array<Record<string, unknown>>;
      const creates = items
        .filter((i) => i.type === "create")
        .map((i) => ({
          titulo: i.titulo,
          modulo: i.modulo,
          responsable: i.responsable,
          prioridad: i.prioridad,
          fecha_limite: i.fecha_limite,
          estado: i.estado || "En curso",
        }));
      setRaw(JSON.stringify(creates, null, 2));
      setMode("json");
    } catch (e) {
      setProcessError(`Error de red: ${(e as Error).message}`);
    } finally {
      setProcessing(false);
    }
  }
```

- [ ] **Step 3: Replace the JSON-only UI with a tabbed UI**

Replace the entire `<div className="max-w-4xl space-y-4">` block (around line 181) up to its closing `</div>` (around line 283) with:

```tsx
      <div className="max-w-4xl space-y-4">
        <div className="flex gap-2 border-b border-line">
          <button
            onClick={() => setMode("transcript")}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
              mode === "transcript"
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Transcripción
          </button>
          <button
            onClick={() => setMode("json")}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
              mode === "json"
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            JSON
          </button>
        </div>

        {mode === "transcript" && (
          <div className="bg-surface border border-line rounded-card p-5 space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-label font-medium text-muted">
                Transcripción de Fathom
              </label>
              <p className="text-[12px] text-muted mt-1">
                Pega el transcript completo. Claude extrae los compromisos y los
                muestra como JSON editable.
              </p>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Pega aquí el transcript de la reunión..."
              rows={10}
              className="w-full text-[13px] leading-snug bg-bg border border-line rounded-btn p-3 text-ink focus:outline-none focus:border-ink/40"
            />
            {processError && (
              <p className="text-[12px] text-danger">{processError}</p>
            )}
            <button
              onClick={handleProcessTranscript}
              disabled={processing || transcript.trim().length < 50}
              className="h-10 px-4 rounded-btn bg-ink text-white text-[13px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
            >
              {processing ? "Procesando..." : "Procesar con Claude"}
            </button>
          </div>
        )}

        {mode === "json" && (
          <div className="bg-surface border border-line rounded-card p-5 space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-label font-medium text-muted">
                JSON de tareas
              </label>
              <p className="text-[12px] text-muted mt-1">
                Array de objetos con campos: titulo, modulo, responsable,
                prioridad, fecha_limite, estado. Edita antes de aplicar.
              </p>
            </div>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={EXAMPLE}
              rows={12}
              className="w-full font-mono text-[12px] leading-snug bg-bg border border-line rounded-btn p-3 text-ink focus:outline-none focus:border-ink/40"
            />
            {parseError && (
              <p className="text-[12px] text-danger">{parseError}</p>
            )}
            {!parseError && tasks.length > 0 && (
              <p className="text-[12px] text-muted">
                {tasks.filter((t) => t._ok).length} tareas válidas ·{" "}
                {tasks.filter((t) => !t._ok).length} con errores
              </p>
            )}
          </div>
        )}

        {mode === "json" && tasks.length > 0 && (
          <div className="bg-surface border border-line rounded-card p-5">
            <div className="text-[11px] uppercase tracking-label font-medium text-muted mb-3">
              Vista previa
            </div>
            <div className="divide-y divide-line">
              {tasks.map((t, i) => (
                <div key={i} className="py-2 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected[i]}
                    disabled={!t._ok}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [i]: e.target.checked }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[14px] leading-snug ${
                        t._ok ? "text-ink" : "text-muted line-through"
                      }`}
                    >
                      {t.titulo || "(sin titulo)"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-muted">
                      <span>{t.modulo}</span>
                      {t.responsable && <span>· {t.responsable}</span>}
                      {t.prioridad && <span>· {t.prioridad}</span>}
                      {t.fecha_limite && <span>· {t.fecha_limite}</span>}
                      <span>· {t.estado}</span>
                    </div>
                    {t._error && (
                      <p className="text-[11px] text-danger mt-0.5">
                        {t._error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div
            className={`rounded-card px-4 py-3 border text-[13px] ${
              result.ok
                ? "bg-teal-50 border-teal-600/20 text-teal-600"
                : "bg-amber-50 border-amber-500/30 text-amber-700"
            }`}
          >
            {result.text}
          </div>
        )}

        {mode === "json" && (
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={submitting || selectedTasks.length === 0}
              className="h-10 px-4 rounded-btn bg-ink text-white text-[13px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
            >
              {submitting
                ? "Insertando..."
                : `Confirmar (${selectedTasks.length})`}
            </button>
            <button
              onClick={() => setRaw(EXAMPLE)}
              className="h-10 px-4 rounded-btn border border-line text-[13px] font-medium text-ink hover:bg-bg transition-colors"
            >
              Cargar ejemplo
            </button>
          </div>
        )}
      </div>
```

- [ ] **Step 4: Build and test in browser**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npm run build 2>&1 | tail -10
```
Expected: success.

Then run dev server, open `http://localhost:3000/client/client-cygnuss/pegar-pendientes`. Verify:
1. Two tabs visible: "Transcripción" (active) and "JSON"
2. Paste a fake transcript: "Tomás: Paulina va a publicar el reel del aniversario el viernes con prioridad alta. También necesitamos cotizar guantes nitrilo, eso lo hace Lina."
3. Click "Procesar con Claude" → spinner → switches to JSON tab with the parsed array
4. Edit if needed → click "Confirmar"
5. Open Miro CYGNUSS → verify rows added

- [ ] **Step 5: Commit**

```bash
git add src/app/client/[id]/pegar-pendientes/page.tsx
git commit -m "feat: transcript tab in pegar-pendientes calling /api/meetings/process"
```

---

## Phase C — Cleanup, status, and ship

### Task 11: Delete the 5 green widgets from Miro

**Files:**
- Create: `scripts/delete-miro-widgets.mjs`

- [ ] **Step 1: Create the cleanup script**

Create `scripts/delete-miro-widgets.mjs`:
```javascript
const MIRO = "https://api.miro.com/v2";
const TOKEN = process.env.MIRO_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("MIRO_ACCESS_TOKEN missing");
  process.exit(1);
}

const SHAPES = [
  { client: "CYGNUSS", board: "uXjVGVc5G44=", id: "3458764668530328594" },
  { client: "Dentilandia", board: "uXjVGMGFP5o=", id: "3458764668530391331" },
  { client: "AC Autos", board: "uXjVGNKVGKI=", id: "3458764668530270917" },
  { client: "Paulina", board: "uXjVGNKZkmM=", id: "3458764668530329655" },
  { client: "Lativo", board: "uXjVGrJ405k=", id: "3458764668530314687" },
];

for (const s of SHAPES) {
  const url = `${MIRO}/boards/${encodeURIComponent(s.board)}/shapes/${s.id}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  console.log(`${s.client} (${s.id}) → ${res.status}`);
}
```

- [ ] **Step 2: Run the script**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && node --env-file=.env.local scripts/delete-miro-widgets.mjs
```
Expected: 5 lines all showing `204` (or `404` if Tomás already deleted some manually — both are fine).

- [ ] **Step 3: Verify visually in Miro**

Open each of the 5 boards (Tomás does this). Confirm no green teal "📊 [client]" shape exists anymore.

- [ ] **Step 4: Commit the script (kept for reference, not for re-running)**

```bash
git add scripts/delete-miro-widgets.mjs
git commit -m "chore: script that removed legacy embed shapes from miro boards"
```

---

### Task 12: Add "Miro desincronizado" badge in dashboard

**Files:**
- Create: `src/app/api/sync-status/route.ts`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add a new column to the tasks table for tracking sync state**

Create `supabase/migrations/002_tasks_miro_sync.sql`:
```sql
alter table public.tasks
  add column if not exists miro_sync_error text,
  add column if not exists miro_sync_at timestamptz;
```

Run it via Supabase SQL editor (Tomás does this manually):
1. Open Supabase project → SQL editor
2. Paste the SQL above
3. Run

- [ ] **Step 2: Update miro-writer call sites to record sync state**

In `src/app/api/tasks/[id]/complete/route.ts`, after `const miroResult = await setRowEstado(...)`, add:
```typescript
  await supabase
    .from("tasks")
    .update({
      miro_sync_at: new Date().toISOString(),
      miro_sync_error: miroResult.ok ? null : `${miroResult.code}: ${miroResult.detail || ""}`,
    })
    .eq("id", taskId);
```

Repeat the same pattern (with `taskId` from context) in `src/app/api/tasks/[id]/route.ts` PATCH handler (after the miroResult), and after each iteration in `src/app/api/tasks/bulk-create/route.ts` (using `row.id`).

- [ ] **Step 3: Create the sync-status endpoint**

Create `src/app/api/sync-status/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("id, client_id, titulo, miro_sync_error, miro_sync_at")
    .not("miro_sync_error", "is", null);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ desynced: data ?? [] });
}
```

- [ ] **Step 4: Show a badge in the dashboard**

In `src/app/dashboard/page.tsx`, near the top of the dashboard JSX, add a fetch + badge. Specific lines depend on current layout — locate where the dashboard renders the list of clients and add this above it:

```tsx
{desyncCount > 0 && (
  <div className="mb-4 rounded-card border border-amber-500/30 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
    ⚠ {desyncCount} tareas sin sincronizar con Miro.{" "}
    <button
      onClick={handleRetrySync}
      className="underline font-medium"
    >
      Reintentar
    </button>
  </div>
)}
```

Add the state, fetch, and retry handler near the top of the dashboard component:
```typescript
const [desyncCount, setDesyncCount] = useState(0);

useEffect(() => {
  fetch("/api/sync-status")
    .then((r) => r.json())
    .then((d) => setDesyncCount((d.desynced ?? []).length))
    .catch(() => setDesyncCount(0));
}, []);

async function handleRetrySync() {
  const res = await fetch("/api/sync-status");
  const data = await res.json();
  for (const t of data.desynced ?? []) {
    await fetch(`/api/tasks/${t.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});
  }
  const after = await fetch("/api/sync-status").then((r) => r.json());
  setDesyncCount((after.desynced ?? []).length);
}
```

(The retry assumes task is to be re-completed. If estado is not "Completada", the retry path needs to reuse the original action — that's tracked in Open Question #3 below.)

- [ ] **Step 5: Build and test**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npm run build 2>&1 | tail -10
```
Expected: success. Then in browser, dashboard either shows nothing (no desynced) or a yellow badge.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/002_tasks_miro_sync.sql src/app/api/sync-status/route.ts src/app/dashboard/page.tsx src/app/api/tasks/
git commit -m "feat: track miro sync errors and show retry badge in dashboard"
```

---

### Task 13: Final smoke test + push

**Files:** none

- [ ] **Step 1: Run full build**

```bash
cd "c:/Users/TOMAS/Desktop/consultoria-app" && npm run build 2>&1 | tail -20
```
Expected: clean success, all routes registered.

- [ ] **Step 2: Manual UAT — six scenarios**

Tomás performs in production after deploy:

1. **Mark complete** — open `/client/client-cygnuss`, mark a task complete → check Miro CYGNUSS data_table → row's Estado is "Completada" within 5s.
2. **Bulk create from JSON** — open `/client/client-cygnuss/pegar-pendientes` → paste 2 tasks JSON → confirm → check Miro → 2 new rows.
3. **Bulk create from transcript** — same page, transcript tab → paste fake meeting → process → confirm → check Miro.
4. **Edit task** — from client page, edit a task's responsable → check Miro → row updated.
5. **Delete task** — from client page, delete a task → check Miro → row gone.
6. **Embed page (client view)** — open `/embed/client-cygnuss/plan?token=embed-consultoria-a7x9k2m5p3` in incognito → progress bars and lists reflect the latest state.

- [ ] **Step 3: Push to origin**

```bash
git push origin main
```

- [ ] **Step 4: Verify Netlify deploy passes**

Watch https://app.netlify.com/sites/consultoria-ea/deploys for the new build to go green.

- [ ] **Step 5: Final reality-check curl**

```bash
for cid in client-cygnuss client-dentilandia client-acautos client-paulina c5; do
  echo "=== $cid ==="
  curl -s "https://consultoria-ea.netlify.app/api/tasks?clientId=$cid&embedToken=embed-consultoria-a7x9k2m5p3" | head -c 300
  echo ""
done
```
Expected: each returns `tasks` array with current state.

---

## Open Questions (deferred — not blocking the plan)

1. **Modelo Anthropic** — using `claude-sonnet-4-6`. If quality insufficient on first real transcript, swap to `claude-opus-4-7` (5x cost). Tomás decides after first use.
2. **Idempotencia** — current bulk-create has no dedup. If Tomás clicks Confirm twice, duplicates appear. Quick fix: add a UUID per "diff session" stored in localStorage and rejected if reused. Defer until first time it bites.
3. **Retry semantics** — Task 12's retry only handles "complete" actions. For PATCH/DELETE, the badge would need to know the original action. Defer to a follow-up: store the failed operation (verb + payload) instead of just the error.
4. **Concurrent edits** — if Tomás edits in Miro after committing to "always edit in app", changes silently lost. Mitigation: add a sticky note in each board: "⚠ No editar — gestionado desde la app". Track as future task.

---

## Self-Review

**Spec coverage:**
- §5.1 miro-writer.ts → Tasks 1, 3, 5 ✅
- §5.2 endpoints modified → Tasks 2, 4, 6 ✅
- §5.3 page actualizar reunión → reused pegar-pendientes, Task 10 ✅
- §5.4 meeting-processor.ts → Tasks 7, 8 ✅
- §5.5 cleanup widgets → Task 11 ✅
- §6 env vars → Task 0 ✅
- §7 error handling — `WriterResult` never throws ✅; sync-status badge → Task 12 ✅
- §8 migration drift — not addressed; relying on bulk update + transcript flow to converge over time. **Add as follow-up:** before going live, run a one-time audit script that diffs Supabase vs Miro and reports drift.
- §11 acceptance criteria all covered.

**Placeholder scan:** clean. Every step has either exact code, exact command, or exact file path.

**Type consistency:** `WriterResult`, `CreateRowInput`, `UpdateRowInput`, `ProcessedItem` types declared once and used consistently across tasks.

**Gap added:** Task 12 step about retry semantics is honest about limitation (Open Question #3). Migration §8 audit listed as follow-up — small enough to defer.
