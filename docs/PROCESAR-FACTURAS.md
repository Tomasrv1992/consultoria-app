# Procesar Facturas DIAN: Gmail → Drive → Sheets

Procedimiento para procesar facturas electrónicas DIAN (Colombia) que llegan a Gmail como adjuntos ZIP. Las descomprime, sube PDF + XML a Drive (subcarpeta por mes), y registra una fila en el Google Sheets de control de gastos.

**Cuándo se corre:**
- Automático: cron remote agent diario @ 7:00 Bogotá (configurado vía `superpowers:schedule`).
- On-demand: Tomás dice `/procesar-facturas` o "procesa facturas" en Claude Code.

**Por qué usa script Node + APIs y no MCPs:**
1. No existe un MCP oficial de Gmail. Los community requieren su propio OAuth y son frágiles en cron remoto.
2. La descompresión de ZIP no la hace ningún MCP — siempre hace falta código.
3. Un solo refresh token de Google cubre Gmail + Drive + Sheets.

---

## Configuración inicial (one-time)

### Variables de entorno (`.env.local`)

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
INVOICES_DRIVE_FOLDER_ID=1ksS7gwlT8OYmMh4Eh2WiIQGNwkERdti2
INVOICES_SHEET_ID=1dwCu-1ooeyOC5PEd2lBIhua4zUmC5ymymQ6X0O4zcMU
INVOICES_SHEET_TAB=Gastos
```

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
node --env-file=.env.local scripts/procesar-facturas.mjs --dry-run
```

Debe imprimir algo como:

```json
{
  "dryRun": true,
  "query": "has:attachment subject:factura -label:Procesado newer_than:30d",
  "total": 7,
  "sample": [
    { "subject": "Factura electrónica EPM #FE-001234", "from": "facturacion@epm.com.co", "zips": ["..."] }
  ]
}
```

Si ves emails listados sin errores → todo OK. Si dice `Falta env X` → falta variable en `.env.local`. Si dice `invalid_grant` → el refresh token está mal o expiró.

### 8. Correr en serio

```bash
node --env-file=.env.local scripts/procesar-facturas.mjs
```

Debe procesar todo y reportar JSON con `procesadas/errores/saltadas`. Verifica:
- Drive: subcarpeta del mes actual con PDFs/XMLs.
- Sheets: nuevas filas con los datos.
- Gmail: los correos procesados ahora tienen el label `Procesado`.

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

## Cron remote agent (cómo se ejecuta automático)

El cron creado vía `superpowers:schedule` corre `0 7 * * *` (7am Bogotá UTC-5) y dispara un Claude agent remoto que:

1. Lee este doc.
2. Ejecuta el script:
   ```bash
   node --env-file=.env.local scripts/procesar-facturas.mjs
   ```
3. Lee el JSON de stdout.
4. Reporta resultado en el panel de triggers de Claude Code.

**Limitación conocida** (mismo caveat que `docs/SYNC-MIRO.md`): el cron remote agent puede no tener acceso al filesystem local del Mac/PC de Tomás. Si el cron falla por esta razón, el flujo queda como manual hasta que Tomás corra `/procesar-facturas`. La prioridad es que el flujo manual sea sólido.

---

## Referencias

- Spec: `docs/superpowers/specs/2026-04-22-gastos-facturas-design.md`
- Plan ejecutado: `C:\Users\TOMAS\.claude\plans\si-la-1-esta-nested-coral.md`
- Patrón hermano: `docs/SYNC-MIRO.md` (Miro sync, mismo modelo de cron)
