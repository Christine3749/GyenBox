-- GY input-method captures are regular Keep notes.  The source fields are
-- internal metadata only: they provide idempotency for native retries and a
-- fast "latest 20" query without imposing any retention limit on Keep.
ALTER TABLE "Note"
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "capturedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Note_ownerId_source_capturedAt_idx"
  ON "Note"("ownerId", "source", "capturedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Note_ownerId_sourceId_key"
  ON "Note"("ownerId", "sourceId");
