# Plan de implementación: Edición de tareas desde embed dentro de Miro

> **Para agentes:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan task-by-task. Los steps usan checkbox (`- [ ]`) para tracking.

**Goal:** Agregar capacidad de edición (completar / cambiar estado / cambiar responsable / crear / borrar) al embed `/embed/[clientId]/plan` dentro de Miro, sin requerir login del usuario.

**Architecture:** Endpoints de Next.js modifican su capa de auth para aceptar `embedToken` como segunda forma de autorización (además de la sesión Supabase existente). Cuando se autoriza vía token, el endpoint usa el cliente `service_role` de Supabase para bypassar RLS. El frontend se refactoriza con sub-componentes y optimistic updates.

**Tech Stack:** Next.js 14 (app router), React 18, TypeScript, Supabase (postgres + RLS), Vitest (solo para `auth-embed.ts`).

**Decisión sobre testing (deliberada):**
- TDD estricto para `auth-embed.ts` (seguridad crítica, fácilmente unit-testable)
- Tests de aceptación con `curl` para endpoints (valida auth + comportamiento real contra Supabase)
- Manual testing protocol para componentes React según spec (sin RTL)
- Esta decisión balancea rigor con tiempo. Si en el futuro se quiere ampliar a TDD puro, vitest queda configurado y se puede extender.

**Spec referenciada:** `docs/superpowers/specs/2026-04-30-embed-edicion-tareas-design.md`

---

## File Structure

### Archivos nuevos
| Path | Responsabilidad |
|---|---|
| `src/lib/auth-embed.ts` | Función `checkAuth(req)` — valida sesión Supabase OR embedToken |
| `src/lib/supabase/admin.ts` | Factory de cliente Supabase con `service_role` (server-only) |
| `src/lib/auth-embed.test.ts` | Unit tests de `checkAuth` |
| `vitest.config.ts` | Configuración vitest |
| `src/app/api/tasks/responsables/route.ts` | GET endpoint para autocomplete |
| `src/app/embed/[clientId]/plan/components/TaskRow.tsx` | Una fila de tarea con checkbox + menú ⋯ |
| `src/app/embed/[clientId]/plan/components/TaskMenu.tsx` | Menú flotante con cambiar estado/responsable/borrar |
| `src/app/embed/[clientId]/plan/components/ResponsableAutocomplete.tsx` | Input con autocomplete |
| `src/app/embed/[clientId]/plan/components/NewTaskInline.tsx` | Form inline para crear tarea |
| `src/app/embed/[clientId]/plan/components/DeleteConfirmModal.tsx` | Modal "¿Borrar?" |
| `src/app/embed/[clientId]/plan/lib/embed-api.ts` | Helpers `fetch` para writes desde el embed (incluye token en URL) |
| `scripts/test-endpoints.sh` | Bash script con curl para tests de aceptación |

### Archivos modificados
| Path | Cambio |
|---|---|
| `package.json` | Agregar deps `vitest`, `@types/node`, scripts `test`, `test:watch` |
| `src/app/api/tasks/[id]/complete/route.ts` | Reemplazar auth check por `checkAuth()`. Si `via:'token'`, usar admin client. |
| `src/app/api/tasks/[id]/route.ts` | Idem para PATCH. Agregar nuevo handler DELETE. |
| `src/app/api/tasks/bulk-create/route.ts` | Idem para POST. |
| `src/app/embed/[clientId]/plan/EmbedPlanClient.tsx` | Refactor: extraer TaskRow, agregar state para edits, optimistic updates, banner de errores |

### Pre-flight (Tomás manual)
- Netlify env vars: agregar `SUPABASE_SERVICE_ROLE_KEY` (copiar desde Supabase dashboard)
- Netlify env vars: confirmar que `EMBED_SECRET=embed-consultoria-a7x9k2m5p3` está configurado

---

## Pre-flight: Configuración (Tomás)

### Pre-flight 1: Agregar `SUPABASE_SERVICE_ROLE_KEY` a Netlify

- [ ] **Step 1:** Abrir https://supabase.com/dashboard/project/gbulutnlacwjzqsrxoku/settings/api
- [ ] **Step 2:** Copiar el valor de la sección **"service_role"** (NO el anon key — el otro que dice "secret"). Es un JWT largo.
- [ ] **Step 3:** Abrir https://app.netlify.com → buscar el sitio `consultoria-ea` → Site settings → Environment variables → Add variable
- [ ] **Step 4:** Key: `SUPABASE_SERVICE_ROLE_KEY` · Value: pegar el JWT copiado en Step 2 · Scopes: All
- [ ] **Step 5:** Save

### Pre-flight 2: Verificar `EMBED_SECRET` en Netlify

- [ ] **Step 1:** En la misma página de Environment variables, confirmar que existe `EMBED_SECRET` con valor `embed-consultoria-a7x9k2m5p3`
- [ ] **Step 2:** Si no existe, agregarla con esos valores

⚠️ **Crítico:** ambas vars deben estar configuradas ANTES de que el plan avance. Sin ellas, los endpoints van a fallar en producción aunque el código esté correcto.

---

## Tasks

### Task 0: Configurar Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest @vitest/ui @types/node
```

Expected: agregadas en `devDependencies`. Lockfile actualizado.

- [ ] **Step 2: Crear `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Agregar scripts en `package.json`**

Modificar la sección `scripts`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Verificar que vitest corre (sin tests todavía)**

Run: `npm test`
Expected: `No test files found, exiting with code 0` o similar. NO debe explotar.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: setup vitest for unit testing"
```

---

### Task 1: TDD `auth-embed.ts` — función `checkAuth`

**Files:**
- Create: `src/lib/auth-embed.ts`
- Create: `src/lib/auth-embed.test.ts`

- [ ] **Step 1: Escribir tests fallidos primero**

Crear `src/lib/auth-embed.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { checkAuth } from "./auth-embed";

// Mock createServerSupabaseClient
const mockGetUser = vi.fn();
vi.mock("./supabase/server", () => ({
  createServerSupabaseClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// Mock getEmbedSecret
vi.mock("./supabase-env", () => ({
  getEmbedSecret: () => "test-secret-123",
}));

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url));
}

describe("checkAuth", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  it("autoriza con sesión Supabase válida", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const req = makeRequest("https://x/api/tasks/abc");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: true, via: "session" });
  });

  it("autoriza con embedToken válido en query", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest("https://x/api/tasks/abc?embedToken=test-secret-123");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: true, via: "token" });
  });

  it("rechaza si no hay sesión ni token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest("https://x/api/tasks/abc");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: false });
  });

  it("rechaza si embedToken es incorrecto", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest("https://x/api/tasks/abc?embedToken=wrong");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: false });
  });

  it("prioriza sesión sobre token (si ambos son válidos)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const req = makeRequest("https://x/api/tasks/abc?embedToken=test-secret-123");
    const result = await checkAuth(req);
    expect(result).toEqual({ ok: true, via: "session" });
  });
});
```

- [ ] **Step 2: Correr tests para verificar que fallan**

Run: `npm test`
Expected: 5 tests, 5 failed (porque `checkAuth` no existe todavía).

- [ ] **Step 3: Implementar `checkAuth` mínimamente**

Crear `src/lib/auth-embed.ts`:

```typescript
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "./supabase/server";
import { getEmbedSecret } from "./supabase-env";

export type AuthResult =
  | { ok: true; via: "session" | "token" }
  | { ok: false };

export async function checkAuth(req: NextRequest): Promise<AuthResult> {
  // 1. Intentar sesión Supabase
  const ssr = createServerSupabaseClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (user) return { ok: true, via: "session" };

  // 2. Intentar embedToken (URL param)
  const urlToken = req.nextUrl.searchParams.get("embedToken");
  const expected = getEmbedSecret();
  if (urlToken && urlToken === expected) {
    return { ok: true, via: "token" };
  }

  return { ok: false };
}
```

- [ ] **Step 4: Correr tests para verificar que pasan**

Run: `npm test`
Expected: 5 tests, 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-embed.ts src/lib/auth-embed.test.ts
git commit -m "feat(auth): checkAuth function for session OR embedToken"
```

---

### Task 2: Crear cliente Supabase admin (`service_role`)

**Files:**
- Create: `src/lib/supabase/admin.ts`

- [ ] **Step 1: Implementar el factory**

Crear `src/lib/supabase/admin.ts`:

```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "../supabase-env";

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase con service_role.
 * Bypassa RLS — usar SOLO en server endpoints después de validar auth.
 * NUNCA exponer en código que corra en el cliente.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const { url } = getSupabaseServerConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no configurado. Agregalo en .env.local y Netlify env vars."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
```

- [ ] **Step 2: Verificar que el build TypeScript pasa**

Run: `npm run build`
Expected: build OK, sin errores de tipos.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/admin.ts
git commit -m "feat(supabase): admin client with service_role (server-only)"
```

---

### Task 3: Modificar endpoint `complete` (POST /api/tasks/:id/complete)

**Files:**
- Modify: `src/app/api/tasks/[id]/complete/route.ts`

- [ ] **Step 1: Reemplazar el handler completo**

Reemplazar el contenido de `src/app/api/tasks/[id]/complete/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkAuth } from "@/lib/auth-embed";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const taskId = params.id;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "taskId requerido" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const completedBy = (body?.completedBy as string | undefined) ?? null;

  // Si auth via session, usar cliente con sesión (RLS aplica).
  // Si via token, usar admin client (bypassa RLS, ya validamos token).
  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const { data, error } = await supabase
    .from("tasks")
    .update({
      estado: "Completada",
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.warn("[tasks/complete] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, task: data });
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/[id]/complete/route.ts
git commit -m "feat(api): complete endpoint accepts embedToken auth"
```

---

### Task 4: Modificar endpoint PATCH (`/api/tasks/:id`)

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Reemplazar bloque de auth en handler PATCH**

En `src/app/api/tasks/[id]/route.ts`, reemplazar las líneas que dicen:

```typescript
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
```

por:

```typescript
const auth = await checkAuth(request);
if (!auth.ok) {
  return NextResponse.json(
    { ok: false, error: "No autorizado" },
    { status: 401 }
  );
}
const supabase =
  auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();
```

Y agregar imports al tope del archivo:

```typescript
import { checkAuth } from "@/lib/auth-embed";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts
git commit -m "feat(api): PATCH endpoint accepts embedToken auth"
```

---

### Task 5: Agregar handler DELETE (`/api/tasks/:id`)

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Agregar handler DELETE al final del archivo**

Agregar (después del handler PATCH existente):

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const taskId = params.id;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "taskId requerido" },
      { status: 400 }
    );
  }

  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    console.warn("[tasks/delete] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts
git commit -m "feat(api): DELETE endpoint with embedToken auth"
```

---

### Task 6: Modificar endpoint `bulk-create`

**Files:**
- Modify: `src/app/api/tasks/bulk-create/route.ts`

- [ ] **Step 1: Reemplazar bloque de auth (mismo patrón que Task 4)**

Buscar el bloque que llama a `supabase.auth.getUser()` y reemplazarlo por la lógica de `checkAuth` + selección de cliente, igual que en Task 4.

Imports a agregar al tope:

```typescript
import { checkAuth } from "@/lib/auth-embed";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
```

Reemplazar el patrón:

```typescript
const supabase = createServerSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
```

por:

```typescript
const auth = await checkAuth(request);
if (!auth.ok) {
  return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
}
const supabase =
  auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/bulk-create/route.ts
git commit -m "feat(api): bulk-create endpoint accepts embedToken auth"
```

---

### Task 7: Crear endpoint GET `/api/tasks/responsables`

**Files:**
- Create: `src/app/api/tasks/responsables/route.ts`

- [ ] **Step 1: Implementar el endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth-embed";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "clientId requerido" },
      { status: 400 }
    );
  }

  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const { data, error } = await supabase
    .from("tasks")
    .select("responsable")
    .eq("client_id", clientId)
    .not("responsable", "is", null);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  // Distinct + sort
  const set = new Set<string>();
  (data || []).forEach((r) => {
    const v = (r.responsable || "").trim();
    if (v) set.add(v);
  });
  const responsables = [...set].sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ ok: true, responsables });
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/responsables/route.ts
git commit -m "feat(api): responsables autocomplete endpoint"
```

---

### Task 8: Tests de aceptación con curl (script bash)

**Files:**
- Create: `scripts/test-endpoints.sh`

- [ ] **Step 1: Escribir el script de tests**

```bash
#!/usr/bin/env bash
# Tests de aceptación contra producción.
# Asume que la app está deployada en consultoria-ea.netlify.app
# y que SUPABASE_SERVICE_ROLE_KEY + EMBED_SECRET están configurados en Netlify.

set -e

BASE="https://consultoria-ea.netlify.app"
TOKEN="embed-consultoria-a7x9k2m5p3"
BAD_TOKEN="hackerman-token-fake"
CLIENT_ID="client-dentilandia"

echo "===> Test 1: GET /api/tasks sin token → 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tasks?clientId=$CLIENT_ID")
[ "$STATUS" = "401" ] && echo "  ✓ 401 OK" || { echo "  ✗ esperaba 401, recibí $STATUS"; exit 1; }

echo "===> Test 2: GET /api/tasks con token válido → 200"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tasks?clientId=$CLIENT_ID&embedToken=$TOKEN")
[ "$STATUS" = "200" ] && echo "  ✓ 200 OK" || { echo "  ✗ esperaba 200, recibí $STATUS"; exit 1; }

echo "===> Test 3: GET /api/tasks/responsables con token → 200 + lista no vacía"
RESP=$(curl -s "$BASE/api/tasks/responsables?clientId=$CLIENT_ID&embedToken=$TOKEN")
echo "  → $RESP" | head -c 200
echo
echo "$RESP" | grep -q '"responsables":\[' && echo "  ✓ formato OK" || { echo "  ✗ formato inesperado"; exit 1; }

echo "===> Test 4: POST /api/tasks/:id/complete sin token → 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/00000000-0000-0000-0000-000000000000/complete")
[ "$STATUS" = "401" ] && echo "  ✓ 401 OK" || { echo "  ✗ esperaba 401, recibí $STATUS"; exit 1; }

echo "===> Test 5: POST /api/tasks/:id/complete con token incorrecto → 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/00000000-0000-0000-0000-000000000000/complete?embedToken=$BAD_TOKEN")
[ "$STATUS" = "401" ] && echo "  ✓ 401 OK" || { echo "  ✗ esperaba 401, recibí $STATUS"; exit 1; }

echo "===> Test 6: DELETE sin token → 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/tasks/00000000-0000-0000-0000-000000000000")
[ "$STATUS" = "401" ] && echo "  ✓ 401 OK" || { echo "  ✗ esperaba 401, recibí $STATUS"; exit 1; }

echo
echo "===> Todos los tests de aceptación pasaron ✓"
```

- [ ] **Step 2: Hacer ejecutable**

Run: `chmod +x scripts/test-endpoints.sh`

- [ ] **Step 3: Commit**

```bash
git add scripts/test-endpoints.sh
git commit -m "test: acceptance tests for tasks endpoints (curl)"
```

⚠️ **Importante:** este script se corre DESPUÉS de cada deploy a Netlify, no antes. Es validación post-deploy.

---

### Task 9: Helper de fetch para writes desde el embed

**Files:**
- Create: `src/app/embed/[clientId]/plan/lib/embed-api.ts`

- [ ] **Step 1: Implementar helpers**

```typescript
const API_BASE = "/api/tasks";

interface ApiOptions {
  token: string;
  clientId: string;
}

export async function completeTask(
  taskId: string,
  opts: ApiOptions
): Promise<void> {
  const url = `${API_BASE}/${encodeURIComponent(taskId)}/complete?embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error((await res.json()).error || "Error completando tarea");
}

export async function patchTask(
  taskId: string,
  patch: { estado?: string; responsable?: string | null },
  opts: ApiOptions
): Promise<void> {
  const url = `${API_BASE}/${encodeURIComponent(taskId)}?embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error actualizando tarea");
}

export async function deleteTask(
  taskId: string,
  opts: ApiOptions
): Promise<void> {
  const url = `${API_BASE}/${encodeURIComponent(taskId)}?embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error || "Error borrando tarea");
}

export async function createTask(
  task: { titulo: string; modulo: string; clientId: string },
  opts: ApiOptions
): Promise<{ id: string }> {
  const url = `${API_BASE}/bulk-create?embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks: [task] }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error creando tarea");
  const data = await res.json();
  return data.created?.[0] || data;
}

export async function fetchResponsables(opts: ApiOptions): Promise<string[]> {
  const url = `${API_BASE}/responsables?clientId=${encodeURIComponent(opts.clientId)}&embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.responsables || [];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/embed/[clientId]/plan/lib/embed-api.ts
git commit -m "feat(embed): API helpers for write operations"
```

---

### Task 10: Componente `DeleteConfirmModal`

**Files:**
- Create: `src/app/embed/[clientId]/plan/components/DeleteConfirmModal.tsx`

- [ ] **Step 1: Implementar el modal**

```typescript
"use client";

interface Props {
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}

export function DeleteConfirmModal({ taskTitle, onConfirm, onCancel, pending }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div className="bg-white rounded-card border border-line p-4 w-full max-w-sm shadow-lg">
        <p className="text-[13px] font-medium text-ink">¿Borrar esta tarea?</p>
        <p className="text-[12px] text-muted mt-2 italic">"{taskTitle}"</p>
        <p className="text-[11px] text-muted mt-2">Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-3 py-1.5 text-[12px] text-muted border border-line rounded-chip hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="px-3 py-1.5 text-[12px] bg-red-600 text-white rounded-chip hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Borrando..." : "Borrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/embed/[clientId]/plan/components/DeleteConfirmModal.tsx
git commit -m "feat(embed): DeleteConfirmModal component"
```

---

### Task 11: Componente `ResponsableAutocomplete`

**Files:**
- Create: `src/app/embed/[clientId]/plan/components/ResponsableAutocomplete.tsx`

- [ ] **Step 1: Implementar**

```typescript
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  onCancel: () => void;
}

export function ResponsableAutocomplete({ value, suggestions, onChange, onCancel }: Props) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [onCancel]);

  const filtered = useMemo(() => {
    const q = draft.toLowerCase().trim();
    if (!q) return suggestions.slice(0, 5);
    return suggestions
      .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, 5);
  }, [draft, suggestions]);

  function commit(val: string) {
    if (val.trim()) onChange(val.trim());
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={draft}
        autoFocus
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") onCancel();
        }}
        onFocus={() => setOpen(true)}
        className="w-full text-[12px] px-2 py-1 border border-line rounded-chip outline-none focus:border-teal-600"
        placeholder="Responsable..."
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-line rounded-card shadow-lg z-10 max-h-40 overflow-auto">
          {filtered.map((s) => (
            <li
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(s);
              }}
              className="px-2 py-1.5 text-[12px] hover:bg-gray-50 cursor-pointer"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/embed/[clientId]/plan/components/ResponsableAutocomplete.tsx
git commit -m "feat(embed): ResponsableAutocomplete component"
```

---

### Task 12: Componente `TaskMenu` (menú flotante ⋯)

**Files:**
- Create: `src/app/embed/[clientId]/plan/components/TaskMenu.tsx`

- [ ] **Step 1: Implementar**

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { ResponsableAutocomplete } from "./ResponsableAutocomplete";

interface Props {
  estado: string;
  responsable: string | null;
  responsableSuggestions: string[];
  onChangeEstado: (estado: string) => void;
  onChangeResponsable: (resp: string) => void;
  onDeleteRequest: () => void;
  onClose: () => void;
}

const ESTADOS = ["En curso", "Iniciativa"];

export function TaskMenu({
  estado,
  responsable,
  responsableSuggestions,
  onChangeEstado,
  onChangeResponsable,
  onDeleteRequest,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [editingResp, setEditingResp] = useState(false);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 bg-white border border-line rounded-card shadow-lg z-20 w-56 p-2"
    >
      <div className="space-y-2">
        {/* Estado */}
        <div>
          <label className="text-[10px] uppercase tracking-label text-muted">Estado</label>
          <select
            value={estado}
            onChange={(e) => {
              onChangeEstado(e.target.value);
              onClose();
            }}
            className="w-full text-[12px] px-2 py-1 border border-line rounded-chip outline-none mt-1"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        {/* Responsable */}
        <div>
          <label className="text-[10px] uppercase tracking-label text-muted">Responsable</label>
          {editingResp ? (
            <ResponsableAutocomplete
              value={responsable || ""}
              suggestions={responsableSuggestions}
              onChange={(v) => {
                onChangeResponsable(v);
                setEditingResp(false);
                onClose();
              }}
              onCancel={() => setEditingResp(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingResp(true)}
              className="w-full text-left text-[12px] px-2 py-1 border border-line rounded-chip hover:bg-gray-50"
            >
              {responsable || "(sin asignar)"}
            </button>
          )}
        </div>

        {/* Borrar */}
        <button
          type="button"
          onClick={() => {
            onDeleteRequest();
            onClose();
          }}
          className="w-full text-left text-[12px] px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-chip flex items-center gap-2"
        >
          <span>🗑️</span>
          <span>Borrar tarea</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/embed/[clientId]/plan/components/TaskMenu.tsx
git commit -m "feat(embed): TaskMenu floating menu"
```

---

### Task 13: Componente `TaskRow`

**Files:**
- Create: `src/app/embed/[clientId]/plan/components/TaskRow.tsx`

- [ ] **Step 1: Implementar**

```typescript
"use client";

import { useState } from "react";
import { MiroTask } from "@/lib/types";
import { TaskMenu } from "./TaskMenu";

interface Props {
  task: MiroTask;
  pending?: boolean;
  responsableSuggestions: string[];
  onComplete: () => void;
  onChangeEstado: (estado: string) => void;
  onChangeResponsable: (resp: string) => void;
  onDeleteRequest: () => void;
}

function priorityTone(prioridad: string | undefined): string | null {
  if (!prioridad) return null;
  if (prioridad === "Inmediato") return "bg-red-50 text-red-700 border-red-100";
  if (prioridad === "Alta") return "bg-amber-50 text-amber-700 border-amber-100";
  return null;
}

export function TaskRow({
  task,
  pending,
  responsableSuggestions,
  onComplete,
  onChangeEstado,
  onChangeResponsable,
  onDeleteRequest,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tone = priorityTone(task.prioridad);

  return (
    <li className="flex items-start gap-2 text-[12px] leading-snug py-1 px-1 -mx-1 rounded hover:bg-gray-50/50 group">
      {/* Checkbox */}
      <button
        type="button"
        onClick={onComplete}
        disabled={pending}
        aria-label="Completar tarea"
        className="mt-0.5 w-4 h-4 rounded border border-line hover:border-teal-600 flex items-center justify-center disabled:opacity-50 shrink-0"
      >
        {pending && <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />}
      </button>

      {/* Cuerpo de la tarea */}
      <div className="min-w-0 flex-1">
        <p className="text-ink">{task.titulo}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted mt-0.5">
          {task.responsable && <span>{task.responsable}</span>}
          {task.fecha && task.fecha !== "Por definir" && (
            <span className="tabular-nums">· {task.fecha}</span>
          )}
          {tone && task.prioridad && (
            <span className={`inline-flex items-center px-1.5 py-[1px] rounded-chip border text-[10px] font-medium ${tone}`}>
              {task.prioridad}
            </span>
          )}
        </div>
      </div>

      {/* Menú ⋯ */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Más opciones"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-1.5 py-0.5 text-muted hover:text-ink rounded shrink-0"
        >
          ⋯
        </button>
        {menuOpen && (
          <TaskMenu
            estado={task.estado}
            responsable={task.responsable || null}
            responsableSuggestions={responsableSuggestions}
            onChangeEstado={onChangeEstado}
            onChangeResponsable={onChangeResponsable}
            onDeleteRequest={onDeleteRequest}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </li>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/embed/[clientId]/plan/components/TaskRow.tsx
git commit -m "feat(embed): TaskRow component with checkbox and menu"
```

---

### Task 14: Componente `NewTaskInline` (form de crear)

**Files:**
- Create: `src/app/embed/[clientId]/plan/components/NewTaskInline.tsx`

- [ ] **Step 1: Implementar**

```typescript
"use client";

import { useState } from "react";

const MODULOS = ["Gestión interna", "Operaciones", "Mercadeo", "Ingresos"];

interface Props {
  defaultModulo: string;
  onCreate: (data: { titulo: string; modulo: string }) => Promise<void>;
  onCancel: () => void;
}

export function NewTaskInline({ defaultModulo, onCreate, onCancel }: Props) {
  const [titulo, setTitulo] = useState("");
  const [modulo, setModulo] = useState(defaultModulo);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      setError("El título es obligatorio");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onCreate({ titulo: titulo.trim(), modulo });
      setTitulo("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50/80 border border-line rounded-card p-2 space-y-2">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        autoFocus
        placeholder="Título de la tarea..."
        disabled={pending}
        className="w-full text-[12px] px-2 py-1.5 border border-line rounded-chip outline-none focus:border-teal-600 disabled:opacity-50"
      />
      <div className="flex items-center gap-2">
        <select
          value={modulo}
          onChange={(e) => setModulo(e.target.value)}
          disabled={pending}
          className="text-[11px] px-2 py-1 border border-line rounded-chip outline-none disabled:opacity-50"
        >
          {MODULOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-[11px] px-2 py-1 text-muted hover:text-ink disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="text-[11px] px-3 py-1 bg-teal-600 text-white rounded-chip hover:bg-teal-700 disabled:opacity-50"
        >
          {pending ? "Creando..." : "Crear"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/embed/[clientId]/plan/components/NewTaskInline.tsx
git commit -m "feat(embed): NewTaskInline form component"
```

---

### Task 15: Refactor de `EmbedPlanClient` — integrar todo

**Files:**
- Modify: `src/app/embed/[clientId]/plan/EmbedPlanClient.tsx`

- [ ] **Step 1: Reescribir el componente**

Reemplazar el contenido completo de `src/app/embed/[clientId]/plan/EmbedPlanClient.tsx` con:

```typescript
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MiroTask } from "@/lib/types";
import { HistoricalCounts, EMPTY_HISTORICAL } from "@/lib/miro-historico";
import { computeProgressFromMiro } from "@/lib/miro-progress";
import { TaskRow } from "./components/TaskRow";
import { NewTaskInline } from "./components/NewTaskInline";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import {
  completeTask,
  patchTask,
  deleteTask,
  createTask,
  fetchResponsables,
} from "./lib/embed-api";

const REFRESH_MS = 30_000;

const PRIORITY_ORDER: Record<string, number> = {
  Inmediato: 0,
  Alta: 1,
  Media: 2,
  Baja: 3,
};
const ESTADO_ORDER: Record<string, number> = {
  "En curso": 0,
  Iniciativa: 1,
  Completada: 2,
};

export function EmbedPlanClient({
  clientId,
  token,
}: {
  clientId: string;
  token: string;
}) {
  const [tasks, setTasks] = useState<MiroTask[]>([]);
  const [historical, setHistorical] = useState<HistoricalCounts>(EMPTY_HISTORICAL);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [responsableSuggestions, setResponsableSuggestions] = useState<string[]>([]);
  const [creatingFor, setCreatingFor] = useState<string | null>(null); // module name
  const [confirmDelete, setConfirmDelete] = useState<MiroTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  const apiOpts = useMemo(() => ({ token, clientId }), [token, clientId]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tasks?clientId=${encodeURIComponent(clientId)}&embedToken=${encodeURIComponent(token)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Error al cargar");
        return;
      }
      setTasks(data.tasks || []);
      setHistorical(data.historical || EMPTY_HISTORICAL);
      setGlobalError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setGlobalError(`Error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    fetchTasks();
    const iv = setInterval(fetchTasks, REFRESH_MS);
    return () => clearInterval(iv);
  }, [fetchTasks]);

  // Fetch responsables once + after writes
  const refreshResponsables = useCallback(async () => {
    const list = await fetchResponsables(apiOpts);
    setResponsableSuggestions(list);
  }, [apiOpts]);

  useEffect(() => {
    refreshResponsables();
  }, [refreshResponsables]);

  // Mark task as pending
  function setPending(id: string, pending: boolean) {
    setPendingTaskIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Action handlers
  async function handleComplete(taskId: string) {
    setPending(taskId, true);
    const original = tasks.find((t) => t.id === taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, estado: "Completada" } : t))
    );
    try {
      await completeTask(taskId, apiOpts);
      await fetchTasks();
    } catch (err) {
      setGlobalError((err as Error).message);
      if (original) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? original : t)));
      }
    } finally {
      setPending(taskId, false);
    }
  }

  async function handleChangeEstado(taskId: string, estado: string) {
    setPending(taskId, true);
    const original = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, estado } : t)));
    try {
      await patchTask(taskId, { estado }, apiOpts);
      await fetchTasks();
    } catch (err) {
      setGlobalError((err as Error).message);
      if (original) setTasks((prev) => prev.map((t) => (t.id === taskId ? original : t)));
    } finally {
      setPending(taskId, false);
    }
  }

  async function handleChangeResponsable(taskId: string, responsable: string) {
    setPending(taskId, true);
    const original = tasks.find((t) => t.id === taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, responsable } : t))
    );
    try {
      await patchTask(taskId, { responsable }, apiOpts);
      await refreshResponsables();
      await fetchTasks();
    } catch (err) {
      setGlobalError((err as Error).message);
      if (original) setTasks((prev) => prev.map((t) => (t.id === taskId ? original : t)));
    } finally {
      setPending(taskId, false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteTask(confirmDelete.id, apiOpts);
      setTasks((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreate(modulo: string, data: { titulo: string; modulo: string }) {
    await createTask({ ...data, clientId }, apiOpts);
    setCreatingFor(null);
    await fetchTasks();
  }

  // Derived data
  const activeTasks = useMemo(
    () => tasks.filter((t) => t.estado !== "Completada"),
    [tasks]
  );

  const grouped = useMemo(() => {
    const out: Record<string, MiroTask[]> = {};
    for (const t of activeTasks) {
      (out[t.modulo || "Sin módulo"] ||= []).push(t);
    }
    for (const key of Object.keys(out)) {
      out[key].sort((a, b) => {
        const estA = ESTADO_ORDER[a.estado] ?? 99;
        const estB = ESTADO_ORDER[b.estado] ?? 99;
        if (estA !== estB) return estA - estB;
        const prA = PRIORITY_ORDER[a.prioridad ?? ""] ?? 99;
        const prB = PRIORITY_ORDER[b.prioridad ?? ""] ?? 99;
        return prA - prB;
      });
    }
    return out;
  }, [activeTasks]);

  const progress = useMemo(
    () => computeProgressFromMiro(tasks, historical),
    [tasks, historical]
  );

  // Render
  if (loading) {
    return <div className="p-4 animate-pulse">Cargando...</div>;
  }

  return (
    <div className="p-4 bg-transparent">
      {/* Banner global de error */}
      {globalError && (
        <div className="mb-3 bg-red-50 border border-red-100 rounded-card p-2.5 flex items-start justify-between gap-2">
          <p className="text-[11px] text-red-700">{globalError}</p>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-[11px] text-red-700 hover:underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Progress cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {progress.map((p) => (
          <div
            key={p.category}
            className="bg-white/90 backdrop-blur-sm border border-line rounded-card p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-label font-medium text-muted truncate">
                {p.label}
              </div>
              <div className="text-[10px] text-muted tabular-nums shrink-0">
                {p.completed}/{p.total}
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[22px] font-semibold text-ink tabular-nums leading-none">
                {p.percentage}
              </span>
              <span className="text-[12px] text-muted">%</span>
            </div>
            <div className="h-1 bg-line rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-[width] duration-500"
                style={{ width: `${p.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Listas por módulo */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([modulo, items]) => (
          <div key={modulo} className="bg-white/90 border border-line rounded-card p-3">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="text-[11px] uppercase tracking-label font-medium text-ink truncate">
                {modulo}
              </h2>
              <button
                type="button"
                onClick={() => setCreatingFor(modulo)}
                className="text-[11px] px-2 py-0.5 text-teal-700 hover:bg-teal-50 rounded-chip"
              >
                + Nueva tarea
              </button>
            </div>

            {creatingFor === modulo && (
              <div className="mb-2">
                <NewTaskInline
                  defaultModulo={modulo}
                  onCreate={(d) => handleCreate(modulo, d)}
                  onCancel={() => setCreatingFor(null)}
                />
              </div>
            )}

            <ul className="space-y-1">
              {items.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  pending={pendingTaskIds.has(t.id)}
                  responsableSuggestions={responsableSuggestions}
                  onComplete={() => handleComplete(t.id)}
                  onChangeEstado={(e) => handleChangeEstado(t.id, e)}
                  onChangeResponsable={(r) => handleChangeResponsable(t.id, r)}
                  onDeleteRequest={() => setConfirmDelete(t)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {updatedAt && (
        <p className="text-[10px] text-muted mt-3 text-right tabular-nums">
          Actualizado {updatedAt.toLocaleTimeString("es-CO")}
        </p>
      )}

      {confirmDelete && (
        <DeleteConfirmModal
          taskTitle={confirmDelete.titulo}
          pending={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK, sin errores de tipos.

- [ ] **Step 3: Commit**

```bash
git add src/app/embed/[clientId]/plan/EmbedPlanClient.tsx
git commit -m "feat(embed): integrate edit actions in EmbedPlanClient"
```

---

### Task 16: Deploy a Netlify

- [ ] **Step 1: Push de todos los commits**

```bash
git push
```

Expected: Netlify detecta el push y arranca un deploy automático.

- [ ] **Step 2: Esperar a que Netlify termine el deploy**

Abrir https://app.netlify.com → site `consultoria-ea` → Deploys. Esperar al status "Published" del último commit. Suele tardar 2-4 min.

- [ ] **Step 3: Verificar `SUPABASE_SERVICE_ROLE_KEY` está en env vars**

Confirmar que la variable de Pre-flight 1 sigue estando configurada (a veces se pierden si se hace algo raro). Si no, re-agregarla y trigger redeploy.

---

### Task 17: Tests de aceptación post-deploy

- [ ] **Step 1: Correr el script de tests**

Run (desde Git Bash en Windows, o WSL):
```bash
bash scripts/test-endpoints.sh
```

Expected: los 6 tests pasan con ✓.

Si algún test falla:
- Test 1-2 (GET): problema de embedToken — verificar `EMBED_SECRET` en Netlify
- Test 4-6 (writes 401): problema de la nueva auth — revisar `checkAuth` y endpoints
- Test 3 (responsables): probablemente el endpoint nuevo no se deployó correctamente

- [ ] **Step 2: Si todo pasa, commit del log**

(El script no genera artefactos, solo es validación. Avanzamos.)

---

### Task 18: Manual smoke test — los 6 escenarios funcionales en Dentilandia

Tomás abre el board de Miro de Dentilandia con el embed insertado y prueba:

- [ ] **Test 1: Completar tarea con checkbox**
  - Click en ☐ de cualquier tarea
  - Esperado: el ☐ se ve "guardando..." (~300ms) → la tarea desaparece de la lista → el % del módulo sube
  - Validación adicional: refresh del embed → la tarea sigue oculta (porque está Completada)

- [ ] **Test 2: Cambiar estado**
  - Hover sobre tarea "En curso" → click ⋯ → seleccionar "Iniciativa"
  - Esperado: la tarea se reordena dentro del grupo (las "Iniciativa" van después de "En curso")

- [ ] **Test 3: Cambiar responsable con autocomplete**
  - Click ⋯ en alguna tarea → click en "(sin asignar)" o el responsable actual
  - Escribir 2 letras (ej: "Li") → ver sugerencia "Lina"
  - Click en la sugerencia → guardado
  - Validación: refresh embed → responsable sigue siendo el nuevo

- [ ] **Test 4: Crear tarea nueva**
  - Click "+ Nueva tarea" en cualquier módulo
  - Escribir título, dejar módulo por default → Crear
  - Esperado: form se cierra, tarea aparece en la lista del módulo

- [ ] **Test 5: Borrar con confirmación**
  - Click ⋯ → "🗑️ Borrar tarea"
  - Modal aparece con el título de la tarea
  - Click "Borrar"
  - Esperado: modal cierra, tarea desaparece. Refresh embed → sigue borrada.

- [ ] **Test 6: Cancelar borrado**
  - Click ⋯ → "🗑️ Borrar tarea"
  - Modal aparece
  - Click "Cancelar"
  - Esperado: modal cierra, tarea sigue ahí.

Si los 6 pasan → ✅ feature lista. Si alguno falla → diagnostic + fix + repeat.

---

### Task 19: Test de no-regresión

- [ ] **Test 1: GET endpoint sigue funcionando**
  - `curl https://consultoria-ea.netlify.app/api/tasks?clientId=client-dentilandia&embedToken=embed-consultoria-a7x9k2m5p3 | head -c 200`
  - Expected: JSON con `"tasks":[...]` y al menos 50 elementos.

- [ ] **Test 2: Cron 18:00 sigue funcionando**
  - Esperar a la próxima corrida del cron (mañana 18:00 Bogotá)
  - Verificar en https://claude.ai/code/scheduled/trig_01AFWkRYkH53Dc4AMSNuGh5C que el run terminó OK.
  - Verificar que ningún cliente quedó con drift inesperado.

- [ ] **Test 3: Embed sin tocar sigue mostrando lectura**
  - Abrir el embed, no clickear nada por 60 segundos
  - Esperado: las cards de progreso siguen visibles, el refresh cada 30s ocurre, no hay errores en consola.

---

### Task 20: Replicar embed a los otros 4 boards (cero código)

- [ ] **Step 1: CYGNUSS**
  - Abrir el board de CYGNUSS en Miro
  - Insertar embed widget con URL: `https://consultoria-ea.netlify.app/embed/client-cygnuss/plan?token=embed-consultoria-a7x9k2m5p3`
  - Verificar que carga las 40 tareas

- [ ] **Step 2: AC Autos**
  - URL: `.../embed/client-acautos/plan?token=embed-consultoria-a7x9k2m5p3`
  - Verificar 13 tareas

- [ ] **Step 3: Paulina**
  - URL: `.../embed/client-paulina/plan?token=embed-consultoria-a7x9k2m5p3`
  - Verificar 18 tareas

- [ ] **Step 4: Lativo (c5)**
  - URL: `.../embed/c5/plan?token=embed-consultoria-a7x9k2m5p3`
  - Verificar 5 tareas

---

### Task 21: Actualizar HANDOVER.md con la nueva capacidad

- [ ] **Step 1: Editar `docs/HANDOVER.md`**

Reemplazar la sección "Embeds en Miro (opcional, no en uso)" por:

```markdown
## Embeds en Miro (live, con edición)

Cada cliente tiene una página de embed editable (refresh cada 30s + edición vía token):

\```
https://consultoria-ea.netlify.app/embed/{clientId}/plan?token=embed-consultoria-a7x9k2m5p3
\```

Donde `{clientId}` es: `client-cygnuss` · `client-dentilandia` · `client-acautos` · `client-paulina` · `c5`

**Acciones soportadas:**
- ☐ Completar tarea (checkbox)
- Menú ⋯: cambiar estado (En curso ↔ Iniciativa), cambiar responsable (con autocomplete), borrar tarea (con confirmación)
- "+ Nueva tarea" en cada módulo (mínimo viable: título + módulo)

**Para insertar uno:** en Miro → barra izquierda → "+" → "Embed" → pegar URL → seleccionar opción "Insert as embed".

**Auth:** el token URL autoriza tanto reads como writes. Si en algún momento se sospecha filtración, rotar `EMBED_SECRET` en Netlify y re-insertar embeds.

**Acciones NO soportadas (intencional):** cambiar prioridad, cambiar fecha límite, editar título, deshacer post-borrado. Si se necesitan, ver spec `docs/superpowers/specs/2026-04-30-embed-edicion-tareas-design.md` §2.
```

- [ ] **Step 2: Commit + push**

```bash
git add docs/HANDOVER.md
git commit -m "docs: HANDOVER updated with embed editing capability"
git push
```

---

## Self-review

✅ **Spec coverage:**
- Acción A (completar) → Tasks 9, 13, 15
- Acción B (estado) → Tasks 4, 12, 13, 15
- Acción D (responsable) → Tasks 4, 7, 11, 12, 15
- Acción G (crear) → Tasks 6, 14, 15
- Acción H (borrar) → Tasks 5, 10, 12, 15
- Auth token URL → Tasks 1, 3, 4, 5, 6, 7
- Service role bypass RLS → Task 2 + uso en Tasks 3-7
- Optimistic updates → Task 15
- Error banners → Task 15
- Manual testing protocol → Task 18
- Acceptance tests → Tasks 8 + 17
- Replicación a 4 boards → Task 20

✅ **Placeholder scan:** ningún TBD/TODO/"implement later" — todos los steps tienen código completo o comandos exactos.

✅ **Type consistency:** `MiroTask`, `HistoricalCounts`, `AuthResult`, `ApiOptions` usados consistentemente. `apiOpts = { token, clientId }` mismo nombre en todos los handlers.

✅ **Scope:** focalizado en el spec, sin refactors no relacionados.

---

## Estimación realista por task

| Task | Tiempo |
|---|---|
| Pre-flight | 10 min |
| 0-2 (setup + lib) | 1h |
| 3-7 (endpoints) | 1.5h |
| 8 (curl tests) | 30 min |
| 9 (helper API) | 30 min |
| 10-14 (componentes) | 3h |
| 15 (integración) | 2h |
| 16-17 (deploy + acceptance) | 30 min |
| 18 (manual smoke test) | 30 min |
| 19 (no-regresión) | 15 min |
| 20 (replicar 4 embeds) | 15 min |
| 21 (HANDOVER) | 15 min |
| **TOTAL** | **~10 horas (1.5 días de trabajo)** |
