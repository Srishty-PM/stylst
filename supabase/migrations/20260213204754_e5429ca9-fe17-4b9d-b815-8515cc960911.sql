-- Add unique constraint for pinterest board upsert in sync function
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspiration_sources_user_type_external
ON public.inspiration_sources (user_id, source_type, external_id);