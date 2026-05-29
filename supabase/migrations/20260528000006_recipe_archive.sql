-- Recipe archive support
-- Owner can archive a recipe → hidden from all listings, share links 404, becomes read-only.
-- Restore from /library "Archivadas" tab.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS recipes_archived_at_idx
  ON public.recipes(archived_at)
  WHERE archived_at IS NOT NULL;
