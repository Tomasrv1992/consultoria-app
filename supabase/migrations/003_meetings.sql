-- Migración: tabla `meetings` para persistir minutas post-reunión
-- y la relación con tareas creadas/completadas/actualizadas en esa reunión.
-- Spec: docs/superpowers/specs/2026-05-02-procesar-reunion-flow-design.md
--
-- RLS: mismo patrón que `tasks` (migración 001). La tabla `profiles`
-- todavía no existe, así que las policies no la referencian. Defensa
-- en profundidad: SELECT abierto a anon (la API valida con embedToken),
-- writes solo authenticated (la API usa service_role para bypassear).

CREATE TABLE meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT NOT NULL,
  fecha_reunion   DATE NOT NULL,
  duracion_min    INT,
  asistentes      TEXT[] DEFAULT '{}',
  transcript_raw  TEXT NOT NULL,
  minuta_md       TEXT NOT NULL,

  tareas_creadas_ids       UUID[] DEFAULT '{}',
  tareas_completadas_ids   UUID[] DEFAULT '{}',
  tareas_actualizadas_ids  UUID[] DEFAULT '{}',

  pending_miro_sync BOOLEAN DEFAULT TRUE,
  miro_doc_id       TEXT,
  miro_synced_at    TIMESTAMPTZ,

  created_by        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meetings_client_id ON meetings(client_id);
CREATE INDEX idx_meetings_fecha ON meetings(fecha_reunion DESC);
CREATE INDEX idx_meetings_pending_sync
  ON meetings(pending_miro_sync) WHERE pending_miro_sync = true;

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- SELECT abierto a anon (los GET de la API validan embedToken antes de consultar).
CREATE POLICY meetings_select_anon ON meetings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes: solo usuarios autenticados. La API usa service_role para bypassear
-- cuando el caller llega vía embedToken.
CREATE POLICY meetings_insert_authenticated ON meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY meetings_update_authenticated ON meetings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
