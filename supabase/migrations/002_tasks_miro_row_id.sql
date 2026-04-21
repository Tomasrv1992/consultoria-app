-- Adds miro_row_id to track which row in Miro's data_table corresponds
-- to each Supabase task. Populated by the sync procedure (docs/SYNC-MIRO.md).
-- Used to update the right Miro row even after rename/re-order.

alter table public.tasks
  add column if not exists miro_row_id text;

create index if not exists tasks_miro_row_id_idx
  on public.tasks(miro_row_id)
  where miro_row_id is not null;
