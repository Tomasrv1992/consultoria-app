# Gastos: Automatización de facturación electrónica DIAN

**Fecha:** 2026-04-22
**Autor:** Tomás + Claude
**Estado:** Diseño aprobado
**Alcance:** Solo entradas (gastos). Ingresos/cuentas de cobro van en un segundo spec.

---

## 1. Problema

Tomás recibe facturas electrónicas de proveedores en Gmail como adjuntos ZIP (formato DIAN Colombia: ZIP con PDF + XML UBL 2.1). El proceso manual hoy:

1. Abrir Gmail, buscar "factura"
2. Descargar cada ZIP
3. Descomprimir
4. Subir PDF a la carpeta de Drive correspondiente al mes
5. Copiar datos del XML (fecha, proveedor, NIT, valores) al Google Sheets de control de gastos
6. Repetir por cada correo

Consume ~5 minutos por factura, se acumulan correos sin procesar, y los datos manuales tienen typos.

## 2. Solución

Script Node.js + orquestación por Claude Code que automatiza el flujo end-to-end. Dispara manual (slash command `/procesar-facturas`) o automático (cron remote agent diario).

**Insight:** el mismo refresh token OAuth de Google da acceso a Gmail + Drive + Sheets. Un solo script puede hacer todo el pipeline sin depender de MCPs (que para Gmail no existe oficial y es frágil en cron remoto — ver `docs/SYNC-MIRO.md:131`).

## 3. Arquitectura

```
Tomás (/procesar-facturas)     Cron remote agent @ 7:00
         │                              │
         └──────────┬───────────────────┘
                    ▼
         ┌────────────────────┐
         │  Claude Code       │
         │  (orquestador)     │
         └─────────┬──────────┘
                   │ Bash: node scripts/procesar-facturas.mjs
                   ▼
         ┌────────────────────┐
         │  Script Node.js    │
         │  (googleapis)      │
         └──┬─────┬─────┬─────┘
            │     │     │
            ▼     ▼     ▼
         Gmail Drive  Sheets
```

El script es puro googleapis. Claude no toca APIs directamente; su papel es invocar, leer el JSON resultante, y reportar con contexto (errores en lenguaje natural, sugerencias de acción).

## 4. Componentes

### 4.1 `scripts/procesar-facturas.mjs`

Pipeline por email:
1. `findInvoiceEmails()` — query `has:attachment subject:factura -label:Procesado newer_than:30d`
2. `downloadAttachment()` — ZIP al `tmpdir()`
3. `extractZip()` — descomprime con `adm-zip`, recorre recursivamente
4. `parseInvoiceXml()` — UBL 2.1; soporta envoltura `AttachedDocument` con CDATA (caso común DIAN)
5. Dup-check en Sheet por `N° factura + NIT` (NIT normalizado a solo dígitos)
6. `getOrCreateMonthFolder()` — crea subcarpeta `YYYY-MM` según `IssueDate` del XML
7. `uploadFile()` — PDF + XML(s) con nombre `{fecha}_{proveedor}_{numero}`
8. `appendToSheet()` — fila en pestaña `Gastos` cols A–I
9. `markEmailProcessed()` — label `Procesado` en Gmail

Output JSON: `{procesadas, errores, saltadas}`.

### 4.2 `scripts/setup-oauth.mjs`

Bootstrap OAuth one-time. Levanta un HTTP server local en :53682, abre browser para consent, captura refresh token, lo imprime para pegar en `.env.local`. Después de usarlo queda "descartable" (puede reutilizarse si expira el token).

### 4.3 `docs/PROCESAR-FACTURAS.md`

Doc de procedimiento — lo que lee el cron remote agent para ejecutar el flujo. Incluye el setup anti-bobos de Google Cloud Console.

### 4.4 `.claude/commands/procesar-facturas.md`

Slash command que invoca el script y traduce el JSON a reporte conversacional.

### 4.5 Cron via `superpowers:schedule`

`0 7 * * *` (7am Bogotá). El remote agent lee `docs/PROCESAR-FACTURAS.md` y ejecuta.

## 5. Decisiones clave

| Decisión | Elección | Razón |
|---|---|---|
| Runtime | Node.js standalone (no MCP) | Gmail no tiene MCP oficial; ZIP necesita código |
| Auth | Single OAuth refresh token (3 APIs) | Simpleza, un solo setup |
| Idempotencia primaria | Label Gmail "Procesado" | Estado vive donde está el dato origen |
| Idempotencia secundaria | Dup-check por N° + NIT en Sheet | Defensa en profundidad |
| Estructura Drive | Subcarpeta `YYYY-MM/` por mes | Limpio con 200+/año |
| Columnas Sheet | Fecha, Proveedor, NIT, N°, Subtotal, IVA, Total, Concepto, Link PDF | Confirmado por usuario |
| Ventana de búsqueda | `newer_than:30d` | Balance cobertura vs no re-procesar histórico |
| Mes del folder | Por `IssueDate` del XML | Respeta fecha real de emisión, no de llegada |
| Parsing DIAN | `AttachedDocument` → extraer CDATA → parsear Invoice | 90%+ de los ZIP DIAN reales vienen así |

## 6. Flujo de Tomás

| Cuándo | Qué hace Tomás | Qué pasa atrás |
|---|---|---|
| Setup inicial | Sigue guía anti-bobos en `PROCESAR-FACTURAS.md` | Crea OAuth client, corre `setup-oauth.mjs`, guarda refresh token |
| Cada mañana | (nada, es automático) | Cron @ 7am procesa lo nuevo |
| Urgente | `/procesar-facturas` en Claude Code | Claude corre el script y reporta |
| Ver histórico | Abre el Sheets | Ya está actualizado |

## 7. Manejo de errores

- **ZIP corrupto / sin XML** → reportar en `errores`, NO aplicar label, NO bloquear el lote. Tomás revisa manual y etiqueta a mano.
- **XML parseo falla** → recolectar el XML y extender el parser en próximo spec.
- **`invalid_grant`** (OAuth expiró) → el script falla con mensaje claro; Tomás re-corre `setup-oauth.mjs`.
- **Duplicado en Sheet** → NO re-insertar, sí aplicar label (el siguiente lote no lo vuelve a ver).
- **Cron remote agent sin acceso a `.env.local`** → mismo caveat que Miro sync. Fallback: flujo manual. No bloqueante para el diseño.

## 8. Fuera de alcance

- INGRESOS / cuentas de cobro a clientes (segundo spec)
- Categorización automática de gastos
- Separación por marca (las dos marcas de Tomás comparten sheet por ahora)
- Notificaciones push / email de resumen cuando termina el cron
- OCR a PDF (los XMLs DIAN traen todo estructurado; OCR no aporta)
- Dashboard de gastos (Sheets es la vista suficiente)

## 9. Criterios de aceptación

- [x] Dependencias instaladas (`googleapis`, `adm-zip`, `fast-xml-parser`)
- [x] `scripts/setup-oauth.mjs` creado
- [x] `scripts/procesar-facturas.mjs` creado
- [x] `.env.local.example` documenta las nuevas variables
- [x] `docs/PROCESAR-FACTURAS.md` incluye setup anti-bobos
- [x] `.claude/commands/procesar-facturas.md` creado
- [ ] Tomás completa setup OAuth y pega refresh token
- [ ] Dry-run muestra emails pendientes
- [ ] Run real procesa ≥1 factura end-to-end (Drive + Sheet + label OK)
- [ ] Corrida repetida no duplica (idempotencia verificada)
- [ ] Cron creado vía `superpowers:schedule`

## 10. Archivos tocados

| Path | Tipo | Líneas |
|---|---|---|
| `scripts/procesar-facturas.mjs` | NUEVO | ~280 |
| `scripts/setup-oauth.mjs` | NUEVO | ~80 |
| `.claude/commands/procesar-facturas.md` | NUEVO | ~40 |
| `docs/PROCESAR-FACTURAS.md` | NUEVO | ~180 |
| `docs/superpowers/specs/2026-04-22-gastos-facturas-design.md` | NUEVO (este) | — |
| `package.json` | MOD (+3 deps) | — |
| `.env.local.example` | MOD (+6 vars) | — |

## 11. Segundo spec pendiente (cuando éste funcione)

**INGRESOS: cuentas de cobro a clientes.** Flujo inverso — Tomás genera las cuentas y quiere organizarlas por mes en Drive + registrarlas en el mismo Sheet. Fuente de datos TBD (¿plantilla Docs? ¿módulo de la app? ¿carpeta de Drive donde las deja?). Se abre cuando gastos esté rodando.
