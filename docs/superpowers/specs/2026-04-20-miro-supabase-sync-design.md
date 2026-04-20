# Miro ↔ App: Sincronización en una sola fuente

**Fecha:** 2026-04-20
**Autor:** Tomás + Claude
**Estado:** Diseño aprobado verbalmente, pendiente revisión escrita

---

## 1. Problema

Hoy hay **dos copias del mismo dato** sin sincronización automática:

- La `data_table` "SEGUIMIENTO DE TAREAS v2" en cada board de Miro (5 clientes).
- La tabla `tasks` en Supabase con 222 tareas migradas.

Cuando Tomás marca una tarea completada en la app, Supabase se actualiza pero Miro no. Cuando Claude (vía Fathom transcript) actualiza Miro a mano, Supabase no se entera. Resultado: el dashboard que Tomás mira a diario en Miro está desincronizado del progreso real, y la app muestra estados que no son los del board.

El intento previo de "widget en Miro que linkea a la app" generó reproceso porque obliga a hacer click para salir del board — la información ya debería estar visible **dentro** de Miro sin intermediarios.

## 2. Objetivos

1. **Una sola fuente de verdad** para tareas.
2. **Una sola interfaz de edición**: la app (web + móvil).
3. **Miro siempre refleja el estado real** sin intervención manual.
4. **Workflow Fathom integrado en la app**, no en Claude del navegador.
5. **El cliente sigue viendo su plan en vivo** vía el embed.

## 3. No-objetivos

- **No** sincronización bidireccional en tiempo real (overkill para 5 clientes / 1 editor).
- **No** webhook listener para cambios en Miro (no es necesario porque Tomás se compromete a no editar Miro a mano).
- **No** soporte para que el equipo (Paulina, Juan Esteban) edite tareas — solo Tomás edita.
- **No** UI nueva para los clientes (siguen viendo el embed actual).

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
│          │                             │                     │
│          │ read/write                  │ read-only          │
│          ▼                             ▼                     │
│   ┌────────────────────────────────────────────┐            │
│   │              SUPABASE (tasks)              │            │
│   │             FUENTE DE VERDAD               │            │
│   └─────────────────┬──────────────────────────┘            │
│                     │ push (síncrono)                       │
│                     ▼                                        │
│   ┌────────────────────────────────────────────┐            │
│   │         MIRO data_table (5 boards)         │            │
│   │         VISTA — read-only para humanos     │            │
│   └────────────────────────────────────────────┘            │
│                     ▲                                        │
│                     │ observa pero no edita                 │
│              Tomás (Miro app)                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Regla de oro:** Cualquier escritura a `tasks` en Supabase dispara un push correspondiente al `data_table` de Miro del cliente afectado. Si el push a Miro falla, la operación en Supabase **igual se confirma** (Supabase es la verdad), pero se registra el fallo y se muestra un badge en la UI: "Miro desincronizado — reintentar".

## 5. Componentes

### 5.1 Capa de escritura a Miro (`src/lib/miro-writer.ts`)

Nuevo módulo que encapsula las 3 operaciones de Miro:

- `setRowEstado(clientId, taskTitulo, estado)` — cambia el dropdown Estado de una fila existente. Resuelve la fila por título exacto (case-insensitive).
- `createRow(clientId, task)` — agrega una fila nueva con todos los campos.
- `updateRow(clientId, taskTitulo, fields)` — edita campos de una fila existente.

Internamente usa la API experimental `https://api.miro.com/v2-experimental/boards/{board}/tables/{tableId}/rows` que ya está validada en `/api/miro/complete`.

Requiere `MIRO_ACCESS_TOKEN` con scope `boards:write`. Si falta, las funciones devuelven `{ ok: false, code: "missing_scope" }` sin lanzar excepción (la operación de Supabase no debe fallar por eso).

### 5.2 Endpoints API

| Endpoint | Cambio |
|---|---|
| `POST /api/tasks/[id]/complete` | **Modificar**: después de actualizar Supabase, llamar `setRowEstado(...)` |
| `PATCH /api/tasks/[id]` | **Modificar**: después del update, llamar `updateRow(...)` con los campos cambiados; si cambió `estado`, llamar `setRowEstado(...)` |
| `POST /api/tasks/bulk-create` | **Modificar**: después de insertar a Supabase, llamar `createRow(...)` por cada tarea nueva |
| `DELETE /api/tasks/[id]` | **Modificar**: después de borrar de Supabase, eliminar la fila de Miro (vía `deleteRow`) |
| `POST /api/meetings/process` | **Nuevo**: recibe transcript Fathom, llama Anthropic API, devuelve diff propuesto (sin aplicar) |
| `POST /api/meetings/apply` | **Nuevo**: recibe diff editado por el usuario, lo ejecuta como secuencia de creates/updates/completes |
| `/api/miro/complete`, `/api/miro/tasks` | **Eliminar** — reemplazados por la capa interna |

### 5.3 Página nueva: "Actualizar desde reunión"

Ruta: `/dashboard/meeting-import` (autenticado, solo Tomás).

Flujo en 3 pasos:

1. **Pegar transcript**
   - Selector de cliente (CYGNUSS, Dentilandia, AC Autos, Paulina, Lativo)
   - Textarea grande para el transcript de Fathom
   - Botón "Procesar con AI"

2. **Revisar diff propuesto**
   - Lista de cambios agrupados por tipo: nuevas tareas, completadas, editadas
   - Cada cambio es una card editable: título, módulo, responsable, prioridad, fecha
   - Checkbox por cada cambio para incluir/excluir
   - Vista previa de impacto: "Vas a agregar X tareas, completar Y, editar Z"
   - Botón "Aplicar" / "Cancelar"

3. **Aplicar y confirmar**
   - Ejecuta la secuencia
   - Muestra progreso (10/15 aplicados)
   - Reporta éxitos y fallos por separado
   - Si Miro falla, muestra badge "X tareas en Supabase OK pero no llegaron a Miro — reintentar"

Diseño visual: pendiente de iteración con `web-design`.

### 5.4 Servicio de procesamiento de transcript (`src/lib/meeting-processor.ts`)

Función `processTranscript(clientId, transcript)`:

1. Carga las tareas existentes del cliente (Supabase) para dar contexto a Claude.
2. Llama Anthropic API con un prompt sistema que contiene:
   - Lista de tareas existentes del cliente
   - Esquema esperado del JSON de salida (con módulos válidos, estados válidos, etc.)
   - Reglas: no inventar tareas, mapear menciones a tareas existentes cuando sea posible
3. Recibe JSON con `creates`, `completes`, `updates`.
4. Valida el JSON contra esquema (Zod).
5. Devuelve el diff con IDs internos para que la UI pueda editar antes de aplicar.

Modelo: `claude-sonnet-4-6` (rápido y suficientemente capaz para esta tarea estructurada).
Caching: prompt cache para el system prompt (lista de tareas existentes cambia, pero el resto no).

### 5.5 Cleanup

- Borrar los 5 widgets verdes de los boards (script ya validado).
- Eliminar `src/lib/miro-data.ts` (cache obsoleto).
- Eliminar `/api/miro/tasks` (no se usa más).

## 6. Configuración requerida

Variables de entorno en Netlify (production):

| Var | Valor | Notas |
|---|---|---|
| `MIRO_ACCESS_TOKEN` | (token regenerado con scope `boards:write`) | Crítico — sin esto, los pushes a Miro no funcionan |
| `ANTHROPIC_API_KEY` | (API key de console.anthropic.com) | Para `/api/meetings/process` |

## 7. Manejo de errores y casos borde

- **Push a Miro falla pero Supabase OK**: la operación se confirma, se loguea el error, y la próxima vez que el usuario abra el dashboard verá un badge "N tareas desincronizadas con Miro — reintentar". El botón reintenta solo los items pendientes.
- **Tarea con título duplicado en Miro**: `setRowEstado` actualiza la primera coincidencia y loguea warning. Mitigación: validar unicidad de títulos por cliente al crear.
- **Tomás edita Miro a mano** (caso prohibido pero realista): el cambio se pierde la próxima vez que la app actualice esa fila. Mitigación: documentar la regla en CLAUDE.md y poner un warning visual en el board (sticky note: "No editar — gestionado desde la app").
- **Anthropic API down**: la página "Actualizar desde reunión" muestra error y permite pegar el JSON manualmente como fallback.
- **Miro API rate limit (60 req/min)**: el bulk apply ejecuta secuencialmente con throttle de 1 req/segundo.
- **Token Miro expirado**: error 401 → la app muestra banner persistente pidiendo regenerar token.

## 8. Migración

1. Validar que las 222 tareas en Supabase corresponden 1:1 con las filas en `data_table` de Miro (puede haber drift desde la migración inicial).
2. Si hay drift, decidir caso por caso: ¿usar Supabase o Miro como verdad para reconciliar?
3. Una vez reconciliado, activar los pushes.
4. Borrar widgets.
5. Agregar sticky note de warning en cada board.

## 9. Fuera de alcance (futuro)

- Auto-clasificar módulo de tarea con AI.
- Sugerir prioridad basada en histórico.
- Generar resumen ejecutivo del cliente para el embed.
- Crear usuarios de los clientes en Supabase Auth (pendiente independiente).
- Arreglar carga del histórico (`MIRO_ACCESS_TOKEN` solo soluciona la parte de write — el read de histórico también lo necesita).

## 10. Preguntas abiertas

- **Modelo Anthropic**: confirmado `claude-sonnet-4-6` o ¿prefieres `claude-opus-4-7` para mejor calidad a 5x el costo?
- **Idempotencia de bulk apply**: si el usuario aplica dos veces el mismo diff por error, ¿qué pasa? Propuesta: cada diff tiene un UUID y se rechaza si ya se aplicó.
- **Confirmación destructiva**: completar una tarea es reversible (vuelves a En curso). Borrar una tarea no. ¿Pedir confirmación extra?

## 11. Criterios de aceptación

- [ ] Marcar una tarea como completada en la app actualiza la columna Estado de la fila correspondiente en Miro en menos de 5 segundos.
- [ ] Crear una tarea nueva en la app aparece como fila nueva en Miro en menos de 5 segundos.
- [ ] Editar responsable/prioridad/fecha en la app se refleja en Miro en menos de 5 segundos.
- [ ] Pegar un transcript de Fathom genera un diff procesable en menos de 30 segundos.
- [ ] El usuario puede editar cada cambio del diff antes de aplicar.
- [ ] Si la API de Miro falla, el cambio en Supabase se confirma igual y la app muestra el estado de "desincronizado".
- [ ] Los 5 widgets verdes están borrados de Miro al finalizar.
