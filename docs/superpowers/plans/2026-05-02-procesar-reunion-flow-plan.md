# Procesar reunión: implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan task-by-task. Los steps usan checkbox (`- [ ]`) syntax.

**Goal:** Persistir minutas + cambios de tareas post-reunión en Supabase desde sesión Claude Code (sin Anthropic SDK), y mostrar las minutas en la pestaña existente del cliente leyendo de la nueva tabla.

**Architecture:** Tabla `meetings` nueva en Supabase. Tres endpoints REST (`POST/GET /api/meetings`, `PATCH /api/meetings/:id`) con auth dual sesión/embedToken (mismo patrón que tareas). Refactor de la pestaña "Minutas" para reemplazar mock data por fetch al endpoint. Render de markdown con `react-markdown`.

**Tech Stack:** Next.js 14 (app router), TypeScript, Supabase (postgres + RLS), `@supabase/supabase-js`, `react-markdown` (nueva dep), Vitest (no aplica directamente — los tests son acceptance con curl).

**Spec:** `docs/superpowers/specs/2026-05-02-procesar-reunion-flow-design.md`

---

## File Structure

### Archivos nuevos
| Path | Responsabilidad |
|---|---|
| `supabase/migrations/003_meetings.sql` | Schema + indices + RLS de la tabla `meetings` |
| `src/app/api/meetings/route.ts` | Handlers POST + GET para `/api/meetings` |
| `src/app/api/meetings/[id]/route.ts` | Handler PATCH para `/api/meetings/:id` (publish a Miro) |
| `src/components/MeetingCard.tsx` | Card que renderiza una `Meeting` con su `minuta_md` (markdown) y metadata |

### Archivos modificados
| Path | Cambio |
|---|---|
| `package.json` | Agregar dep `react-markdown` |
| `src/lib/types.ts` | Agregar interface `Meeting`. Marcar `Minute`/`MinuteSection` como `@deprecated` (mantener por compat — nadie debería usarlas) |
| `src/lib/data-context.tsx` | Quitar `getClientMinutes` del context (ya no se usa post-refactor) |
| `src/app/client/[id]/page.tsx` | Reemplazar `getClientMinutes` por `useEffect + fetch /api/meetings`. Reemplazar `<MinuteCard>` por `<MeetingCard>`. Eliminar import de `MinuteCard` (queda muerto). |
| `scripts/test-endpoints.sh` | Agregar tests 11-14 para endpoints meetings |

### Pre-flight (Tomás manual)
- Correr `003_meetings.sql` en Supabase SQL Editor (Database → SQL Editor → paste → Run). Después confirmar con `SELECT COUNT(*) FROM meetings;` que devuelva `0`.

### Archivo a deprecar (no eliminar para evitar rotura)
- `src/components/MinuteCard.tsx` — queda en el repo pero sin imports. Se elimina en sprint posterior si nada lo usa.

---

## Pre-flight: Migración Supabase

### Pre-flight 1: Tomás corre la migración

- [ ] **Step 1:** Abrí https://supabase.com/dashboard/project/gbulutnlacwjzqsrxoku/sql/new

- [ ] **Step 2:** Pegá el contenido de `supabase/migrations/003_meetings.sql` (lo creamos en Task 1) y click **Run**.

- [ ] **Step 3:** En la misma SQL editor, correr `SELECT COUNT(*) FROM meetings;` y verificar que devuelve `0` (cero filas, sin error).

⚠️ **Crítico:** Sin esta migración, todos los endpoints de meetings van a tirar 500. Ejecutar después de Task 1 (ahí está el SQL).

---

## Tasks

### Task 0: Setup `react-markdown`

**Files:**
- Modify: `package.json` + `package-lock.json`

- [ ] **Step 1: Install react-markdown**

```bash
npm install react-markdown
```

Expected: `react-markdown` aparece en `dependencies`. Sin warnings de peer-dep.

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-markdown for rendering minuta_md"
```

---

### Task 1: Crear migración SQL `003_meetings.sql`

**Files:**
- Create: `supabase/migrations/003_meetings.sql`

- [ ] **Step 1: Crear el archivo con el schema**

Contenido exacto:

```sql
-- Migración: tabla `meetings` para persistir minutas post-reunión
-- y la relación con tareas creadas/completadas/actualizadas en esa reunión.
-- Spec: docs/superpowers/specs/2026-05-02-procesar-reunion-flow-design.md

CREATE TABLE meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT NOT NULL,
  fecha_reunion   DATE NOT NULL,
  duracion_min    INT,
  asistentes      TEXT[] DEFAULT '{}',
  transcript_raw  TEXT NOT NULL,
  minuta_md       TEXT NOT NULL,

  tareas_creadas_ids       UUID[] DEFAULT '{}',
  tareas_completadas_ids   UUID[] DEFAULT '{}',
  tareas_actualizadas_ids  UUID[] DEFAULT '{}',

  pending_miro_sync BOOLEAN DEFAULT TRUE,
  miro_doc_id       TEXT,
  miro_synced_at    TIMESTAMPTZ,

  created_by        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meetings_client_id ON meetings(client_id);
CREATE INDEX idx_meetings_fecha ON meetings(fecha_reunion DESC);
CREATE INDEX idx_meetings_pending_sync
  ON meetings(pending_miro_sync) WHERE pending_miro_sync = true;

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY meetings_select_own ON meetings FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'consultant' OR p.client_id::text = meetings.client_id)
    )
  );

CREATE POLICY meetings_insert_consultant ON meetings FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'consultant'
    )
  );

CREATE POLICY meetings_update_consultant ON meetings FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'consultant'
    )
  );
```

- [ ] **Step 2: Tomás corre la migración (ver Pre-flight)**

⚠️ Pausa aquí. Pedir a Tomás que ejecute la migración en Supabase SQL Editor antes de seguir con Task 2.

- [ ] **Step 3: Commit del archivo de migración**

```bash
git add supabase/migrations/003_meetings.sql
git commit -m "feat(supabase): tabla meetings para minutas + relacion con tareas"
```

---

### Task 2: Tipo `Meeting` en `types.ts`

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Agregar interface Meeting al final del archivo (antes de `MODULE_LABELS`)**

Justo antes de la línea `export const MODULE_LABELS`, agregar:

```typescript
export interface Meeting {
  id: string;
  client_id: string;
  fecha_reunion: string;          // ISO date "YYYY-MM-DD"
  duracion_min: number | null;
  asistentes: string[];
  transcript_raw: string;
  minuta_md: string;

  tareas_creadas_ids: string[];
  tareas_completadas_ids: string[];
  tareas_actualizadas_ids: string[];

  pending_miro_sync: boolean;
  miro_doc_id: string | null;
  miro_synced_at: string | null;  // ISO timestamp

  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): Meeting interface (mapea tabla meetings)"
```

---

### Task 3: Endpoint `POST /api/meetings` + `GET /api/meetings`

**Files:**
- Create: `src/app/api/meetings/route.ts`

- [ ] **Step 1: Implementar route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkAuth } from "@/lib/auth-embed";

export const dynamic = "force-dynamic";

interface PostBody {
  clientId?: string;
  fecha_reunion?: string;
  duracion_min?: number | null;
  asistentes?: string[];
  transcript_raw?: string;
  minuta_md?: string;
  tareas_creadas_ids?: string[];
  tareas_completadas_ids?: string[];
  tareas_actualizadas_ids?: string[];
  created_by?: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as PostBody | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "body inválido" },
      { status: 400 }
    );
  }

  const required: Array<keyof PostBody> = [
    "clientId",
    "fecha_reunion",
    "transcript_raw",
    "minuta_md",
  ];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json(
        { ok: false, error: `Campo requerido: ${key}` },
        { status: 400 }
      );
    }
  }

  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      client_id: body.clientId,
      fecha_reunion: body.fecha_reunion,
      duracion_min: body.duracion_min ?? null,
      asistentes: body.asistentes ?? [],
      transcript_raw: body.transcript_raw,
      minuta_md: body.minuta_md,
      tareas_creadas_ids: body.tareas_creadas_ids ?? [],
      tareas_completadas_ids: body.tareas_completadas_ids ?? [],
      tareas_actualizadas_ids: body.tareas_actualizadas_ids ?? [],
      pending_miro_sync: true,
      created_by: body.created_by ?? null,
    })
    .select()
    .single();

  if (error) {
    console.warn("[meetings/POST] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, meeting: data });
}

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
    .from("meetings")
    .select("*")
    .eq("client_id", clientId)
    .order("fecha_reunion", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, meetings: data ?? [] });
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/meetings/route.ts
git commit -m "feat(api): POST + GET /api/meetings (auth dual sesion/embedToken)"
```

---

### Task 4: Endpoint `PATCH /api/meetings/:id`

**Files:**
- Create: `src/app/api/meetings/[id]/route.ts`

- [ ] **Step 1: Implementar el handler PATCH**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkAuth } from "@/lib/auth-embed";

export const dynamic = "force-dynamic";

interface PatchBody {
  miro_doc_id?: string | null;
  miro_synced_at?: string | null;
  pending_miro_sync?: boolean;
}

export async function PATCH(
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

  const meetingId = params.id;
  if (!meetingId) {
    return NextResponse.json(
      { ok: false, error: "meetingId requerido" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "body inválido" },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.miro_doc_id !== undefined) patch.miro_doc_id = body.miro_doc_id;
  if (body.miro_synced_at !== undefined) patch.miro_synced_at = body.miro_synced_at;
  if (body.pending_miro_sync !== undefined) patch.pending_miro_sync = body.pending_miro_sync;

  if (Object.keys(patch).length === 1) {
    return NextResponse.json(
      { ok: false, error: "no hay campos para actualizar" },
      { status: 400 }
    );
  }

  const supabase =
    auth.via === "session" ? createServerSupabaseClient() : getSupabaseAdmin();

  const { data, error } = await supabase
    .from("meetings")
    .update(patch)
    .eq("id", meetingId)
    .select()
    .single();

  if (error) {
    console.warn("[meetings/PATCH] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, meeting: data });
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/meetings/[id]/route.ts"
git commit -m "feat(api): PATCH /api/meetings/:id para marcar sync con Miro"
```

---

### Task 5: Componente `MeetingCard.tsx`

**Files:**
- Create: `src/components/MeetingCard.tsx`

- [ ] **Step 1: Implementar el componente**

```typescript
"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Meeting } from "@/lib/types";

interface Props {
  meeting: Meeting;
}

function formatDate(iso: string): string {
  // "2026-05-02" → "2 may 2026"
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MeetingCard({ meeting }: Props) {
  const [expanded, setExpanded] = useState(false);

  const tareasTotal =
    meeting.tareas_creadas_ids.length +
    meeting.tareas_completadas_ids.length +
    meeting.tareas_actualizadas_ids.length;

  return (
    <div className="bg-surface border border-line shadow-card rounded-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-bg/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-ink">
              {formatDate(meeting.fecha_reunion)}
            </span>
            {meeting.duracion_min && (
              <span className="text-[11px] text-muted tabular-nums">
                · {meeting.duracion_min} min
              </span>
            )}
            {meeting.pending_miro_sync && (
              <span className="text-[10px] uppercase tracking-label text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-chip">
                Sin publicar en Miro
              </span>
            )}
          </div>
          <div className="text-[12px] text-muted mt-0.5 truncate">
            {meeting.asistentes.length > 0
              ? meeting.asistentes.join(" · ")
              : "Sin asistentes registrados"}
            {tareasTotal > 0 && (
              <span className="text-muted">
                {" · "}
                {tareasTotal} tarea{tareasTotal === 1 ? "" : "s"} tocada
                {tareasTotal === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <span className={`text-muted shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {expanded && (
        <div className="border-t border-line p-4 prose prose-sm max-w-none prose-headings:text-ink prose-p:text-ink prose-strong:text-ink prose-table:text-[13px] prose-th:text-ink prose-td:text-ink">
          <ReactMarkdown>{meeting.minuta_md}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build OK. Posibles warnings de Tailwind sobre `prose-*` — son del plugin `@tailwindcss/typography` que no está instalado. Si aparece warning o el render se ve mal, en Step 3 instalamos. Si build pasa sin error, dejá como está.

- [ ] **Step 3 (condicional): Instalar plugin typography si los `prose-*` clases no aplican**

Si al ver el componente el markdown no se renderiza con jerarquía visual (headings sin tamaño, listas sin bullets), instalar:

```bash
npm install -D @tailwindcss/typography
```

Y agregar al `tailwind.config.ts`:

```typescript
plugins: [require("@tailwindcss/typography")],
```

Re-correr build. Si los `prose-*` ya estaban funcionando (hay otros componentes que los usan), saltar este step.

- [ ] **Step 4: Commit**

```bash
git add src/components/MeetingCard.tsx
git commit -m "feat(meetings): MeetingCard con render markdown de minuta_md"
```

(Si tuviste que hacer Step 3, agregá también `package.json`, `package-lock.json`, `tailwind.config.ts` al commit.)

---

### Task 6: Refactor pestaña Minutas en `/client/[id]`

**Files:**
- Modify: `src/app/client/[id]/page.tsx`

- [ ] **Step 1: Agregar fetch de meetings + state**

En el archivo, justo después del bloque que define `miroFetched` (alrededor de línea 51), agregar:

```typescript
const [meetings, setMeetings] = useState<Meeting[]>([]);
const [meetingsLoading, setMeetingsLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  setMeetingsLoading(true);
  fetch(`/api/meetings?clientId=${encodeURIComponent(clientId)}`)
    .then((r) => (r.ok ? r.json() : { meetings: [] }))
    .then((d) => {
      if (!cancelled) {
        setMeetings(d.meetings || []);
        setMeetingsLoading(false);
      }
    })
    .catch(() => {
      if (!cancelled) setMeetingsLoading(false);
    });
  return () => {
    cancelled = true;
  };
}, [clientId]);
```

- [ ] **Step 2: Agregar imports al tope del archivo**

Después de los imports existentes, asegurar que hay:

```typescript
import { Meeting, MiroTask } from "@/lib/types";
import { MeetingCard } from "@/components/MeetingCard";
```

(Si ya existe `import { MiroTask } from "@/lib/types";`, modificarlo para incluir `Meeting`. Eliminar el import de `MinuteCard` si ya no se usa.)

- [ ] **Step 3: Eliminar `getClientMinutes` del destructuring**

Buscar la línea `const { getClient, getClientMinutes } = useData();` y dejarla como:

```typescript
const { getClient } = useData();
```

- [ ] **Step 4: Eliminar la línea `const minutes = getClientMinutes(clientId);`**

Buscar esa línea (alrededor de 128) y borrarla.

- [ ] **Step 5: Reemplazar el bloque `activeTab === "minutas"`**

Buscar:

```typescript
{activeTab === "minutas" && (
  <div className="space-y-3">
    {minutes.length > 0 ? (
      minutes.map((m) => <MinuteCard key={m.id} minute={m} />)
    ) : (
      <EmptyState text="Sin minutas registradas" />
    )}
  </div>
)}
```

Reemplazar por:

```typescript
{activeTab === "minutas" && (
  <div className="space-y-3">
    {meetingsLoading ? (
      <div className="space-y-3" aria-label="Cargando minutas">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-surface border border-line rounded-card h-16 shadow-card animate-pulse" />
        ))}
      </div>
    ) : meetings.length > 0 ? (
      meetings.map((m) => <MeetingCard key={m.id} meeting={m} />)
    ) : (
      <EmptyState text="Sin minutas registradas" />
    )}
  </div>
)}
```

- [ ] **Step 6: Verificar build**

```bash
npm run build
```

Expected: build OK. Si tira "MinuteCard imported but not used" lo eliminás del import.

- [ ] **Step 7: Commit**

```bash
git add "src/app/client/[id]/page.tsx"
git commit -m "feat(client-page): pestaña Minutas lee de /api/meetings"
```

---

### Task 7: Limpieza de `getClientMinutes` en data-context

**Files:**
- Modify: `src/lib/data-context.tsx`

- [ ] **Step 1: Eliminar `getClientMinutes` del context**

En `src/lib/data-context.tsx`:
- Línea 41: borrar `getClientMinutes: (clientId: string) => Minute[];` del type
- Línea 103+: borrar el `useCallback` de `getClientMinutes`
- Línea 170: borrar `getClientMinutes` del `value` retornado
- Línea 10: ajustar el import — quitar `Minute` (ya no se usa). Si `Minute` o `MinuteSection` se usan en otro lado del archivo, dejar el import; si no, removerlo limpiamente.

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build OK. Si sale error de `Minute` no exportado, asegurar que el archivo `types.ts` lo siga exportando (es legacy pero no rompemos otros imports).

- [ ] **Step 3: Commit**

```bash
git add src/lib/data-context.tsx
git commit -m "chore(data-context): eliminar getClientMinutes (reemplazado por /api/meetings)"
```

---

### Task 8: Acceptance tests con curl

**Files:**
- Modify: `scripts/test-endpoints.sh`

- [ ] **Step 1: Agregar tests al final del script (antes del último `echo`)**

Antes de la línea final `echo "===> Todos los tests de aceptacion pasaron"`, insertar:

```bash
echo "===> Test 11: GET /api/meetings sin token -> 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/meetings?clientId=$CLIENT_ID")
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }

echo "===> Test 12: GET /api/meetings con token -> 200 + array"
RESP=$(curl -s "$BASE/api/meetings?clientId=$CLIENT_ID&embedToken=$TOKEN")
echo "$RESP" | grep -q '"meetings":\[' && echo "  OK formato" || { echo "  FAIL formato inesperado: $RESP"; exit 1; }

echo "===> Test 13: POST /api/meetings sin token -> 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/meetings" -H "Content-Type: application/json" -d '{}')
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }

echo "===> Test 14: PATCH /api/meetings/:id sin auth -> 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/api/meetings/$FAKE_TASK" -H "Content-Type: application/json" -d '{}')
[ "$STATUS" = "401" ] && echo "  OK 401" || { echo "  FAIL esperaba 401, recibi $STATUS"; exit 1; }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/test-endpoints.sh
git commit -m "test: 4 acceptance tests para /api/meetings"
```

⚠️ Estos tests corren post-deploy (Task 10), no antes.

---

### Task 9: Actualizar `workflow_post_reunion.md`

**Files:**
- Modify: `C:\Users\User\.claude\projects\c--Users-TOMAS-Desktop-consultoria-app\memory\workflow_post_reunion.md`

- [ ] **Step 1: Reemplazar el contenido completo**

```markdown
---
name: Workflow post-reunión (transcript Fathom → Supabase + opcional Miro)
description: Procedimiento exacto cuando Tomás manda transcript Fathom. El parsing lo hago yo en sesión Claude Code (sin Anthropic SDK). Persisto en Supabase via /api/meetings + endpoints de tareas. Publico en Miro on-demand.
type: project
---

Cuando Tomás manda un transcript Fathom (ej. "Procesá reunión de Dentilandia: ..."):

## Paso 1 — Leer Supabase actual del cliente
GET /api/tasks?clientId=client-X&embedToken=embed-consultoria-a7x9k2m5p3
→ obtenes tareas activas con sus IDs.

## Paso 2 — Parsear transcript
Yo (Claude) leo el transcript completo. Identifico:
- Tareas nuevas mencionadas
- Tareas existentes cerradas durante la reunión
- Cambios sobre tareas (responsable, fecha, etc.)
- Asistentes mencionados
- Duración (si se infiere)
- Decisiones, contexto, próximos pasos

## Paso 3 — Generar minuta en formato consultor (6 secciones)
```
# Reunión {Cliente} · {fecha} · {duración}min
**Asistentes:** ...

## Contexto
2-3 párrafos.

## Decisiones tomadas
- ...

## Compromisos / próximos pasos
| Quién | Qué | Cuándo |

## Temas abiertos / a debatir en próxima reunión
- ...

## Insights estratégicos (opinión consultor)
- ...
```

## Paso 4 — Mostrar diff a Tomás
Listar en chat: tareas nuevas, completadas, actualizadas, preview minuta.

## Paso 5 — Esperar aprobación / ajustes
Tomás puede pedir cambios ("borrá la 3", "cambiá responsable de la 5").

## Paso 6 — Aplicar en Supabase
- POST /api/tasks/bulk-create (nuevas)
- POST /api/tasks/:id/complete (cada completada)
- PATCH /api/tasks/:id (cada actualizada)
- POST /api/meetings con `tareas_*_ids` (los IDs devueltos arriba)

Todo con `embedToken=embed-consultoria-a7x9k2m5p3` y `clientId=...` en query.

## Paso 7 — Confirmar a Tomás
Embed se actualiza solo (refresh 30s). Pestaña Minutas en /client/[id] muestra la nueva minuta.

## Paso 8 (opcional, on-demand) — Publicar minuta en Miro
Cuando Tomás dice "publicá la última minuta de X en Miro":
1. GET /api/meetings?clientId=client-X&embedToken=... → tomar la más reciente con `pending_miro_sync=true`
2. mcp__claude_ai_Miro__doc_create con `miro_url={board}/`, `content=minuta_md`
3. PATCH /api/meetings/:id con `{ miro_doc_id, miro_synced_at: now(), pending_miro_sync: false }`

## Notas

- **No genero SQL para que Tomás copie a Supabase.** El paso 6 lo ejecuto yo directo via endpoints.
- **No modifico el data_table de Miro durante el sync.** Si las tablas viejas siguen existiendo, el cron 18:00 se encarga (o se desactiva si ya las borramos).
- **Los IDs de tareas vienen de Supabase** — el response del POST /api/tasks/bulk-create devuelve `ids[]`, los uso como `tareas_creadas_ids` en POST /api/meetings.
```

- [ ] **Step 2: Verificar formato YAML del frontmatter**

Confirmar que el archivo empieza con `---` y tiene `name`, `description`, `type` válidos.

- [ ] **Step 3: No requiere commit (memoria es local, no se versiona en git)**

---

### Task 10: Deploy + acceptance verification

- [ ] **Step 1: Confirmar que la migración fue aplicada en Supabase (Pre-flight 1)**

Si no se aplicó, **DETENERSE** y avisar a Tomás.

- [ ] **Step 2: Push de todos los commits**

```bash
git push
```

⚠️ Push directo a main requiere autorización explícita de Tomás. Preguntar antes de ejecutar.

- [ ] **Step 3: Esperar deploy de Netlify (~2-4 min)**

Probar manualmente con `curl` cada 30s hasta que el endpoint responda:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://consultoria-ea.netlify.app/api/meetings?clientId=client-dentilandia&embedToken=embed-consultoria-a7x9k2m5p3"
```

Expected: pasa de `404` (build viejo) a `200` (build nuevo, devuelve `{"meetings":[]}` porque la tabla está vacía).

- [ ] **Step 4: Correr acceptance tests**

```bash
bash scripts/test-endpoints.sh
```

Expected: los 14 tests pasan (los 10 viejos + los 4 nuevos de meetings).

Si algún test falla:
- Test 11/13/14 (401): problema de auth — verificar que `checkAuth` se llama correctamente
- Test 12 (200 + array): probable que la migración no se haya aplicado — pedir a Tomás verificar

---

### Task 11: Smoke test E2E con transcript de prueba

⚠️ Este task lo ejecutamos juntos, no es automatizable.

- [ ] **Step 1: Tomás genera o trae un transcript de prueba**

Puede ser un transcript real de una reunión próxima (Dentilandia es buen candidato — Tomás suele tener reuniones con ellos).

Si no hay reunión real disponible, generar uno mock corto (10-15 líneas) que mencione 2 tareas nuevas + 1 tarea existente como completada.

- [ ] **Step 2: Tomás me lo pega en chat**

Formato: "Procesá reunión de Dentilandia del [fecha]: [transcript]"

- [ ] **Step 3: Yo ejecuto el workflow completo**

Sigo `workflow_post_reunion.md` paso a paso. Le muestro diff. Espero aprobación.

- [ ] **Step 4: Aplicar y verificar**

Tras aprobación de Tomás:
1. Ejecuto los POST/PATCH/POST endpoints
2. Tomás abre /client/client-dentilandia → pestaña Minutas → debería ver la nueva
3. Tomás abre el embed de Dentilandia en Miro → las tareas nuevas aparecen, las completadas desaparecen, el % sube

- [ ] **Step 5: Tomás dice "publicá en Miro"**

Yo ejecuto:
- GET /api/meetings (filtro pending_miro_sync=true)
- mcp__claude_ai_Miro__doc_create con miro_url del board de Dentilandia + content=minuta_md
- PATCH /api/meetings/:id con miro_doc_id + miro_synced_at

Tomás verifica que el Doc apareció en Miro con el contenido correcto.

- [ ] **Step 6: Confirmar feature lista**

Si todo OK → cerramos sprint.
Si falla algo → diagnose + fix + repetir.

---

## Self-review

✅ **Spec coverage:**
- Tabla `meetings` (spec §5.1) → Task 1
- POST /api/meetings (spec §5.2) → Task 3
- GET /api/meetings (spec §5.2) → Task 3
- PATCH /api/meetings/:id (spec §5.2) → Task 4
- Refactor pestaña Minutas (spec §5.3) → Tasks 5, 6, 7
- Auth con checkAuth (spec §5.4) → todos los endpoints
- Workflow doc actualizado (spec §5.5) → Task 9
- Markdown rendering → Tasks 0, 5
- Curl acceptance (spec §8.2) → Task 8
- E2E smoke test (spec §8.1) → Task 11
- No-regresión (spec §8.3) → Task 10 (los 10 tests viejos siguen pasando)
- On-demand publish a Miro (spec §3 paso 7) → Task 11 step 5 + workflow doc paso 8

✅ **Placeholder scan:** ningún TBD/TODO/"implement later". Todos los pasos tienen código completo o comandos exactos.

✅ **Type consistency:**
- `Meeting` interface (Task 2) → consumida por MeetingCard (Task 5) y refactor pestaña (Task 6)
- Campo `meeting.fecha_reunion` es string ISO en types y se formatea con `formatDate` en MeetingCard
- `tareas_creadas_ids` / `tareas_completadas_ids` / `tareas_actualizadas_ids` son `string[]` en types y `UUID[]` en SQL — match correcto
- `pending_miro_sync` es `boolean` en types, `BOOLEAN` en SQL, condición de badge en MeetingCard

✅ **Scope:** focalizado en el spec. No hay refactor no relacionado.

---

## Estimación realista

| Task | Tiempo |
|---|---|
| Pre-flight (migración Supabase) | 5 min |
| Task 0 (react-markdown) | 5 min |
| Task 1 (SQL file) | 10 min |
| Task 2 (Meeting type) | 5 min |
| Task 3 (POST + GET endpoint) | 30 min |
| Task 4 (PATCH endpoint) | 15 min |
| Task 5 (MeetingCard) | 25 min |
| Task 6 (refactor pestaña) | 20 min |
| Task 7 (cleanup data-context) | 10 min |
| Task 8 (curl tests) | 10 min |
| Task 9 (workflow doc) | 10 min |
| Task 10 (deploy + acceptance) | 20 min |
| Task 11 (E2E smoke test) | 30 min |
| **TOTAL** | **~3.5 horas** |
