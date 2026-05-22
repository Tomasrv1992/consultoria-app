# Edición de tareas desde el embed dentro de Miro

**Status:** Diseño aprobado en brainstorming, listo para plan de implementación
**Fecha:** 2026-04-30
**Stakeholder:** Tomás Ramirez Villa
**Decisiones tomadas en sesión brainstorming del 2026-04-30**

---

## 1. Contexto y problema

Hoy el embed `/embed/[clientId]/plan` (`EmbedPlanClient.tsx`) es **solo-lectura**. Refresca cada 30s, muestra progress cards y lista de tareas activas, pero no permite ningún cambio.

Durante reuniones con clientes, Tomás necesita poder hacer cambios rápidos a las tareas **sin salir del board de Miro**. Hoy tiene dos opciones, ambas malas:
- Editar en el `data_table` de Miro (vivo en Miro pero crea drift hasta que el cron 18:00 sincroniza con Supabase)
- Salir de Miro, ir al app, loguearse, editar (rompe el flow de la reunión)

La solución: **agregar capacidad de edición al embed**, manteniendo a Supabase como única fuente de verdad y eliminando el problema del drift.

---

## 2. Acciones soportadas

| Cód | Acción | Endpoint usado | Notas |
|---|---|---|---|
| **A** | Marcar tarea como Completada | `POST /api/tasks/:id/complete` | Existe. Modificar auth. |
| **B** | Cambiar estado entre `En curso` ↔ `Iniciativa` | `PATCH /api/tasks/:id` | Existe. Modificar auth. |
| **D** | Cambiar responsable | `PATCH /api/tasks/:id` | Existe. Modificar auth. |
| **G** | Crear tarea nueva | `POST /api/tasks/bulk-create` | Existe. Modificar auth. Acepta array de 1. |
| **H** | Borrar tarea | `DELETE /api/tasks/:id` | **NUEVO endpoint a crear**. |

**Out of scope (NO se implementa en esta iteración):**
- C: Cambiar prioridad
- E: Cambiar fecha límite
- F: Editar título
- "Deshacer" tras borrar (timer 5s)
- Login real para edición desde embed (Opción B de auth descartada)
- Auto-rotación del token

Si en el futuro se quiere ampliar a estas, son extensiones puramente aditivas — no requieren cambios al diseño actual.

---

## 3. Decisiones de diseño y rationales

### 3.1 Auth: token URL compartido para read + write
**Decisión:** El mismo `EMBED_SECRET` que hoy autoriza GET pasa a autorizar también writes.

**Rationale:**
- Tomás es el único que inserta embeds en boards de Miro.
- Los boards son privados con acceso controlado por Miro.
- Los URLs solo aparecen dentro de los boards, no en GitHub ni en docs públicos.
- Riesgo de filtración acotado a "usuarios del board"; si pasa, se rota el token (cambiar `EMBED_SECRET` en Netlify env vars + trigger redeploy = ~3 min) y se re-insertan los embeds con URL nuevo.
- Alternativa "login real" descartada por fricción operacional + complicaciones cross-origin con cookies third-party en iframes Miro.

### 3.2 Crear tarea: mínimo viable (título + módulo)
**Decisión:** El form de creación pide solo `titulo` y `modulo`. Los demás campos quedan en defaults: `estado='En curso'`, `categoria` derivada de `modulo`, todo lo demás `null`.

**Rationale:**
- El 90% de las tareas nuevas en reuniones se crean vía Fathom + Claude (workflow post-reunión). Crear desde el embed es para casos puntuales que surgen al vuelo.
- Pedir más campos (responsable, prioridad, fecha) rompe el flow de la reunión.
- Los detalles se pueden completar después usando las acciones D (responsable) o el flujo Fathom completo en la próxima sesión.

### 3.3 Borrar: confirmación obligatoria
**Decisión:** Modal de confirmación con título de la tarea visible. Sin "deshacer" timer.

**Rationale:**
- Borrar es la única acción sin retorno (resto se revierte editando).
- Las transcripciones de Fathom a veces generan tareas mal formuladas que hay que eliminar — el caso de uso es real y frecuente.
- Modal con título visible previene errores de "borré la fila de al lado".
- Soft-delete o timer "deshacer" agregan complejidad de implementación sin justificar el costo dado el patrón de uso.

### 3.4 Responsable: autocomplete con sugerencias
**Decisión:** Input con autocomplete basado en responsables existentes en la BD para ese cliente. Acepta valores nuevos.

**Rationale:**
- Lista cerrada (dropdown) requiere mantenimiento manual cuando aparece responsable nuevo.
- Texto libre permite typos (`Sirley` vs `Cirley` ya causó un caso real).
- Autocomplete combina rapidez (1-2 letras + Enter para conocidos) con flexibilidad (acepta nuevos).
- Sugerencias se obtienen via `SELECT DISTINCT responsable FROM tasks WHERE client_id = X`.

### 3.5 UX: híbrida (checkbox + menú "⋯")
**Decisión:**
- Cada fila tiene un `☐` checkbox a la izquierda (acción más frecuente: completar).
- Cada fila tiene un `⋯` menú a la derecha (cambiar estado / cambiar responsable / borrar).
- Cada cabecera de módulo tiene botón `+ Nueva tarea`.

**Rationale:**
- "Completar" representa >70% de las acciones durante reunión → debe ser 1-click.
- Cambiar estado/responsable/borrar son menos frecuentes → caben bien en menú colapsado.
- Mantiene la limpieza visual de la lista actual.
- Patrón conocido (Gmail, Notion, Linear).
- Funciona en mouse y touch (no depende de hover).

---

## 4. Arquitectura técnica

### 4.1 Cambios en endpoints existentes

Para cada endpoint en `src/app/api/tasks/`:

```typescript
// ANTES: solo sesión Supabase
const { data: { user } } = await supabase.auth.getUser();
if (!user) return 401;

// DESPUÉS: sesión OR token URL
const isAuthorized = await checkAuth(request);
if (!isAuthorized) return 401;
```

`checkAuth(request)` definido en `src/lib/auth-embed.ts` (nuevo):
```typescript
export async function checkAuth(req: NextRequest): Promise<{ ok: true; via: 'session' | 'token' } | { ok: false }> {
  // 1. Intentar sesión Supabase
  const ssr = createServerSupabaseClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (user) return { ok: true, via: 'session' };
  
  // 2. Intentar embedToken (URL param o body field)
  const urlToken = req.nextUrl.searchParams.get('embedToken');
  const expected = getEmbedSecret();
  if (urlToken === expected) return { ok: true, via: 'token' };
  
  return { ok: false };
}
```

Cuando `via: 'token'`, el endpoint debe usar `service_role` (no anon) para bypassar RLS, ya que la migración 001 requiere `authenticated` para writes.

### 4.2 Endpoints afectados

| Archivo | Cambio |
|---|---|
| `src/app/api/tasks/[id]/complete/route.ts` | Reemplazar auth check por `checkAuth()`. Si `via: 'token'`, usar `service_role`. |
| `src/app/api/tasks/[id]/route.ts` (PATCH) | Idem. |
| `src/app/api/tasks/bulk-create/route.ts` | Idem. |
| `src/app/api/tasks/[id]/route.ts` (DELETE) | **Nuevo handler DELETE** en archivo existente. Idem auth. |
| `src/lib/auth-embed.ts` | **Nuevo archivo** con la función `checkAuth`. |
| `src/lib/supabase/admin.ts` | **Nuevo archivo** con factory de cliente service_role. |

### 4.3 Endpoint nuevo de sugerencias de responsable

```
GET /api/tasks/responsables?clientId=X&embedToken=Y
→ Returns: { responsables: ["Lina", "Jorge", "Clara Villa", ...] }
```

Se cachea en el cliente al cargar el embed; se invalida después de cada acción que modifica el responsable.

### 4.4 Cambios en `EmbedPlanClient.tsx`

El componente existente se refactoriza para soportar:
- Estado optimistic update por tarea (UI cambia inmediatamente, se revierte si falla)
- Modal de confirmación para borrar
- Form inline para crear tarea
- Menú flotante "⋯" para acciones secundarias
- Input con autocomplete para responsable

División en sub-componentes (a decidir en plan de implementación; tentativa):
```
EmbedPlanClient.tsx       (orquestación, fetch, state, optimistic updates)
  ├─ TaskRow.tsx          (una fila + checkbox + menú ⋯)
  ├─ NewTaskInline.tsx    (form inline al expandir "+ Nueva tarea")
  ├─ DeleteConfirmModal.tsx
  └─ ResponsableAutocomplete.tsx
```
La división final puede variar según el plan; lo importante es que `EmbedPlanClient.tsx` no termine con >500 LoC.

### 4.5 Variable de entorno service role

`SUPABASE_SERVICE_ROLE_KEY` debe estar configurado en Netlify env vars. **Crítico:** nunca exponerlo al cliente (solo se usa server-side en endpoints).

---

## 5. Data flow por acción

### Completar tarea (A)
```
[click ☐] → optimistic UI (☐ → ⏳) 
         → POST /api/tasks/:id/complete?embedToken=X
         → checkAuth(token) → service_role → UPDATE tasks SET estado='Completada'
         → 200 OK → tarea desaparece de la lista, suma a %
         → si error → revert UI, banner rojo
```

### Cambiar estado/responsable (B/D)
```
[seleccionar nuevo valor en menú ⋯] → optimistic UI
         → PATCH /api/tasks/:id?embedToken=X { estado | responsable }
         → checkAuth → service_role → UPDATE
         → 200 OK → re-render con nuevo valor
         → si error → revert + banner
```

### Crear tarea (G)
```
[click + Nueva tarea] → form inline
         → submit → POST /api/tasks/bulk-create?embedToken=X { tasks: [{titulo, modulo, clientId}] }
         → checkAuth → service_role → INSERT
         → 200 OK → form se cierra, tarea aparece en la lista
         → si error → form sigue abierto + mensaje en campo
```

### Borrar tarea (H)
```
[click ⋯ → 🗑️] → modal "¿Estás seguro?"
         → [Confirmar] → DELETE /api/tasks/:id?embedToken=X
         → checkAuth → service_role → DELETE
         → 200 OK → modal cierra, tarea desaparece
         → si error → modal sigue + banner rojo
```

---

## 6. Manejo de errores

| Escenario | Comportamiento UI |
|---|---|
| Red lenta (>2s) | Botón muestra spinner, sigue clickeable |
| Red lenta (>5s) | Banner amarillo "Conexión lenta" |
| Red caída | Revert UI optimistic + banner rojo "No se pudo guardar. Reintentá" |
| Token inválido (401) | Banner amarillo "Sesión expirada. Refrescá esta página." + botón refrescar |
| Validación fallida (400) | Mensaje específico debajo del campo problemático |
| Conflicto concurrente (2 personas editan) | Gana el último write (sin lock); refresh cada 30s mitiga |

---

## 7. Plan de testing

### 7.1 Funcional (manual, en Dentilandia)
6 tests E2E ejecutados en el embed insertado en el board de Dentilandia:
1. Completar checkbox → tarea desaparece, % sube
2. Cambiar estado → tarea cambia de grupo
3. Cambiar responsable con autocomplete → guardado
4. Crear nueva → aparece en módulo seleccionado
5. Borrar con confirmación → desaparece tras confirmar
6. Cancelar borrado → tarea sigue ahí

### 7.2 Regresión
- `GET /api/tasks` sigue devolviendo 70 filas Dentilandia
- Cron 18:00 corre OK al día siguiente
- Embed en read-only puro (sin clicks) se comporta igual que antes

### 7.3 Seguridad
- `curl` a write endpoint sin token → 401
- `curl` con token incorrecto → 401
- `curl` con token correcto → 200 + cambio en BD

### 7.4 Aprobación final
Tomás vive 5 minutos editando libremente para confirmar ergonomía durante reunión simulada.

---

## 8. Rollout

### Fase 1 — Dentilandia (este sprint)
1. Implementar todo lo descrito acá
2. Deploy a Netlify
3. Probar en el embed ya insertado en board de Dentilandia
4. Validar funcionamiento end-to-end

### Fase 2 — Replicar a 4 clientes restantes (post-aprobación Fase 1)
- Insertar embed en boards de CYGNUSS, AC Autos, Paulina, Lativo (cero código, solo "+ → Embed → URL → Insert as embed")
- Validar que cada uno carga datos correctos
- No requiere ningún cambio de código adicional

### Reversibilidad
Si algo sale mal en producción:
- Rollback en Netlify a deploy anterior (1 click): el embed vuelve a ser read-only
- Los datos en Supabase quedan intactos (los writes que ya pasaron siguen ahí)
- Cero impacto al cron 18:00 ni al `data_table` de Miro

---

## 9. Estimación

- Backend (auth, endpoint DELETE, modificaciones existentes): ~4-6 horas
- Frontend (UX, optimistic updates, autocomplete, modales): ~6-8 horas
- Testing manual + ajustes: ~2 horas
- **Total estimado: 1-2 días de trabajo**
