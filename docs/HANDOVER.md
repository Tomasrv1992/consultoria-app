# HANDOVER — Estado actual y cómo retomar

**Última actualización:** 2026-04-27
**Snapshot del trabajo en curso al cambiar de PC.**

---

## Si abres Claude Code por primera vez en este proyecto, di:

> "Estoy retomando el trabajo de Miro-Supabase sync. Lee `docs/HANDOVER.md` y dame status actual."

Eso es todo — Claude carga el contexto desde acá.

---

## Estado del sistema en producción

| Componente | Estado |
|---|---|
| App web | ✅ Live en https://consultoria-ea.netlify.app |
| Supabase | ✅ proyecto `gbulutnlacwjzqsrxoku.supabase.co` (Tomasrv1992's Project) |
| Cron sync 18:00 Bogotá | ✅ activo, trigger `trig_01AFWkRYkH53Dc4AMSNuGh5C` |
| Procedimiento sync | ✅ documentado en `docs/SYNC-MIRO.md` |
| 5 widgets verdes en Miro | ✅ borrados |

## Estado de sincronización por cliente

| Cliente | Sync inicial | Pendiente al cambiar PC |
|---|---|---|
| CYGNUSS (40) | ✅ 7 updates aplicados | Nada |
| Dentilandia | ⏳ 27 inserts hechos | **SQL cleanup pendiente** (50 dupes Supabase + 45 orphans Miro) |
| AC Autos (22→11) | ✅ 1 update + Cyrillic fix | **SQL cleanup pendiente** (11 dupes + 10 orphans) |
| Paulina (60→30) | ⏳ diff calculado | **SQL cleanup pendiente** (30 dupes + 7 orphans) |
| Lativo (0) | ⏳ 5 orphans en Miro | **SQL cleanup pendiente** |

## TAREA ABIERTA — Aplicar el SQL de cleanup

Generamos un SQL consolidado el 2026-04-22 que hace:
1. Migración: agregar columna `miro_row_id` a tabla `tasks`
2. Dedup: eliminar duplicados de Dentilandia, AC Autos, Paulina
3. INSERT 67 orphans (45 Dentilandia + 10 AC Autos + 7 Paulina + 5 Lativo)

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
