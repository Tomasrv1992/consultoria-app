# HANDOVER — Estado actual y cómo retomar

**Última actualización:** 2026-04-29
**Snapshot del trabajo en curso al cambiar de PC.**

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
| 5 widgets verdes en Miro | ✅ borrados |
| Minutas Dentilandia | ✅ 8 abr, 15 abr, 22 abr, 29 abr (todas en fila y=18604) |

## Estado de sincronización por cliente

| Cliente | Miro | Supabase | Pendiente |
|---|---|---|---|
| CYGNUSS | 40 ✅ | 40 ✅ | Nada |
| Dentilandia | ~98 (post 22+29 abr) | 50 únicos (100 con dupes) | **SQL pendiente** |
| AC Autos | 21 ✅ | 22 con dupes (11 únicos) | **SQL pendiente** |
| Paulina | 18 ✅ | 60 con dupes (30 únicos) + 7 orphans | **SQL pendiente** |
| Lativo | 5 ✅ | 0 | **SQL pendiente** (5 orphans) |

## TAREA ABIERTA #1 — Aplicar el SQL consolidado

El SQL local incluye:
1. Migración: agregar columna `miro_row_id`
2. Dedup: eliminar duplicados de Dentilandia + AC Autos + Paulina
3. DELETE 31 tareas que Tomás quitó de Dentilandia el 22 abril
4. INSERT 49 tareas Dentilandia (orphans + 27 nuevas reunión 22 abril) — con miro_row_id
5. INSERT 10 orphans AC Autos
6. INSERT 7 orphans Paulina
7. INSERT 5 orphans Lativo

**Archivo local (NO commiteado por privacidad):**
```
c:/Users/TOMAS/Desktop/consultoria-app/scripts/sync-cleanup.sql
```

⚠️ **Este SQL está desactualizado — no incluye los cambios del 29 abril.** Antes de aplicarlo, regenerar (instrucciones más abajo).

## TAREA ABIERTA #2 — Sincronizar reunión 29 abril a Supabase

El 29 abril se aplicaron en Miro:
- 29 INSERTs (tareas nuevas con `Fecha ingreso = 29/04/2026`)
- 2 UPDATEs (Andrés→Clara responsable, Melisa título extendido)
- 1 COMPLETADA: "Definir y comprar obsequios educativos Día Niños"

Ninguno de estos cambios está aún en Supabase. Cuando Tomás termine de organizar Miro, regenerar el SQL para que incluya:
- Todo lo del SQL anterior
- + los 29 inserts del 29 abril
- + las 2 actualizaciones
- + el cambio a Completada
- + DELETE de cualquier cosa que Tomás haya borrado durante su edición

Regenerar con:
1. Abrir Claude Code en el repo
2. Decir: "Tomás terminó de organizar Miro Dentilandia, regenera el SQL final"
3. Claude ejecuta el flujo: lee Miro actual + Supabase + diff + escribe el SQL nuevo a `scripts/sync-cleanup.sql`

**Archivo local (NO commiteado por privacidad):**
```
c:/Users/TOMAS/Desktop/consultoria-app/scripts/sync-cleanup.sql
```

**Cómo llevarlo al PC nuevo:**
- **Opción A (más simple):** copia el archivo `sync-cleanup.sql` por USB/Drive/email/Slack
- **Opción B (regenerar):** en el PC nuevo, dile a Claude "regenera el SQL de cleanup leyendo Miro y Supabase de nuevo" — toma ~10 min

**Cómo aplicarlo:**
1. https://supabase.com → proyecto → SQL Editor → New query
2. Pegar el contenido del SQL
3. Run
4. Verificar que el SELECT final muestra:
   - c5: 5
   - client-acautos: 21
   - client-cygnuss: 40
   - client-dentilandia: 95
   - client-paulina: 37

## Después del SQL — Sync final

Una vez el SQL corra OK, dile a Claude:
> "El SQL ya corrió, hace el sync final de los 5 clientes."

Claude re-corre el procedimiento de `docs/SYNC-MIRO.md` para los 5 clientes. Como ahora Supabase está limpio + tiene los rowIds, los matches son perfectos y el sync queda 100%.

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
> "Estoy retomando el trabajo de Miro-Supabase sync. Lee `docs/HANDOVER.md` y dame status actual."

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

---

## Cosas pendientes pre-existentes (no urgentes, pero anotadas)

- **Crear usuarios clientes en Supabase Auth** — los emails como `contacto@cygnuss.com` no pueden hacer login todavía
- **`MIRO_ACCESS_TOKEN` en Netlify env vars** — para que el histórico se lea en el embed
- **Instalar Anthropic SDK + endpoint `/api/meetings/process`** — para que el flujo Fathom se procese DENTRO de la app (en vez de en Claude del navegador). Diferido del plan original — no urgente porque el cron + flujo manual ya funciona.

---

## Commits relevantes para entender la historia

```
46202e5 sync: option D — claude/MCP based Supabase→Miro sync
f0daf69 plan: miro-supabase sync implementation
7509f92 spec: miro-supabase sync design
8866334 cleanup: remove legacy miro cache files and admin endpoints
f29fc00 dynamic OG image per client for Miro link preview
```
