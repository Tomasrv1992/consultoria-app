# Procesar Facturas DIAN: Gmail → Drive → Sheets

Procedimiento para procesar facturas electrónicas DIAN (Colombia) que llegan a Gmail como adjuntos ZIP. Las descomprime, sube PDF + XML a Drive (subcarpeta por mes), y registra una fila en el Google Sheets de control de gastos.

**Cuándo se corre:**
- 🟢 **Automático**: Netlify Scheduled Function diaria @ 7am Bogotá (`0 12 * * *` UTC). PC apagado funciona.
- 🟡 **On-demand**: Tomás dice `/procesar-facturas` en Claude Code (corre localmente con `npx tsx`).

## Arquitectura

Pipeline core en **`netlify/functions/_lib/procesar-facturas-pipeline.ts`** — compartido entre:
- **Netlify Scheduled cron** (`netlify/functions/procesar-facturas-cron.mts`) → invoca al background
- **Netlify Background fn** (`netlify/functions/procesar-facturas-background.mts`) → corre el pipeline (15min timeout)
- **CLI local** (`scripts/procesar-facturas.ts`) → thin wrapper para corridas manuales

El refresh token OAuth de Google da acceso a Gmail + Drive + Sheets con un solo set de credenciales. No usa MCPs (no existe MCP oficial de Gmail; los community no son confiables en background).

Spec arquitectura completa: `docs/superpowers/specs/2026-04-29-procesar-facturas-autonomy-design.md`

---

## Configuración inicial (one-time)

### Variables de entorno (`.env.local` para corrida local)

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
INVOICES_DRIVE_FOLDER_ID=1ksS7gwlT8OYmMh4Eh2WiIQGNwkERdti2
INVOICES_SHEET_ID=1dwCu-1ooeyOC5PEd2lBIhua4zUmC5ymymQ6X0O4zcMU
INVOICES_SHEET_TAB=Gastos 2026
```

### Variables de entorno en Netlify (para cron automático)

Las **mismas 6** de arriba + `PROCESAR_FACTURAS_INTERNAL_SECRET` (auth interna entre cron y bg fn).

Setear vía Netlify UI: Site configuration → Environment variables → Add variable.
Scope: Production + Functions (o "All scopes").

⚠️ **Cuidado al pegar el `GOOGLE_OAUTH_REFRESH_TOKEN`**: el value debe empezar directamente con `1//`, NO con `=1//` (un `=` extra al inicio causa `invalid_grant`).

### Cómo obtener los secrets de Google

Ver el "**Setup OAuth (paso a paso anti-bobos)**" más abajo.

### Estructura de columnas del Sheets

Pestaña `Gastos`, columnas A–I:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Fecha | Proveedor | NIT | N° Factura | Subtotal | IVA | Total | Concepto | Link PDF |

El script asume que la fila 1 es el encabezado. **No toques nombres de columnas** sin actualizar el script.

### Estructura de la carpeta de Drive

```
Carpeta raíz (INVOICES_DRIVE_FOLDER_ID)
├── 2026-04/
│   ├── 2026-04-15_EPM_FE-001234.pdf
│   ├── 2026-04-15_EPM_FE-001234__factura.xml
│   └── ...
├── 2026-05/
│   └── ...
```

Subcarpetas por mes se crean automáticamente con el formato `YYYY-MM` según la fecha de emisión del XML (no la fecha del correo).

---

## Procedimiento (lo que hace el script)

1. **Lista emails pendientes**: query Gmail
   ```
   has:attachment subject:factura -label:Procesado newer_than:30d
   ```
2. **Para cada email:**
   1. Descarga el primer adjunto ZIP a `os.tmpdir()`
   2. Descomprime → busca PDF + XML(s)
   3. Parsea XML (DIAN UBL 2.1; soporta wrapper `AttachedDocument` con CDATA)
   4. Extrae: fecha, proveedor, NIT, N° factura, CUFE, subtotal, IVA, total, concepto
   5. **Idempotencia secundaria**: busca duplicado en el Sheet por `N° factura + NIT`. Si existe → etiqueta y salta.
   6. Encuentra/crea subcarpeta `YYYY-MM` en Drive
   7. Sube PDF y XML(s) con nombre `{fecha}_{proveedor}_{numero}.pdf`
   8. Append fila al Sheets
   9. Aplica label `Procesado` en Gmail (idempotencia primaria)
3. **Reporta JSON** con `procesadas`, `errores`, `saltadas`.

---

## Reglas críticas

1. **Gmail es la cola.** El label `Procesado` marca lo ya hecho. Si el script falla en mitad de un email, el label NO se aplica y el siguiente run lo reintenta.
2. **Nunca borrar correos.** Solo etiquetar.
3. **NIT se normaliza a solo dígitos** antes de comparar duplicados (tolera `900.123.456-7` vs `900123456`).
4. **La carpeta del mes usa la fecha de emisión del XML**, no la fecha del correo (puede llegar atrasada).
5. **Ventana de 30 días** evita procesar histórico viejo. Si necesitas reprocesar más atrás, cambia `newer_than:30d` en el script o quita el label `Procesado` manualmente.
6. **Match de duplicado tolerante a NIT vacío**: si el sheet o el XML no tienen NIT, basta con N° factura igual.

---

## Setup OAuth (paso a paso anti-bobos)

### 1. Google Cloud Console — crear proyecto

1. Abre [console.cloud.google.com](https://console.cloud.google.com) (con la cuenta de Gmail donde llegan las facturas).
2. Arriba a la izquierda, click en el dropdown de proyecto → **"Nuevo proyecto"**.
3. Nombre: `Consultoria Facturas`. Click **"Crear"**.
4. Una vez creado, asegúrate de tenerlo seleccionado en el dropdown superior.

### 2. Habilitar las 3 APIs

Para cada una de estas, busca en la barra superior y haz click en **"Habilitar"**:
- **Gmail API**
- **Google Drive API**
- **Google Sheets API**

Atajos directos (con el proyecto seleccionado):
- `https://console.cloud.google.com/apis/library/gmail.googleapis.com`
- `https://console.cloud.google.com/apis/library/drive.googleapis.com`
- `https://console.cloud.google.com/apis/library/sheets.googleapis.com`

### 3. Configurar pantalla de consentimiento OAuth

1. Menú → **APIs & Services** → **OAuth consent screen**.
2. **User Type**: `External` → **Crear**.
3. App name: `Consultoria Facturas`. Email de soporte: tu email. Email del developer: tu email. **Guardar**.
4. **Scopes**: déjalo en blanco (los scopes los pide el script). **Guardar**.
5. **Test users**: agrega TU EMAIL (`tomasramirezvilla@gmail.com`). **Guardar**.
6. (No tienes que publicar la app — funciona en modo "Testing" para uso personal.)

### 4. Crear OAuth Client ID

1. Menú → **APIs & Services** → **Credentials**.
2. **+ CREATE CREDENTIALS** → **OAuth client ID**.
3. **Application type**: `Desktop app`.
4. Name: `procesar-facturas-cli`.
5. **Crear**.
6. Aparece un modal con `Client ID` y `Client secret`. **Copia ambos** (también puedes descargar el JSON).

### 5. Pegar en `.env.local`

Abre `.env.local` (en la raíz del proyecto) y agrega:

```
GOOGLE_CLIENT_ID=<el-client-id-que-copiaste>
GOOGLE_CLIENT_SECRET=<el-client-secret-que-copiaste>
INVOICES_DRIVE_FOLDER_ID=1ksS7gwlT8OYmMh4Eh2WiIQGNwkERdti2
INVOICES_SHEET_ID=1dwCu-1ooeyOC5PEd2lBIhua4zUmC5ymymQ6X0O4zcMU
INVOICES_SHEET_TAB=Gastos
```

(El refresh token se genera en el siguiente paso.)

### 6. Correr el script de bootstrap OAuth

En la terminal del proyecto:

```bash
node --env-file=.env.local scripts/setup-oauth.mjs
```

- Se abre el browser con la pantalla de consentimiento.
- Si dice **"Google hasn't verified this app"**: click en **"Advanced"** → **"Go to Consultoria Facturas (unsafe)"** — es tu propia app, está bien.
- Selecciona la cuenta donde están las facturas.
- Acepta los 3 permisos (Gmail modify, Drive, Sheets).
- Verás `✅ Listo` en el browser.
- En la terminal aparece la línea:

```
GOOGLE_OAUTH_REFRESH_TOKEN=1//abc123...
```

**Cópiala tal cual a `.env.local`.**

### 7. Verificar que funciona (dry-run)

```bash
npx tsx --env-file=.env.local scripts/procesar-facturas.ts --dry-run
```

Debe imprimir algo como:

```json
{
  "dryRun": {
    "query": "filename:zip -label:Procesado newer_than:30d",
    "total": 7,
    "sample": [
      { "subject": "...", "from": "facturacion@epm.com.co", "zips": ["..."] }
    ]
  }
}
```

Si ves emails listados sin errores → todo OK. Si dice `Falta env X` → falta variable en `.env.local`. Si dice `invalid_grant` → el refresh token está mal o expiró.

### 8. Correr en serio

```bash
npx tsx --env-file=.env.local scripts/procesar-facturas.ts
```

Argumentos opcionales:
- `--limit N` — procesa solo las primeras N facturas (testing)
- `--window 365d` — ventana de búsqueda (default `30d`; usar `365d` para backfill histórico)

Debe procesar todo y reportar JSON con `procesadas/errores/saltadas`. Verifica:
- Drive: subcarpeta del mes actual con PDFs/XMLs.
- Sheets: nuevas filas con los datos.
- Gmail: los correos procesados ahora tienen el label `Procesado`.

### 9. Diagnóstico rápido del estado actual

```bash
npx tsx --env-file=.env.local scripts/diagnostico-facturas.ts
```

Imprime un snapshot de Sheet (filas), Drive (subcarpetas + archivos) y Gmail (con/sin label "Procesado"). Útil después del primer cron automático para confirmar que está rodando.

---

## Manejo de errores comunes

| Error en JSON | Causa | Solución |
|---|---|---|
| `Falta env X` | Variable faltante en `.env.local` | Agrégala |
| `invalid_grant` | Refresh token expiró o fue revocado | Re-correr `setup-oauth.mjs` |
| `ZIP corrupto` | Adjunto dañado | Revisar manualmente, etiquetar como `Procesado` a mano para saltar |
| `ZIP sin XML` | Adjunto no es factura DIAN estándar | Revisar manual, etiquetar a mano |
| `No pude parsear factura del XML` | XML con estructura no soportada | Compartir el XML para extender el parser |
| `insufficient permissions` (Drive) | Folder ID equivocado o sin permiso | Verificar que la cuenta OAuth tiene acceso a la carpeta |

---

## Cron Netlify (cómo se ejecuta automático)

Implementado en 2 funciones desplegadas en Netlify (mismo site `consultoria-ea`):

### 1. `netlify/functions/procesar-facturas-cron.mts` (Scheduled)
- Schedule: `0 12 * * *` UTC = 7am Bogotá (UTC-5)
- Stub liviano (~25 LOC). Solo dispara al background.
- Timeout 30s (usa <2s).

### 2. `netlify/functions/procesar-facturas-background.mts` (Background)
- Suffix `-background` → 15min timeout en cualquier plan Netlify.
- Verifica header `x-internal-secret` (auth interna).
- Llama al pipeline core en `_lib/procesar-facturas-pipeline.ts`.
- Loguea resultado JSON a Netlify Function logs (`level: result | fatal`).

### Verificar que el cron está rodando

1. Netlify dashboard → Site → Functions → `procesar-facturas-cron` → muestra próxima ejecución programada
2. Después del primer run automático, ver logs en `procesar-facturas-background` → debe aparecer `"level": "result", "procesadas": N`
3. O correr `npx tsx --env-file=.env.local scripts/diagnostico-facturas.ts` localmente para ver snapshot

### Smoke test manual (opcional)

Vía Netlify UI:
1. Functions → `procesar-facturas-cron` → "Test function" → Send
2. Espera 30-60 seg
3. Ver logs de `procesar-facturas-background`

### Limitación conocida

Si el `GOOGLE_OAUTH_REFRESH_TOKEN` se pega mal en Netlify env vars (con `=` extra al inicio), el background falla con `invalid_grant`. **El value debe empezar con `1//`, NO con `=1//`.** Si sucede, editar la env var en Netlify y re-invocar el cron.

---

## Referencias

- Spec autonomy (Netlify): `docs/superpowers/specs/2026-04-29-procesar-facturas-autonomy-design.md`
- Spec original (script local): `docs/superpowers/specs/2026-04-22-gastos-facturas-design.md`
- Patrón hermano: `docs/SYNC-MIRO.md` (Miro sync)
