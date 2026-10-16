ALTER TABLE psychometric_items
  ADD COLUMN IF NOT EXISTS options jsonb,
  ADD COLUMN IF NOT EXISTS secondary_dimensions jsonb,
  ADD COLUMN IF NOT EXISTS tags jsonb,
  ADD COLUMN IF NOT EXISTS legacy_id text;

ALTER TABLE psychometric_items
  ADD CONSTRAINT psychometric_items_legacy_id_key UNIQUE (legacy_id);