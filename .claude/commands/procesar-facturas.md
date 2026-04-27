---
description: Procesa facturas DIAN pendientes en Gmail (descarga, sube a Drive, registra en Sheets)
---

Procesa todas las facturas pendientes en Gmail de Tomás.

Pasos:

1. **Verifica variables de entorno.** Lee `.env.local` y confirma que existen:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_OAUTH_REFRESH_TOKEN`
   - `INVOICES_DRIVE_FOLDER_ID`
   - `INVOICES_SHEET_ID`

   Si falta alguna, para y redirige a `docs/PROCESAR-FACTURAS.md` (sección "Setup OAuth paso a paso").

2. **Si el usuario dice "dry run" o "ver qué hay"**, corre:
   ```bash
   node --env-file=.env.local scripts/procesar-facturas.mjs --dry-run
   ```
   y reporta cuántos correos hay y los primeros asuntos/remitentes.

3. **Si es corrida en serio**, ejecuta:
   ```bash
   node --env-file=.env.local scripts/procesar-facturas.mjs
   ```

4. **Lee el JSON de stdout** y reporta a Tomás:
   - ✓ **N procesadas**: lista breve `{proveedor} — ${total} — N° {numero} — {driveLink}`.
   - ⊘ **K saltadas**: motivo (típicamente "ya en Sheet" = idempotencia OK).
   - ⚠ **M errores**: asunto + mensaje de error + sugerencia concreta:
     - `ZIP corrupto` / `ZIP sin XML` → "Revisa el adjunto manualmente y etiqueta el correo como `Procesado` para saltarlo".
     - `invalid_grant` → "Refresh token expiró. Corre `node --env-file=.env.local scripts/setup-oauth.mjs` para regenerar".
     - `No pude parsear factura` → "Comparte el XML para extender el parser".

5. **Sugiere verificación** solo si procesó al menos 1: "Abre [el Sheets](https://docs.google.com/spreadsheets/d/${INVOICES_SHEET_ID}) y [la carpeta de Drive](https://drive.google.com/drive/folders/${INVOICES_DRIVE_FOLDER_ID}) para verificar visualmente".

6. **No mostrar el stack trace completo** a menos que Tomás lo pida.

Referencias:
- Procedimiento completo: `docs/PROCESAR-FACTURAS.md`
- Script: `scripts/procesar-facturas.mjs`
