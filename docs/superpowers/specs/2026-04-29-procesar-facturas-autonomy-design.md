# Procesar Facturas — Autonomía sin PC prendido

**Fecha:** 2026-04-29
**Autor:** Tomás + Claude (sesión nocturna; aprobación pendiente)
**Estado:** 🟡 Draft — pendiente revisión Tomás (4 preguntas abiertas marcadas con 🟡)
**Spec previo relacionado:** `docs/superpowers/specs/2026-04-22-gastos-facturas-design.md` (script + flujo manual)
**Alcance:** Cerrar el pendiente "decisión del cron" del Proyecto Procesar-Facturas. Autonomía single-tenant para Tomás, **con arquitectura forward-compatible con un futuro SaaS multi-tenant** (Proyecto B, separado).

> ⚠️ **Nota sobre ubicación de este archivo:** redactado en `C:\Users\Public\Documents\` porque Claude está corriendo como usuario `User` y no tiene permiso de escritura sobre `C:\Users\TOMAS\`. Mover este archivo a `docs/superpowers/specs/2026-04-29-procesar-facturas-autonomy-design.md` cuando Tomás lo apruebe (sesión Claude corriendo como TOMAS, o vía Explorer).

---

## 1. Problema

El pipeline `scripts/procesar-facturas.mjs` ya funciona end-to-end (27 facturas backfilled OK al 2026-04-27). Falta cerrar el último pendiente del proyecto: **autonomía**. Hoy Tomás tiene que escribir `/procesar-facturas` para disparar la corrida — si no, no se procesa nada.

Las 3 opciones evaluadas en el spec original (manual / Windows Task Scheduler / Vercel cron) se reducen a una sola tras dos descubrimientos:

1. **Tomás ya paga Netlify** (la app `consultoria-ea.netlify.app` corre ahí). No hace falta agregar Vercel.
2. **El cron remoto via `superpowers:schedule` no funciona** porque el agent no ve `.env.local`. Verificado en sesión anterior — confirmado en `procesar_facturas_status.md`.

**Decisión cerrada:** Netlify Scheduled Function. Agnóstico de PC prendido, plan Free de Netlify lo cubre, y deja la puerta abierta a vender el flujo como SaaS sin reescribir nada (ver §4.5).

---

## 2. Solución (one-liner)

Mover el código de `scripts/procesar-facturas.mjs` a dos Netlify Functions colocadas:

- **`netlify/functions/procesar-facturas-cron.mts`** — scheduled (cron `0 12 * * *` UTC = 7am Bogotá), liviana, su único trabajo es invocar al worker.
- **`netlify/functions/procesar-facturas-background.mts`** — background function (timeout 15 min) que ejecuta el pipeline real.

Resto del flujo (Gmail → Drive → Sheets, idempotencia por label, parseo DIAN UBL 2.1) **permanece idéntico** al script actual. Solo cambia el runtime y de dónde vienen los secrets.

---

## 3. Arquitectura

```
        Netlify Scheduler
        (cron: 0 12 * * * UTC)
                │
                ▼
   ┌──────────────────────────────┐
   │  procesar-facturas-cron.mts  │  ← Scheduled Fn (timeout 30s; usa <2s)
   │  Solo hace: fetch POST →     │
   └──────────────┬───────────────┘
                  │ POST internal (header secret)
                  ▼
   ┌──────────────────────────────────────┐
   │  procesar-facturas-background.mts    │  ← Background Fn (timeout 15min)
   │  Pipeline completo:                  │
   │   • Gmail list+download              │
   │   • ZIP extract + UBL parse          │
   │   • Drive folder/upload              │
   │   • Sheets append                    │
   │   • Gmail label "Procesado"          │
   │  Logs → Netlify Function Logs        │
   │  Notifica → §4.4                     │
   └──────────────────────────────────────┘
                  │
                  ▼
            Gmail / Drive / Sheets
            (vía googleapis con
             refresh token de Tomás)
```

**Por qué dos funciones y no una:**

| Opción | Pro | Contra |
|---|---|---|
| Solo scheduled | Simple, 1 archivo | 30s timeout; un día con 10 facturas → riesgo timeout |
| Solo background | 15min timeout | No tiene cron propio; alguien tiene que dispararlo |
| **Cron → background (elegida)** | Sin límite práctico de timeout, cron nativo, separación de responsabilidades | 1 archivo extra (~25 LOC stub) |

El stub del cron es trivial. Vale los 25 LOC para nunca tener que migrar cuando aumente el volumen.

---

## 4. Componentes

### 4.1 `netlify/functions/procesar-facturas-cron.mts`

```typescript
import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  const url = `${process.env.URL}/.netlify/functions/procesar-facturas-background`;
  const secret = process.env.PROCESAR_FACTURAS_INTERNAL_SECRET!;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-internal-secret": secret },
  });
  // Background fn returns 202 immediately
  return new Response(JSON.stringify({ triggered: true, status: res.status }), {
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = {
  schedule: "0 12 * * *", // 7am Bogotá (UTC-5)
};
```

`process.env.URL` lo inyecta Netlify automáticamente (es la URL del site).

### 4.2 `netlify/functions/procesar-facturas-background.mts`

Estructura: copia funcional de `scripts/procesar-facturas.mjs` adaptada al runtime de Netlify.

**Cambios respecto al script actual:**

| Script actual | Background function |
|---|---|
| Lee `.env.local` via `--env-file` | `process.env.*` (Netlify env vars) |
| `console.log(JSON)` para Claude | `console.log(JSON)` para Netlify logs (igual) |
| `process.exit(1)` ante fatal | `throw` o respuesta 500 |
| Sin guardia de invocación | Verifica `x-internal-secret` (header) — si no coincide, responde 401 sin tocar nada |
| Llamado directo `node script.mjs` | Llamado HTTP POST por el cron stub |

Todo lo demás (Gmail/Drive/Sheets, parseo DIAN, idempotencia) **es código idéntico**. Recomendación: extraer la lógica reusable a `netlify/functions/_lib/procesar-facturas-pipeline.ts` para que el script local original (que se sigue usando vía `/procesar-facturas` para corridas on-demand) y la function compartan exactamente el mismo core. Esto preserva el manual workaround y elimina drift.

```
netlify/functions/
├── _lib/
│   └── procesar-facturas-pipeline.ts   ← lógica core (export async function run(env))
├── procesar-facturas-cron.mts           ← scheduled stub
└── procesar-facturas-background.mts     ← invoca _lib/run con env vars
scripts/
└── procesar-facturas.mjs                ← thin wrapper que importa _lib y corre con .env.local
```

(El `_` prefix evita que Netlify lo trate como function pública.)

### 4.3 Variables de entorno

**Copiar** (no mover) de `.env.local` (local) a Netlify env vars (production). Las dos coexisten — local sigue sirviendo al `/procesar-facturas` manual.

| Var | Hoy en | Pasa a |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `.env.local` | Netlify env (Production scope) |
| `GOOGLE_CLIENT_SECRET` | `.env.local` | Netlify env |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | `.env.local` | Netlify env |
| `INVOICES_DRIVE_FOLDER_ID` | `.env.local` | Netlify env |
| `INVOICES_SHEET_ID` | `.env.local` | Netlify env |
| `INVOICES_SHEET_TAB` | `.env.local` (default `Gastos`) | Netlify env (valor `Gastos 2026`) |
| `PROCESAR_FACTURAS_INTERNAL_SECRET` | (nueva) | Netlify env |

`.env.local` se mantiene para corridas on-demand vía `/procesar-facturas`. **No se elimina** — es la red de seguridad si el cron de Netlify falla un día.

Set vía CLI:
```bash
netlify env:set GOOGLE_CLIENT_ID "..."
netlify env:set GOOGLE_CLIENT_SECRET "..."
# ...etc
netlify env:set PROCESAR_FACTURAS_INTERNAL_SECRET "$(openssl rand -hex 32)"
```

O via UI: Netlify dashboard → Site → Project configuration → Environment variables.

### 4.4 🟡 Notificaciones (PREGUNTA ABIERTA #1)

¿Cómo se entera Tomás de que el cron corrió y qué pasó?

**Opciones:**

- **A — Nada (ver Sheet).** El Sheet se actualiza solo, vos lo abrís cuando querés. Errores quedan en Netlify logs.
  Pro: cero esfuerzo de implementación.
  Contra: si el cron falla 3 días seguidos, no te enterás hasta que abras el Sheet y veas que no creció.

- **B — Email diario solo si hay novedad.** Después de cada corrida, mandar email a `tomasramirezvilla@gmail.com` con resumen JSON. Si `procesadas + errores == 0`, no mandar nada (cero spam).
  Pro: te enterás de errores y de qué facturas entraron.
  Contra: ~30 LOC más, configurar Resend (confirmado 2026-04-29: free tier = **100 emails/día, 3000/mes**, suficiente con margen 30x). Resend free permite 1 dominio verificado, pero podés empezar usando `onboarding@resend.dev` como remitente sin verificar nada.

- **C — Telegram bot.** Idem B pero por Telegram. Más inmediato.
  Contra: requiere crear bot, guardar token.

- **D — Slack webhook.** Si usás Slack para algo.

**Mi recomendación: B (email solo si hay novedad), con Resend.** Es el balance correcto entre "me entero de problemas" y "no me llena la bandeja". Resend es trivial: una env var (`RESEND_API_KEY`), 5 LOC.

🟡 **Tomás: confirmar A/B/C/D.**

### 4.5 Forward-compatibility con SaaS (Proyecto B)

Decisión arquitectónica clave: la background function se diseña con `customerId` opcional desde día 1.

```typescript
// Hoy (single-tenant):
// POST /.netlify/functions/procesar-facturas-background
// (sin body) → procesa el "owner" (Tomás, env vars del site)

// Mañana (multi-tenant SaaS):
// POST /.netlify/functions/procesar-facturas-background
// body: { customerId: "cust_abc" }
// → lee credenciales de Supabase tabla `customers` por id
```

El cron stub queda igual (sigue procesando al owner). Cuando llegue B, se agrega un segundo trigger que itera sobre todos los customers y dispara N background functions en paralelo.

**Costo de hacer esto desde día 1:** ~10 LOC (lectura condicional del body, fallback a env vars). Beneficio: cero refactor cuando vendamos.

---

## 5. Decisiones cerradas

| Decisión | Elección | Razón |
|---|---|---|
| Hosting | Netlify (ya pagado) | Cero servicio nuevo, mismo dashboard que la app |
| Patrón | Scheduled cron → Background work | Cron nativo + 15min de runway |
| Frecuencia | Diaria 7am Bogotá (`0 12 * * *` UTC) | Mismo horario del cron viejo de Miro; cubre lo del día anterior |
| Lenguaje | TypeScript (`.mts`) | Consistente con el resto del proyecto Next.js |
| Secrets | Netlify env vars | Standard pattern; CLI o UI para setear |
| Auth interna entre cron y bg | Header `x-internal-secret` | Evita que un random POST dispare el pipeline |
| Lógica core | Extraída a `netlify/functions/_lib/` | Reuso entre script CLI y function |
| Manual workaround | Se mantiene `/procesar-facturas` | Red de seguridad; útil para reprocesar histórico (`--window 365d`) |
| `customerId` parameter | Opcional desde día 1 | Forward-compat con SaaS sin refactor |

---

## 6. 🟡 Decisiones pendientes (PREGUNTAS PARA TOMÁS)

### 🟡 #1 — Notificaciones (ver §4.4)
A / B / C / D. Mi recomendación: **B (email Resend solo si hay novedad)**.

### ✅ #2 — Plan de Netlify (RESUELTO)

**Confirmado en docs Netlify (2026-04-29 noche):** standalone background functions colocadas en `netlify/functions/*-background.mts` **están disponibles en plan Free**. La restricción de "Pro plan or higher" mencionada en el blog post de Next.js solo aplica al type `experimental-background` cuando se declara dentro de una Next.js API route (`pages/api/` o `app/api/`), NO al patrón standalone que estamos usando.

Por lo tanto: **el plan Free de Netlify cubre todo este diseño.** No hace falta upgrade ni $19/mes extra. Solo confirmar que NO estás en Legacy Pro (caducó dic 2025; si lo estás, migrar a Pro nuevo o Free).

🟢 **Sin pregunta abierta** — solo verificar plan en Settings → Billing.

### 🟡 #3 — Backfill del Gmail viejo
Hay un pendiente paralelo: ejecutar `reenviarFacturas2026` (Apps Script en `tomasramirezvilla92@gmail.com`) para reenviar histórico al Gmail principal. Una vez reenviado, el cron lo va a procesar al día siguiente (o vos podés disparar `/procesar-facturas --window 90d` manual).

🟡 **Tomás: ¿lo metemos como tarea separada (ya está documentado), o querés que el spec lo incluya como criterio de aceptación?**

### 🟡 #4 — Sheet tab
El spec viejo dice tab `Gastos`, pero la memoria dice "Gastos 2026" (estás en el flow de un tab por año). ¿Hardcodear `Gastos 2026` en env var, o lógica que detecta el año actual y crea/usa el tab dinámicamente?

🟡 **Tomás: ¿manual cada enero (más simple), o lógica auto-tab (más elegante)?**

---

## 7. Manejo de errores

| Error | Comportamiento | Notificación |
|---|---|---|
| Email sin ZIP / ZIP corrupto | Skip, no aplica label, log warning | Aparece en email/notif (§4.4) |
| XML no parseable como factura | Skip (puede ser ZIP de otra cosa), aplicar label | Skip silencioso |
| `invalid_grant` (refresh token expiró) | Throw, function falla con 500 | Notif urgente: "OAuth caído, regenerar token" |
| Drive `insufficient permissions` | Throw, function falla | Notif: "Verificar acceso a folder" |
| Timeout (>15 min) | Netlify mata, retry automático (1min, 2min) | Si sigue fallando: notif "background function timeout" |
| Sheet append falla pero label ya aplicado | **Inconsistencia:** factura no en sheet, marked procesada en Gmail | Notif manual + criterio: aplicar label DESPUÉS del append (orden importa) |

**Cambio de orden importante:** en el script actual el label se aplica al final (después del `appendToSheet`). Mantener este orden. Si algún paso anterior falla, el siguiente run lo vuelve a intentar.

---

## 8. Cron de prueba antes de production

Netlify scheduled functions **solo corren en production** (no en deploy previews ni branch deploys). Para probar antes de merge:

```bash
netlify functions:invoke procesar-facturas-cron --no-identity
```

O en local con `netlify dev`. Esto NO respeta el cron, pero ejecuta el código.

Para validar end-to-end en producción sin esperar 24h:
```bash
# desde local, después del deploy:
netlify functions:invoke procesar-facturas-cron --no-identity
```

Esto dispara el stub que dispara el background. Verificar logs en Netlify dashboard.

---

## 9. Migración paso a paso (lo que hacemos mañana)

⚠️ **ANTES de implementar:** El working tree está en estado inconsistente — todo `src/` y `scripts/` aparece como `deleted` en `git status` (probablemente residuo de la migración de PC). Hay que reconciliar primero. Ver §11.

Asumiendo working tree sano:

1. **Crear estructura**
   ```bash
   mkdir -p netlify/functions/_lib
   ```
2. **Extraer pipeline a `_lib/`**: copiar el grueso de `scripts/procesar-facturas.mjs` a `netlify/functions/_lib/procesar-facturas-pipeline.ts`. Convertir `process.exit` a `throw`. Exportar `async function run(opts)`.
3. **Actualizar `scripts/procesar-facturas.mjs`**: dejar como thin wrapper que importa `_lib` y corre con `.env.local`. Mantiene el slash command `/procesar-facturas` funcionando.
4. **Crear `netlify/functions/procesar-facturas-background.mts`** — verifica header secret, llama `_lib/run()`, loguea, notifica (§4.4).
5. **Crear `netlify/functions/procesar-facturas-cron.mts`** — stub de §4.1.
6. **Setear env vars en Netlify** (CLI o UI).
7. **Generar `PROCESAR_FACTURAS_INTERNAL_SECRET`** y setearlo.
8. **Deploy:** `git push origin main` → Netlify deploya automático.
9. **Smoke test:** `netlify functions:invoke procesar-facturas-cron --no-identity`. Verificar logs.
10. **Esperar primera corrida programada** (próximo 12:00 UTC = 7am Bogotá).
11. **Verificar Sheet + Drive** al día siguiente.

Tiempo estimado total: **2–3 horas** (sin contar resolver §11).

---

## 10. Out of scope (no en este spec)

- 🟦 **Proyecto B — SaaS multi-tenant.** Spec separado cuando A esté funcionando 2-3 meses.
- INGRESOS / cuentas de cobro. Spec separado pendiente.
- Categorización automática de gastos (IA / reglas).
- Dashboard de gastos en la app web.
- OCR a PDF (los XMLs DIAN traen todo estructurado).
- Onboarding multi-cliente, billing, landing page de venta.

---

## 11. ⚠️ Pre-requisito: reconciliar el working tree

Al inspeccionar el repo encontré que **están borrados sin stage:**
- Todo `src/` (la app Next.js entera: `app/`, `components/`, `lib/`)
- Todo `scripts/` (incluyendo el `procesar-facturas.mjs` que vamos a migrar)
- Algunos archivos de `clients/la-dentisteria/` están modificados

Estado actual (`git status` resumido):
```
Changes not staged for commit:
  modified:   clients/la-dentisteria/package.json
  modified:   clients/la-dentisteria/scripts/render-static.js
  modified:   clients/la-dentisteria/wp-theme/assets/css/main.css
  deleted:    scripts/migrate-to-gastos-2026.mjs
  deleted:    scripts/procesar-facturas.mjs
  deleted:    scripts/setup-oauth.mjs
  deleted:    src/app/...  (toda la app)
  deleted:    src/components/...
  deleted:    src/lib/...
```

`node_modules/` existe (alguien corrió `npm install`), `git log` está OK (último commit `1d41cff docs: HANDOVER updated for PC migration`), branch en sync con `origin/main`.

**Hipótesis:** PC migration en curso — clonaste el repo en este Windows, instalaste deps, pero algo (¿un cleanup mal hecho? ¿alguien borró src/?) eliminó los archivos del working tree. Git todavía los tiene en HEAD.

**Resolución (no autónoma — pedir a Tomás):**

Opción A — restaurar todo (90% probable que sea esto):
```bash
git restore src/ scripts/
```
Esto restaura solo `src/` y `scripts/` del root del repo (NO toca `clients/la-dentisteria/scripts/render-static.js` — ese cambio queda intacto por si es trabajo en curso).

Opción B — si el borrado fue intencional (¿estás moviendo a otra estructura?), confirmá y descartamos.

**No tomé acción autónoma porque:**
- `git restore .` borraría también los cambios sin commit en `clients/la-dentisteria/*` (que SÍ podrían ser trabajo en curso).
- Es el tipo de operación destructiva que requiere confirmación tuya.

**Mañana, primer paso:** Tomás decide qué hacer con el estado del repo. Si es A, corremos `git restore src/ scripts/` (sin tocar `clients/`).

---

## 12. Acceptance criteria

- [ ] Working tree reconciliado (§11).
- [ ] `netlify/functions/_lib/procesar-facturas-pipeline.ts` extraído del script.
- [ ] `scripts/procesar-facturas.mjs` actualizado para importar `_lib`. Test: `node --env-file=.env.local scripts/procesar-facturas.mjs --dry-run` sigue funcionando.
- [ ] `netlify/functions/procesar-facturas-cron.mts` creado.
- [ ] `netlify/functions/procesar-facturas-background.mts` creado.
- [ ] Env vars seteadas en Netlify (production scope).
- [ ] `PROCESAR_FACTURAS_INTERNAL_SECRET` generado y seteado en ambos lados.
- [ ] Deploy exitoso (`netlify deploy --prod` o push a main).
- [ ] Smoke test pasa: `netlify functions:invoke procesar-facturas-cron` retorna 200, logs muestran que background se disparó.
- [ ] Primera corrida programada (12:00 UTC siguiente) ejecuta sin error.
- [ ] Sheet refleja al menos 1 fila nueva (si había facturas pendientes) o 0 errores con resumen vacío.
- [ ] Notificaciones funcionan según opción elegida en §4.4.
- [ ] Slash command `/procesar-facturas` sigue funcionando local (red de seguridad intacta).
- [ ] Memoria `procesar_facturas_status.md` actualizada: cron decidido, autonomía cerrada.
- [ ] Background function acepta `customerId` opcional en body (forward-compat SaaS); fallback a env vars cuando ausente.

---

## 13. Open questions resumidas (para revisar al despertar)

1. 🟡 **Notificaciones**: A (nada) / B (email Resend) / C (Telegram) / D (Slack)? — Reco: **B**.
2. ✅ **Plan Netlify**: RESUELTO — Free plan cubre todo (standalone bg funcs no requieren Pro).
3. 🟡 **Backfill Gmail viejo**: tarea separada o criterio de aceptación?
4. 🟡 **Sheet tab**: hardcoded `Gastos 2026` o lógica auto-tab?
5. ⚠️ **Working tree**: confirmar `git restore src/ scripts/` antes de implementar.
6. 💡 **Centralización 2026** (nueva): si reenviás facturas históricas 2026 desde otras cuentas a `tomasramirezvilla@gmail.com`, el cron las procesa automáticamente con `--window 365d` la primera corrida. Apps Script listo: `C:\Users\Public\Documents\REENVIAR-FACTURAS-2026-AppsScript.js`.

---

## 14. Referencias

- Spec previo: `docs/superpowers/specs/2026-04-22-gastos-facturas-design.md`
- Doc procedimiento (incluye OAuth setup): `docs/PROCESAR-FACTURAS.md`
- Memoria estado: `~/.claude/projects/c--Users-TOMAS-Desktop-consultoria-app/memory/procesar_facturas_status.md`
- HANDOVER PC migration: `docs/HANDOVER.md`
- Netlify Scheduled Functions: https://docs.netlify.com/build/functions/scheduled-functions/
- Netlify Background Functions: https://docs.netlify.com/build/functions/background-functions/
- Netlify Next.js advanced API routes: https://docs.netlify.com/frameworks/next-js/runtime-v4/advanced-api-routes/
- Cron format: https://docs.netlify.com/snippets/functions/scheduled-functions/cron-expression-format/
