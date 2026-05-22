# Procesar reunión: transcript Fathom → minuta + tareas en Supabase

**Status:** Diseño aprobado en brainstorming, listo para plan de implementación
**Fecha:** 2026-05-02
**Stakeholder:** Tomás Ramirez Villa
**Brainstorm:** sesión 2026-05-02

---

## 1. Contexto y problema

Hoy, post-reunión, Tomás tiene un transcript de Fathom y necesita:
1. Extraer las tareas nuevas mencionadas
2. Marcar como completadas las tareas existentes que el cliente confirmó como hechas
3. Actualizar tareas que cambiaron (responsable, fecha, etc.)
4. Generar una minuta resumida estilo consultor para historial y para mostrar al cliente
5. Que todo eso quede reflejado en el embed de Miro y en la app

El flujo actual (`workflow_post_reunion.md` en auto-memoria) es: Tomás pega el transcript en una sesión Claude Code, Claude lee Supabase, parsea, hace cross-check, muestra diff, Tomás aprueba, Claude **genera SQL para que Tomás copie a Supabase**, Claude crea minuta como Doc en Miro vía MCP. Funciona pero la minuta queda solo en Miro (no en la app), y el paso de "copiar SQL a mano" es fricción innecesaria.

`pegar-pendientes/page.tsx` ya existe pero solo acepta JSON crudo de tareas (sin minuta, sin cross-check, sin parsing de transcript).

`/api/meetings/process` con Anthropic SDK figuraba como TODO diferido — descartado en este sprint porque Tomás no quiere depender de API key de Anthropic ni pagar tokens; prefiere seguir usando Claude Code (yo) como "motor" de parsing.

---

## 2. Decisión arquitectónica clave

**El parsing del transcript lo hace Claude (yo) en sesión Claude Code, no un endpoint de Next.js con Anthropic SDK.**

**Rationale:**
- Cero infra adicional (sin Anthropic SDK, sin API key, sin gestión de tokens)
- Cero costo recurrente
- Mejor calidad de parsing (Opus 4.7 en sesión vs. Sonnet 4.6 que se usaría en server)
- La frecuencia es baja (~2 reuniones al mes — no justifica automatización full)
- Tomás ya abre Claude Code para todo; el "trigger" es pegarme el transcript acá, no entrar a una página

**Trade-off aceptado:** el flujo requiere abrir Claude Code (no una página de la app). Pero como Tomás ya lo hace para todo lo demás del proyecto, no agrega fricción.

---

## 3. Flujo end-to-end

```
1. Reunión termina → Tomás recibe transcript Fathom

2. Tomás abre Claude Code en este proyecto y me pega:
   "Procesá reunión de Dentilandia: <transcript completo>"

3. YO (Claude Code) ejecuto el workflow:
   a. Leo Supabase actual del cliente:
      GET /api/tasks?clientId=client-X&embedToken=...
   b. Parseo el transcript (capacidad nativa, no API)
   c. Cross-check fuzzy con tareas existentes:
      - Detectar nuevas (no matchean ninguna existente)
      - Detectar completadas ("ya está", "lo cerramos", etc.)
      - Detectar updates (responsable nuevo, fecha cambiada)
   d. Genero la minuta en formato consultor (ver §4)
   e. Te muestro diff completo en chat:
      • Nuevas tareas: lista numerada con título + módulo + responsable + fecha
      • Tareas completadas: lista de IDs + títulos
      • Tareas actualizadas: lista de cambios "X: campo: viejo → nuevo"
      • Minuta: preview del markdown

4. Vos aprobás o pedís ajustes en chat:
   "borrá la 3", "cambiá responsable de la 5 a Lina", "agregá: ...", etc.

5. Cuando vos decís "dale, aplicá", YO ejecuto:
   • POST /api/tasks/bulk-create     → tareas nuevas (devuelve IDs)
   • POST /api/tasks/:id/complete    → cada completada
   • PATCH /api/tasks/:id            → cada actualización
   • POST /api/meetings              → guarda meeting con FK a tareas

6. Embed se actualiza solo (refresh 30s).
   Pestaña "Minutas" en /client/[id] muestra la minuta nueva.

7. (Opcional, on-demand) Cuando vos decís "publicá la última minuta en Miro",
   yo leo de Supabase y creo Doc en el board vía mcp__claude_ai_Miro__doc_create.
   Marco miro_doc_id + miro_synced_at en la fila.
```

---

## 4. Estructura de la minuta (formato consultor completo)

Markdown que Claude genera y queda guardado en `meetings.minuta_md`.

```markdown
# Reunión {Cliente} · {fecha} · {duración}min
**Asistentes:** {lista}

## Contexto
2-3 párrafos resumiendo de qué se habló y por qué.

## Decisiones tomadas
- Decisión 1 (con racional breve)
- Decisión 2

## Compromisos / próximos pasos
| Quién | Qué | Cuándo |
|---|---|---|
| Lina | … | 15 may |
| Jorge | … | Por definir |

## Temas abiertos / a debatir en próxima reunión
- …

## Insights estratégicos (opinión consultor)
- 1-2 observaciones que valga registrar
```

Las 6 secciones son fijas. Si Claude no detecta contenido para alguna sección, queda vacía con "—" o se omite (decisión: queda vacía con "—" para mantener estructura consistente).

---

## 5. Arquitectura técnica

### 5.1 Tabla nueva en Supabase

```sql
CREATE TABLE meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT NOT NULL,                   -- slug, ej "client-dentilandia"
                                                    -- (no hay tabla clients, viven en código)
  fecha_reunion   DATE NOT NULL,
  duracion_min    INT,
  asistentes      TEXT[] DEFAULT '{}',
  transcript_raw  TEXT NOT NULL,                   -- fuente original, auditoría
  minuta_md       TEXT NOT NULL,                   -- markdown formateado por Claude

  tareas_creadas_ids       UUID[] DEFAULT '{}',    -- FKs a tasks.id
  tareas_completadas_ids   UUID[] DEFAULT '{}',
  tareas_actualizadas_ids  UUID[] DEFAULT '{}',

  pending_miro_sync BOOLEAN DEFAULT TRUE,          -- si todavía no se publicó Doc
  miro_doc_id       TEXT,                          -- después del publish on-demand
  miro_synced_at    TIMESTAMPTZ,

  created_by        TEXT,                          -- email Tomás
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meetings_client_id ON meetings(client_id);
CREATE INDEX idx_meetings_pending_sync
  ON meetings(pending_miro_sync) WHERE pending_miro_sync = true;

-- RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY meetings_select_own ON meetings FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'consultant' OR p.client_id = meetings.client_id)
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
```

**No incluye** `claude_model`, `tokens_*`, `cost_usd` — del spec original que asumía Anthropic SDK; sin SDK no aplica.

### 5.2 Endpoints nuevos

| Método + Path | Auth | Cuerpo | Devuelve |
|---|---|---|---|
| `POST /api/meetings` | `checkAuth` (sesión Tomás o token-fallback) | `{ clientId, fecha_reunion, duracion_min, asistentes, transcript_raw, minuta_md, tareas_creadas_ids, tareas_completadas_ids, tareas_actualizadas_ids }` | `{ ok, meeting: {...} }` |
| `GET /api/meetings?clientId=X` | `checkAuth` | — | `{ meetings: [...] }` ordenadas por fecha desc |
| `PATCH /api/meetings/:id` | `checkAuth` (sesión o token) | `{ miro_doc_id, miro_synced_at, pending_miro_sync: false }` | `{ ok }` — usado por mí (Claude Code, vía token) cuando publico el Doc en Miro |

Todos siguen el mismo patrón de los endpoints de tareas: `checkAuth` para auth, `service_role` cuando viene vía token, RLS-aware client cuando viene vía session.

### 5.3 Refactor de UI: pestaña "Minutas"

`/client/[id]/page.tsx` ya tiene una tab "minutas" que hoy lee de `useData().getClientMinutes(clientId)` (data hardcoded en `data-context.tsx`). Cambia a:

```tsx
const [meetings, setMeetings] = useState<Meeting[]>([]);

useEffect(() => {
  fetch(`/api/meetings?clientId=${clientId}`)
    .then(r => r.json())
    .then(d => setMeetings(d.meetings || []));
}, [clientId]);
```

Vista: lista cronológica reverse (más nueva arriba). Cada item muestra fecha + asistentes + cantidad de tareas tocadas. Click expande el `minuta_md` renderizado como markdown.

Si una minuta tiene `pending_miro_sync = true`, badge sutil "Sin publicar en Miro".

### 5.4 Auth strategy

- Endpoints aceptan tanto sesión Supabase como `embedToken` (vía `checkAuth`) — consistente con el resto del backend.
- En la práctica, **yo (Claude Code) los llamaré con embedToken** (no tengo sesión interactiva), por eso necesitan soportar token.
- La pestaña "Minutas" en la app los llamará con sesión (Tomás logueado).

### 5.5 Workflow doc updated

`~/.claude/projects/c--Users-TOMAS-Desktop-consultoria-app/memory/workflow_post_reunion.md` se actualiza para reflejar el nuevo flujo: ya no genero SQL para que Tomás copie, ahora YO ejecuto los endpoints directamente.

---

## 6. Componentes a construir

| Componente | Archivo | Status |
|---|---|---|
| Migración tabla `meetings` | `supabase/migrations/00X_meetings.sql` | Nuevo |
| Endpoint `POST /api/meetings` | `src/app/api/meetings/route.ts` | Nuevo |
| Endpoint `GET /api/meetings` | `src/app/api/meetings/route.ts` (mismo file) | Nuevo |
| Endpoint `PATCH /api/meetings/:id` | `src/app/api/meetings/[id]/route.ts` | Nuevo |
| Tipo `Meeting` en types | `src/lib/types.ts` | Modificar (agregar) |
| Refactor pestaña "Minutas" | `src/app/client/[id]/page.tsx` | Modificar (reemplazar fuente de datos) |
| Workflow doc actualizado | `memory/workflow_post_reunion.md` | Modificar |

**No se construye:**
- ❌ `/api/meetings/process` con Anthropic SDK
- ❌ Página `/client/[id]/procesar-reunion` (no hace falta — el trigger es chat conmigo)
- ❌ Cron de sync Miro (es on-demand, lo hago yo en sesión cuando me decís)

---

## 7. Manejo de errores

| Escenario | Comportamiento |
|---|---|
| Yo parseo mal una tarea (responsable invertido) | Vos me corregís en chat antes de confirmar; cero impacto en BD |
| `POST /api/meetings` falla a mitad de la transacción | Rollback parcial es complejo en Postgres SQL puro; aceptamos que las tareas ya creadas quedan, la meeting falla — yo te aviso y reintentás manualmente con el JSON de tareas existentes (no se duplican porque la meeting no existe aún) |
| El transcript está vacío o es muy corto | Yo te aviso ("no detecté contenido sustancial") y abortamos |
| Tomás aprueba pero después arrepiente de una tarea | DELETE manual desde la pestaña Minutas o desde el embed; no hay "rollback de meeting" — el patrón es agregar/corregir, no deshacer |
| Network falla cuando publico Doc en Miro | Reintentamos en la próxima sesión; `pending_miro_sync` queda `true` |

---

## 8. Plan de testing

### 8.1 Funcional (manual)
1. Tomás me pega un transcript real de Dentilandia
2. Yo ejecuto el workflow completo y muestro diff
3. Tomás aprueba
4. Verificar:
   - Pestaña Minutas en `/client/client-dentilandia` muestra la nueva minuta
   - Tareas nuevas aparecen en el embed
   - Tareas marcadas como Completada desaparecen del embed (correctamente)
   - El % de avance del módulo sube
5. Tomás dice "publicá en Miro"
6. Verificar que aparece nuevo Doc en el board de Dentilandia con el contenido esperado

### 8.2 Endpoint testing (curl)
- `POST /api/meetings` sin token → 401
- `POST /api/meetings` con token + payload válido → 200 + meeting creado
- `GET /api/meetings?clientId=X` con token → 200 + array
- `PATCH /api/meetings/:id` sin auth → 401
- `PATCH /api/meetings/:id` con token + payload válido → 200 + flags actualizados

### 8.3 No-regresión
- Embed sigue funcionando 10/10 acceptance tests
- pegar-pendientes (JSON manual) sigue funcionando

---

## 9. Rollout

### Fase 1 — Backend + tabla (este sprint)
1. Migración `meetings` en Supabase (correr a mano via Supabase SQL editor)
2. Implementar 3 endpoints
3. Curl tests

### Fase 2 — UI minutas (este sprint)
4. Refactor pestaña "Minutas" para leer del nuevo endpoint
5. Test manual: probar con minuta vieja (insert manual de prueba)

### Fase 3 — Workflow real (este sprint, end-to-end)
6. Actualizar `workflow_post_reunion.md`
7. Probar con próximo transcript real (cuando Tomás tenga reunión, lo procesamos juntos)

### Reversibilidad
- Borrar tabla `meetings` no afecta a `tasks` (FK son arrays, no constraints)
- Endpoints nuevos no tocan endpoints existentes
- La pestaña "Minutas" si no carga del endpoint, fallback a array vacío

---

## 10. Estimación

| Fase | Tiempo |
|---|---|
| Pre-flight (migración SQL Supabase) | 10 min |
| 3 endpoints + curl tests | 1.5 h |
| Tipo `Meeting` + refactor pestaña Minutas | 1 h |
| Workflow doc | 15 min |
| Test E2E con transcript real | 30 min |
| **Total** | **~3.5 horas** |

---

## 11. Out of scope (intencional)

- Editar minutas después de creadas (si hay error tipográfico vivís con eso o yo te ayudo a generar SQL puntual)
- Compartir minuta como link público (las minutas son internas; el embed ya tiene la lista de tareas)
- Versioning de minutas (cada minuta es immutable post-creación)
- UI para crear minutas sin Claude (ej. escribir directamente en la app — `pegar-pendientes` cubre el caso de "tareas sin reunión")
- Endpoint de delete (si tomás necesita borrar una minuta, lo hago yo en sesión via SQL)
