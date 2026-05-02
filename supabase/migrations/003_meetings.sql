-- Migración: tabla `meetings` para persistir minutas post-reunión
-- y la relación con tareas creadas/completadas/actualizadas en esa reunión.
-- Spec: docs/superpowers/specs/2026-05-02-procesar-reunion-flow-design.md

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

CREATE POLICY meetings_select_own ON meetings FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'consultant' OR p.client_id::text = meetings.client_id)
    )
  );

CREATE POLICY meetings_insert_consultant ON meetings FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'consultant'
    )
  );

CREATE POLICY meetings_update_consultant ON meetings FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'consultant'
    )
  );
