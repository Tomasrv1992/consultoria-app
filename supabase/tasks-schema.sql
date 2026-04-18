-- Fase 2: tabla `tasks` como fuente única de verdad
-- Ejecutar UNA sola vez en el SQL editor de Supabase.

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  modulo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('ingresos','gestion','operaciones','mercadeo')),
  responsable TEXT,
  prioridad TEXT,
  fecha_limite TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('En curso','Iniciativa','Completada')),
  fecha_ingreso TIMESTAMPTZ DEFAULT NOW(),
  miro_row_id TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_client_estado ON public.tasks(client_id, estado);
CREATE INDEX IF NOT EXISTS idx_tasks_miro_row_id ON public.tasks(miro_row_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Política permisiva temporal (anon puede leer/escribir).
-- Afinar cuando se añada autenticación real por rol.
DROP POLICY IF EXISTS "tasks_all_anon" ON public.tasks;
CREATE POLICY "tasks_all_anon" ON public.tasks
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
