-- 0.10.61: image captures are durable Keep blocks.  Nullable columns preserve
-- every existing text/checklist note and make this migration safe to rerun.
ALTER TABLE "Note"
  ADD COLUMN IF NOT EXISTS "mediaStorageKey" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaMimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "mediaSha256" TEXT;
