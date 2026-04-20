-- ============================================================
--  Migración: endurecer RLS de la tabla public.tasks
--  Fecha objetivo: abril 2026
--
--  Contexto:
--    - Hoy la tabla `tasks` tiene una política permisiva:
--        CREATE POLICY "tasks_all_anon" ON public.tasks
--          FOR ALL TO anon USING (true) WITH CHECK (true);
--      que permite a cualquier request anónimo LEER y ESCRIBIR
--      todas las tareas. Se había dejado como "temporal".
--
--    - El API de la app ahora exige sesión Supabase para
--      complete y bulk-create, PERO internamente usa el
--      anon_key para ejecutar los writes. Sin RLS, la
--      defensa depende solo del check de la API. Queremos
--      defensa en profundidad: que la BD también rechace
--      writes anónimos.
--
--  Efecto de esta migración:
--    - SELECT queda abierto a anon (el endpoint /embed/... lo
--      necesita para listar tareas sin login, validado por
--      embedToken en la URL).
--    - INSERT / UPDATE / DELETE solo para usuarios autenticados.
--
--  Prerrequisito en el código:
--    - /api/tasks/[id]/complete y /api/tasks/bulk-create deben
--      usar createServerSupabaseClient() (cliente SSR con
--      sesión), no createClient(anon_key).
--      Si los endpoints siguen usando anon, los writes
--      fallarán con "new row violates row-level security".
--
--  Cómo aplicar:
--    1. Abrir el SQL editor de Supabase.
--    2. Pegar TODO este archivo y ejecutar.
--    3. Probar: iniciar sesión en la app y marcar una tarea
--       como Completada → debe persistir.
--    4. Probar: cerrar sesión y llamar a /api/tasks/[id]/complete
--       vía curl → debe responder 401 y no debe tocar la BD.
--
--  Cómo revertir (si algo se rompe en producción):
--    DROP POLICY IF EXISTS "tasks_select_anon" ON public.tasks;
--    DROP POLICY IF EXISTS "tasks_insert_authenticated" ON public.tasks;
--    DROP POLICY IF EXISTS "tasks_update_authenticated" ON public.tasks;
--    DROP POLICY IF EXISTS "tasks_delete_authenticated" ON public.tasks;
--    CREATE POLICY "tasks_all_anon" ON public.tasks
--      FOR ALL TO anon USING (true) WITH CHECK (true);
-- ============================================================

BEGIN;

-- Quitar la política permisiva.
DROP POLICY IF EXISTS "tasks_all_anon" ON public.tasks;

-- SELECT abierto a anon (embed público con token).
DROP POLICY IF EXISTS "tasks_select_anon" ON public.tasks;
CREATE POLICY "tasks_select_anon" ON public.tasks
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes: solo usuarios autenticados.
DROP POLICY IF EXISTS "tasks_insert_authenticated" ON public.tasks;
CREATE POLICY "tasks_insert_authenticated" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_update_authenticated" ON public.tasks;
CREATE POLICY "tasks_update_authenticated" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_delete_authenticated" ON public.tasks;
CREATE POLICY "tasks_delete_authenticated" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (true);

COMMIT;

-- ============================================================
--  Siguiente paso futuro (NO incluido en esta migración):
--  Restringir por `client_id` cuando la tabla `profiles` esté
--  poblada y cada user tenga su profile.client_id. Ejemplo:
--
--    CREATE POLICY "tasks_update_own_client" ON public.tasks
--      FOR UPDATE TO authenticated
--      USING (
--        EXISTS (
--          SELECT 1 FROM public.profiles p
--          WHERE p.id = auth.uid()
--            AND (p.role = 'consultant' OR p.client_id::text = tasks.client_id)
--        )
--      );
--
--  Se deja pendiente hasta que el flujo de profiles esté vivo.
-- ============================================================
