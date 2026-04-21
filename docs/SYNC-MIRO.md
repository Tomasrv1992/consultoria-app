# Sync Supabase → Miro `data_table`

Procedimiento que cualquier Claude session sigue para sincronizar las tareas de Supabase a los `data_table` de Miro de los 5 clientes.

**Cuándo se corre:**
- Automático: cron remote agent diario a las 18:00 (configurado vía `superpowers:schedule`).
- On-demand: Tomás dice "sync miro [cliente]" o "sync miro all" en Claude Code.

**Por qué lo hace Claude (y no la app Next.js):**
La REST API de Miro no permite leer/escribir filas del `data_table` con scopes estándar (validado: retorna 403 incluso con `boards:write`). Solo el MCP `mcp__claude_ai_Miro__*` tiene acceso, y solo desde una sesión Claude con OAuth interactivo a Miro.

---

## Configuración estática

| Cliente | Supabase clientId | Miro boardId | Miro tableId (widgetId) |
|---|---|---|---|
| CYGNUSS | `client-cygnuss` | `uXjVGVc5G44=` | `3458764667959790602` |
| Dentilandia | `client-dentilandia` | `uXjVGMGFP5o=` | `3458764667959702763` |
| AC Autos | `client-acautos` | `uXjVGNKVGKI=` | `3458764667959833246` |
| Paulina Zarrabe | `client-paulina` | `uXjVGNKZkmM=` | `3458764667959874411` |
| Lativo | `c5` | `uXjVGrJ405k=` | `3458764667959874614` |

URL para MCP por cliente: `https://miro.com/app/board/{boardId}/?moveToWidget={tableId}`

URL Supabase API (read tasks): `https://consultoria-ea.netlify.app/api/tasks?clientId={clientId}&embedToken=embed-consultoria-a7x9k2m5p3`

---

## Procedimiento (por cliente)

### Paso 1 — Leer Supabase

```bash
curl -s "https://consultoria-ea.netlify.app/api/tasks?clientId={clientId}&embedToken=embed-consultoria-a7x9k2m5p3"
```

Respuesta (relevante):
```json
{
  "tasks": [
    {
      "id": "uuid",
      "titulo": "...",
      "modulo": "Mercadeo",
      "responsable": "Paulina",
      "prioridad": "Alta",
      "fecha": "Abr 14 2026",
      "estado": "En curso",
      "rowId": "miro-row-uuid-or-null"  // populated after first sync
    }
  ]
}
```

### Paso 2 — Leer Miro (con paginación)

Llamar `mcp__claude_ai_Miro__table_list_rows` con:
- `miro_url`: del cuadro arriba
- `limit`: 100 (paginar si hay más con `next_cursor`)

Cada row tiene:
- `rowId`: identificador estable
- `cells`: array de `{columnTitle, valueType, content, options}`

Columnas relevantes: `Tarea`, `Estado`, `Responsable`, `Prioridad`, `Fecha límite`, `Área`, `Fecha ingreso`.

Para extraer texto de una celda:
- Si `valueType === "text"`: usar `content` (puede ser JSON Delta — parsear `ops`)
- Si `valueType === "select"`: usar `options[0].displayValue`

### Paso 3 — Calcular diff

Por cada tarea Supabase:

1. **Match preferente por `rowId`** (si Supabase tiene `miro_row_id` no null).
2. **Match fallback por `titulo` exacto** (case-insensitive, trimmed) contra columna "Tarea" de Miro.

Casos:
- **Match con cambios**: estado, responsable, prioridad, módulo o fecha distintos → UPDATE row.
- **No match**: tarea nueva → INSERT row.
- **Row Miro sin tarea Supabase**: NO borrar — reportar para revisión manual de Tomás.

### Paso 4 — Aplicar via MCP

Llamar `mcp__claude_ai_Miro__table_sync_rows` con:
- `miro_url`: del cuadro arriba
- `rows`: array de cambios

Estructura de cada row:

**UPDATE** (preserva rowId):
```json
{
  "rowId": "uuid",
  "cells": [
    {"columnTitle": "Estado", "value": "Completada"},
    {"columnTitle": "Responsable", "value": "Paulina"}
  ]
}
```

**INSERT** (sin rowId):
```json
{
  "cells": [
    {"columnTitle": "Tarea", "value": "Nueva tarea X"},
    {"columnTitle": "Estado", "value": "En curso"},
    {"columnTitle": "Responsable", "value": "Tomás"},
    {"columnTitle": "Prioridad", "value": "Alta"},
    {"columnTitle": "Área", "value": "Mercadeo"},
    {"columnTitle": "Fecha límite", "value": "30/04/2026"}
  ]
}
```

**Throttle**: Miro acepta batches grandes en una sola llamada. Si hay >50 cambios, dividir en lotes de 50.

### Paso 5 — Backfill `miro_row_id` en Supabase

Para cada tarea recién insertada (paso 4 INSERT que devolvió un rowId nuevo):

```bash
curl -X PATCH "https://consultoria-ea.netlify.app/api/tasks/{taskId}" \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"miro_row_id":"<new-rowId>"}'
```

⚠️ El endpoint PATCH actual NO tiene campo `miro_row_id` en su esquema. Si esto se necesita, hay que agregar el campo al PATCH endpoint primero. Para el primer sync, omitir este paso — match por título seguirá funcionando.

### Paso 6 — Reportar

Al final del sync de un cliente, generar reporte:
```
=== {clienteName} ===
✓ Updated: N rows
✓ Inserted: M rows
⚠ En Miro pero no en Supabase: K rows (revisar manualmente):
  - "Título de la tarea"
  - ...
```

---

## Reglas críticas

1. **Supabase es la fuente de verdad.** Si hay conflicto, prevalece Supabase.
2. **Nunca borrar rows de Miro automáticamente.** Solo reportar.
3. **Usar `miro_row_id` cuando exista**, fallback a título solo si no.
4. **Match de título es case-insensitive y trimmed** para tolerar espacios/mayúsculas.
5. **Estados válidos en Miro**: "En curso", "Iniciativa", "Completada", "Bloqueada". Mapear desde Supabase si los nombres difieren (ej: "completada" → "Completada").
6. **Si la columna Tarea/Title está duplicada**, Miro tiene 2 columnas similares (Title y Tarea). Usar **Tarea** que es la que el usuario lee.

---

## Ejecución del cron a las 18:00

El remote agent ejecuta:
1. Para cada cliente en orden: cygnuss, dentilandia, acautos, paulina, c5
2. Procedimiento completo (pasos 1-6)
3. Output en el panel de triggers de Claude Code
4. Si algún cliente falla, continúa con los siguientes y reporta al final

Si el MCP de Miro no está disponible en el contexto del cron (porque la auth interactiva no se mantiene en background), el cron falla y notifica. Tomás corre el sync manual cuando vea el aviso.
