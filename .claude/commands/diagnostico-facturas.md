---
description: Snapshot del estado actual del pipeline de facturas (Sheet, Drive, Gmail)
---

Verifica el estado actual del pipeline de procesar-facturas. Útil para confirmar que el cron de Netlify está rodando bien, o para diagnosticar cuando algo no encaja.

Pasos:

1. **Verifica `.env.local`** — confirma que existen `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `INVOICES_DRIVE_FOLDER_ID`, `INVOICES_SHEET_ID`. Si falta alguna, redirige a `docs/PROCESAR-FACTURAS.md`.

2. **Ejecuta el script de diagnóstico**:
   ```bash
   npx tsx --env-file=.env.local scripts/diagnostico-facturas.ts
   ```

3. **Reporta a Tomás** lo que devuelve, organizado así:

   - **📊 Sheet `Gastos 2026`**: cantidad total de filas, primera/última fila (fecha + proveedor + total)
   - **📁 Drive subcarpetas**: lista de carpetas YYYY-MM con conteo de archivos. Marca con ⚠️ las que tienen 0 archivos si son del mes actual.
   - **📧 Gmail**: cantidad de facturas con label `Procesado` vs sin label en últimos 30d

4. **Dale una conclusión rápida**:
   - Si hay **0 pendientes** en Gmail → "✅ Todo al día — no hay nada por procesar"
   - Si hay **N pendientes** y el cron debería haber corrido ya hoy → "⚠️ Hay N pendientes. Si el cron de Netlify ya corrió hoy, pudo fallar. Revisa logs en Netlify."
   - Si hay **N pendientes** y el cron aún no ha corrido (es antes de 7am Bogotá) → "⏳ N pendientes — se procesarán automático en la próxima corrida"
   - Si hay errores raros (script falla con `invalid_grant`, etc.) → sugiere acción específica

5. **No spam**: si todo está OK, mantén el reporte breve. Solo expande detalle si hay algo raro.

Referencias:
- Script: `scripts/diagnostico-facturas.ts`
- Procedimiento: `docs/PROCESAR-FACTURAS.md`
