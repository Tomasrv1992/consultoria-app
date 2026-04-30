# HANDOVER — Estado actual y cómo retomar

**Última actualización:** 2026-04-30
**Snapshot del proyecto al final del día.**

---

## Si abres Claude Code por primera vez en este proyecto, di:

> "Estoy retomando el trabajo. Lee `docs/HANDOVER.md` y dame status actual."

Eso es todo — Claude carga el contexto desde acá + auto-memoria.

---

## Estado del sistema en producción

| Componente | Estado |
|---|---|
| App web | ✅ Live en https://consultoria-ea.netlify.app |
| Supabase | ✅ proyecto `gbulutnlacwjzqsrxoku.supabase.co` (Tomasrv1992's Project) |
| Cron sync 18:00 Bogotá | ✅ activo, trigger `trig_01AFWkRYkH53Dc4AMSNuGh5C` |
| Procedimiento sync | ✅ documentado en `docs/SYNC-MIRO.md` |
| Workflow post-reunión | ✅ guardado en auto-memoria `workflow_post_reunion.md` |

## Estado de sincronización por cliente

**Todos los clientes están sincronizados Miro ↔ Supabase con `miro_row_id` poblado en el 100% de las filas.** Cero deuda técnica de datos. El cron 18:00 hace match exacto por rowId, no por título.

| Cliente | Filas Supabase | Filas Miro | miro_row_id |
|---|---|---|---|
| CYGNUSS | 40 | 40 | 40/40 ✅ |
| Dentilandia | 70 | 70 | 70/70 ✅ |
| AC Autos | 13 | 13 | 13/13 ✅ |
| Paulina | 18 | 18 | 18/18 ✅ |
| Lativo (c5) | 5 | 5 | 5/5 ✅ |
| **Total** | **146** | **146** | **146/146** |

Última limpieza masiva: **30 de abril 2026** (eliminó dupes, sincronizó cambios reunión 29 abr Dentilandia, populó `miro_row_id` en todos los clientes).

---

## Tareas abiertas

### Ninguna técnica urgente.

El sistema está en estado consistente por primera vez en el proyecto. El cron diario mantiene el sync sin intervención.

### Pre-existentes (no urgentes)

- **Crear usuarios clientes en Supabase Auth** — emails como `contacto@cygnuss.com` no pueden hacer login todavía
- **`MIRO_ACCESS_TOKEN` en Netlify env vars** — para que el histórico se lea en el embed
- **Endpoint `/api/meetings/process` con Anthropic SDK** — para procesar transcripts Fathom dentro de la app (en vez de Claude del navegador). Diferido — el flujo manual ya funciona.
- **`scripts/` y `src/` están borrados del working tree local** (visible en `git status`). Existen en HEAD pero el working tree los marca como deleted. No bloquea nada de producción (Netlify usa el código del repo). Restaurar con `git restore .` cuando se vaya a tocar código del app.

### Notas de arquitectura por cliente

- **Lativo (c5)** es un proyecto de estructuración, no consultoría en dirección estratégica. Su board en Miro **no tiene columna "Área"** — los módulos en Supabase se asignaron manualmente. Si en algún momento se quiere alinear al esquema estándar, agregar la columna en Miro y el cron 18:00 va a empezar a tomarla automáticamente. Por ahora se deja así a propósito.

---

## Workflow para próximas reuniones

Cuando Tomás mande un transcript Fathom de reunión con un cliente, Claude ejecuta el flujo `workflow_post_reunion.md` (en auto-memoria):

1. Lee Supabase actual del cliente vía `/api/tasks?clientId=...&embedToken=...`
2. Parsea transcript: nuevas tareas + completadas + updates
3. Cross-check fuzzy con existentes
4. Muestra diff a Tomás (corto)
5. Aplica a Miro vía `mcp__claude_ai_Miro__table_sync_rows`
6. Crea minuta como Doc en Miro
7. **Espera a que Tomás organice Miro manualmente** (NO TOCAR mientras él edita)
8. Cuando Tomás dice "listo", regenera SQL para que Supabase replique los cambios

Como Supabase ahora tiene `miro_row_id` poblado, el matching post-edición es exacto y no hay drift.

---

## Embeds en Miro (opcional, no en uso)

Cada cliente tiene una página de embed disponible (read-only, refresh cada 30s):

```
https://consultoria-ea.netlify.app/embed/{clientId}/plan?token=embed-consultoria-a7x9k2m5p3
```

Donde `{clientId}` es: `client-cygnuss` · `client-dentilandia` · `client-acautos` · `client-paulina` · `c5`

Para insertar uno: en Miro → barra izquierda → "+" → "Embed" → pegar URL → seleccionar opción "Insert as embed" (no "Insert as link").

Decisión actual: **no se usan en producción** porque son read-only y la edición durante reuniones se hace en `data_table`. Quedan disponibles si en el futuro se quiere un panel-resumen con % de progreso siempre actualizado.

---

## Pasos para retomar en PC nuevo

### 1. Instalar Claude Code
Descarga de https://claude.com/code (Windows/Mac) o vía npm: `npm install -g @anthropic-ai/claude-code`

### 2. Clonar el repo
```bash
git clone https://github.com/Tomasrv1992/consultoria-app
cd consultoria-app
```

### 3. Crear `.env.local`
Copia este archivo del PC viejo (o pídeme que te lo regenere):
```
NEXT_PUBLIC_SUPABASE_URL=https://gbulutnlacwjzqsrxoku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidWx1dG5sYWN3anpxc3J4b2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzY4OTksImV4cCI6MjA5MjAxMjg5OX0.bd4g33wH7LGf23oBIuyvtrjbSmAVxcL6ntUW0qDi8XE
MIRO_ACCESS_TOKEN=eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_ZswowJ1_IPleSA0UGU-j5R5VW_s
NEXT_PUBLIC_MIRO_ACCESS_TOKEN=eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_ZswowJ1_IPleSA0UGU-j5R5VW_s
EMBED_SECRET=embed-consultoria-a7x9k2m5p3
```

### 4. Instalar deps
```bash
npm install
```

### 5. Verificar que funciona
```bash
npm run build
```
Debe completar sin errores.

### 6. Abrir Claude Code en la carpeta y arrancar
```bash
claude
```
Y como primer mensaje:
> "Estoy retomando el trabajo. Lee `docs/HANDOVER.md` y dame status actual."

### 7. (Opcional) Migrar la auto-memoria
La carpeta `~/.claude/projects/c--Users-TOMAS-Desktop-consultoria-app/memory/` (Windows: `C:\Users\TOMAS\.claude\projects\c--Users-TOMAS-Desktop-consultoria-app\memory\`) tiene los recordatorios del proyecto.

- **Copia esa carpeta entera** al PC nuevo en la misma ruta
- Si no la copias, no pasa nada — Claude empieza con memoria fresca pero el HANDOVER.md le da el contexto

---

## Plugins activos en Claude Code

Estos están instalados en tu sesión actual y conviene tenerlos en el PC nuevo (vía `/plugins` en Claude Code):

- `superpowers@claude-plugins-official`
- `figma@claude-plugins-official`
- `frontend-design@claude-plugins-official`
- `supabase@claude-plugins-official`

Y los MCP connectors (estos viven en tu cuenta de claude.ai, no en el PC):
- Miro (`https://mcp.miro.com`)
- Google Drive

---

## Decisiones arquitectónicas importantes (no perder)

1. **Miro REST API NO permite leer/escribir filas del data_table** con scopes estándar. Validado el 2026-04-21. Detalle en `docs/superpowers/specs/2026-04-20-miro-supabase-sync-design.md` §2.

2. **El sync corre desde Claude vía MCP**, no desde la app Next.js. Por eso necesita: o bien sesión interactiva de Claude Code, o bien el cron remoto que dispara un Claude agent en cloud.

3. **Supabase es la fuente de verdad** de tareas. Miro es una vista que se actualiza vía sync.

4. **NUNCA borrar filas de Miro automáticamente** durante el sync — solo reportar orphans. Esa regla previene perder data legítima.

5. **El cron diario 18:00 Bogotá** está activo. Si lo necesitas pausar/borrar: https://claude.ai/code/scheduled/trig_01AFWkRYkH53Dc4AMSNuGh5C

6. **Matching Miro ↔ Supabase usa `miro_row_id`** como key primaria. Título es fallback solo si rowId no está. Después de la limpieza del 30 abr, todas las filas tienen rowId — el matching es 100% exacto.

7. **Schema de la tabla `tasks`** (importante si vas a generar SQL nuevo):
   - `categoria` es **NOT NULL** con CHECK (`ingresos|gestion|operaciones|mercadeo`) — minúscula, sin tildes
   - `fecha_ingreso` es **TIMESTAMPTZ**, no TEXT — usar formato ISO `'2026-04-22T00:00:00+00:00'`
   - `modulo` es TEXT con valor display (`Mercadeo`, `Operaciones`, `Gestión interna`, `Ingresos`)
   - Mapeo `modulo → categoria` debe coincidir con `moduloToCategory` en `src/lib/miro-progress.ts`

---

## Commits relevantes para entender la historia

```
1d41cff docs: HANDOVER updated for PC migration (post 29 abr meeting)
46202e5 sync: option D — claude/MCP based Supabase→Miro sync
f0daf69 plan: miro-supabase sync implementation
7509f92 spec: miro-supabase sync design
8866334 cleanup: remove legacy miro cache files and admin endpoints
f29fc00 dynamic OG image per client for Miro link preview
```
