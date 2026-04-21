# Miro ↔ App: Sincronización vía Claude/MCP (Opción D)

**Fecha:** 2026-04-20 (revisado tras descubrir bloqueo de API REST)
**Autor:** Tomás + Claude
**Estado:** Diseño final aprobado

---

## 1. Problema

Hoy hay **dos copias del mismo dato** sin sincronización automática:

- La `data_table` "SEGUIMIENTO DE TAREAS v2" en cada board de Miro (5 clientes).
- La tabla `tasks` en Supabase con 222 tareas migradas.

Cuando Tomás marca una tarea completada en la app, Supabase se actualiza pero Miro no. Cuando Claude (vía Fathom transcript) actualiza Miro a mano, Supabase no se entera.

## 2. Bloqueo descubierto durante implementación inicial

El plan v1 asumía que la app Next.js podía escribir al `data_table` de Miro vía REST API (`/v2-experimental/boards/.../tables/...`). **Falso.** Pruebas confirmaron:

- GET/POST/PATCH a `/v2-experimental/boards/.../tables/...` retornan **403 Insufficient Permissions** incluso con scopes `boards:write` + `boards:read`.
- El widget `data_table_format` solo expone metadata vía `/v2/boards/.../items/{id}` (posición, fechas), no filas ni columnas.
- La REST API solo permite leer/escribir filas a **Miro Apps verificadas** (iframes que corren dentro de Miro), no a apps externas con OAuth tokens estándar.

## 3. Solución: Sincronización vía Claude/MCP

**Insight clave:** Yo (Claude vía Claude Code) **sí tengo acceso** al `data_table` de Miro a través de tools MCP (`mcp__claude_ai_Miro__table_list_rows` y `mcp__claude_ai_Miro__table_sync_rows`). Esos tools usan la sesión OAuth interactiva de Tomás con miro.com, no un API token de servicio.

Por lo tanto, **Claude se vuelve el sincronizador**:
- Tomás edita siempre en la app (Supabase = fuente de verdad).
- Una vez al día (automático a las 18:00) + on-demand cuando Tomás quiera, Claude:
  1. Lee tareas de Supabase
  2. Lee filas del `data_table` de Miro vía MCP
  3. Calcula diff
  4. Aplica cambios al `data_table` vía `mcp__claude_ai_Miro__table_sync_rows`

## 4. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Tomás (móvil/desktop)         Cliente (móvil)             │
│         │                              │                     │
│         ▼                              ▼                     │
│   ┌──────────────┐              ┌──────────────┐            │
│   │ App editor   │              │ App embed    │            │
│   │ (autenticado)│              │ (token URL)  │            │
│   └──────┬───────┘              └──────┬───────┘            │
│          │ read/write                  │ read-only          │
│          ▼                             ▼                     │
│   ┌────────────────────────────────────────────┐            │
│   │              SUPABASE (tasks)              │            │
│   │             FUENTE DE VERDAD               │            │
│   └─────────────────┬──────────────────────────┘            │
│                     │                                        │
│                     │ HTTP (vía /api/tasks)                 │
│                     ▼                                        │
│   ┌────────────────────────────────────────────┐            │
│   │   CLAUDE CODE (sesión interactiva o       │            │
│   │   remote agent cron @ 18:00)              │            │
│   └─────────────────┬──────────────────────────┘            │
│                     │ MCP table_sync_rows                   │
│                     ▼                                        │
│   ┌────────────────────────────────────────────┐            │
│   │         MIRO data_table (5 boards)         │            │
│   │         VISTA — actualizada vía Claude     │            │
│   └────────────────────────────────────────────┘            │
│                     ▲                                        │
│                     │ observa pero no edita                 │
│              Tomás (Miro app)                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 5. Componentes

### 5.1 Migración Supabase

Agregar columna `miro_row_id` a `tasks` para emparejar tareas Supabase ↔ filas Miro de manera estable (los rowIds de Miro son persistentes a sorting/insertion/deletion).

```sql
alter table public.tasks add column if not exists miro_row_id text;
create index if not exists tasks_miro_row_id_idx on public.tasks(miro_row_id);
```

### 5.2 Endpoint snapshot (opcional)

Reusar `/api/tasks?clientId=X&embedToken=...` que ya existe — no necesitamos endpoint nuevo. El snapshot de Miro lo lee directamente Claude vía MCP.

### 5.3 Procedimiento de sincronización (documentado en `docs/SYNC-MIRO.md`)

**Para cada cliente:**

1. **Leer Supabase**: `GET /api/tasks?clientId=X&embedToken=Y` → array de tareas con `id`, `titulo`, `modulo`, `responsable`, `prioridad`, `fecha`, `estado`, `miro_row_id` (si existe).

2. **Leer Miro**: `mcp__claude_ai_Miro__table_list_rows` con paginación (limit=200) → array de rows con `rowId`, `cells`.

3. **Calcular diff**:
   - **Match por `miro_row_id`** primero (lo más confiable).
   - **Match por `titulo` exacto** como fallback (case-insensitive, trimmed).
   - **Tareas en Supabase sin match en Miro** → INSERT row en Miro.
   - **Tareas en Miro sin match en Supabase** → reportar (no borrar — puede ser histórico que Tomás dejó intencional).
   - **Matches con campos diferentes** → UPDATE row en Miro.

4. **Aplicar**: `mcp__claude_ai_Miro__table_sync_rows` con array de rows (UPDATE incluyendo `rowId`, INSERT sin `rowId`).

5. **Backfill `miro_row_id`** en Supabase para tareas recién insertadas (PATCH a `/api/tasks/[id]` con el nuevo `miro_row_id`).

### 5.4 Cron remote agent @ 18:00 diario

Vía `superpowers:schedule` skill, se crea un trigger que dispara un Claude agent remoto cada día a las 18:00 (zona horaria Bogotá UTC-5). El agent:

1. Lee este spec + `docs/SYNC-MIRO.md`
2. Ejecuta el procedimiento para los 5 clientes
3. Reporta el resultado (cambios aplicados, errores) — visible en el panel de triggers de Claude Code

## 6. Flujo de Tomás día a día

| Cuándo | Qué hace Tomás | Qué pasa atrás |
|---|---|---|
| Después de meeting | Pega Fathom en `/client/[id]/pegar-pendientes` | Tareas a Supabase |
| Mientras maneja | Marca completada desde el celular | Cambio a Supabase |
| Cualquier momento | Abre app, edita responsable/fecha/etc | Cambio a Supabase |
| 18:00 diario | (nada, es automático) | Claude agent sincroniza Miro |
| On-demand urgente | Abre Claude Code, dice "sync miro" | Claude sincroniza Miro |
| Diaria visualización | Abre Miro, mira `data_table` | Ya está actualizada |

## 7. Manejo de errores

- **MCP no disponible en cron agent**: si el cron Claude no tiene acceso al MCP de Miro (porque la auth interactiva no está disponible en background), el cron falla y notifica. Tomás corre el sync manual cuando vea la notificación.
- **Diff con conflictos**: si una tarea está "Completada" en Miro pero "En curso" en Supabase, prevalece Supabase (es la fuente de verdad). Reportar para que Tomás revise manualmente.
- **Tarea borrada en Supabase pero presente en Miro**: NO borramos de Miro automáticamente (riesgo). Reportar para revisión manual.
- **Title duplicado**: el match por `miro_row_id` previene duplicados. Para tareas pre-existentes sin `miro_row_id`, primer sync hace match por título y backfillea el rowId.

## 8. Fuera de alcance

- Push automático a Miro en cada cambio (requiere Miro App, ~2 días).
- Bidireccional sync (editar en Miro y que se refleje en app) — Tomás se compromete a editar siempre en la app.
- Sticky notes overlay como vista alternativa.
- Anthropic API integration para procesar Fathom dentro de la app (Tomás puede seguir usando Claude del navegador, o lo agregamos después si conviene).

## 9. Criterios de aceptación

- [ ] Migración `miro_row_id` aplicada en Supabase
- [ ] `docs/SYNC-MIRO.md` documenta el procedimiento exacto que cualquier Claude session puede seguir
- [ ] Sync end-to-end probado en CYGNUSS — diff calculado y aplicado correctamente
- [ ] 4 clientes restantes sincronizados como validación masiva
- [ ] Cron @ 18:00 daily creado vía `superpowers:schedule`
- [ ] Tras el primer cron run exitoso, todos los `data_table` reflejan estado de Supabase

## 10. Migración / cleanup

- Sin código a borrar (el commit `64d8d6c` con `miro-writer.ts` ya fue revertido).
- Los 5 widgets verdes del Miro siguen ahí — no son urgentes de borrar pero se pueden remover en cualquier momento con el script `scripts/delete-miro-widgets.mjs` (ya validado en sesiones anteriores).

## 11. Trabajo desechado del plan v1

Lo siguiente quedó **fuera de scope** porque el bloqueo de API REST de Miro lo invalida:

- `src/lib/miro-writer.ts` (nunca funcionará via REST con scopes estándar)
- Cableado de `setRowEstado/createRow/updateRow/deleteRow` en endpoints
- `meeting-processor.ts` con Anthropic API (separable, puede agregarse después)
- Página `meeting-import` separada (Tomás usa `pegar-pendientes` que ya existe)
- Badge "Miro desincronizado" en dashboard (irrelevante con sync diario automático)
