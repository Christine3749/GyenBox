-- Keep Sync v3: each account owns an independent monotonically increasing
-- cursor. Client-provided capturedAt remains presentation metadata only.
CREATE TABLE "ClipboardStream" (
    "ownerId" TEXT NOT NULL,
    "nextSequence" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClipboardStream_pkey" PRIMARY KEY ("ownerId")
);

CREATE TABLE "ClipboardEvent" (
    "ownerId" TEXT NOT NULL,
    "sequence" BIGINT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "noteId" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClipboardEvent_pkey" PRIMARY KEY ("ownerId", "sequence"),
    CONSTRAINT "ClipboardEvent_kind_check" CHECK ("kind" IN ('ADD', 'DELETE'))
);

CREATE UNIQUE INDEX "ClipboardEvent_ownerId_dedupeKey_key" ON "ClipboardEvent"("ownerId", "dedupeKey");
CREATE INDEX "ClipboardEvent_ownerId_sequence_idx" ON "ClipboardEvent"("ownerId", "sequence");
CREATE INDEX "ClipboardEvent_ownerId_sourceId_createdAt_idx" ON "ClipboardEvent"("ownerId", "sourceId", "createdAt");
CREATE INDEX "ClipboardEvent_ownerId_createdAt_idx" ON "ClipboardEvent"("ownerId", "createdAt");

ALTER TABLE "Note" ADD COLUMN "clipboardSequence" BIGINT;
CREATE INDEX "Note_ownerId_source_isTrashed_isArchived_clipboardSequence_idx"
  ON "Note"("ownerId", "source", "isTrashed", "isArchived", "clipboardSequence");

ALTER TABLE "ClipboardStream" ADD CONSTRAINT "ClipboardStream_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClipboardEvent" ADD CONSTRAINT "ClipboardEvent_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing clipboard rows become the first immutable ADD events for their
-- owner. row_number makes that backfill deterministic even when timestamps
-- collide. Manual notes are deliberately excluded.
WITH ordered AS (
  SELECT
    "ownerId",
    "id" AS "noteId",
    "sourceId",
    row_number() OVER (
      PARTITION BY "ownerId"
      ORDER BY COALESCE("capturedAt", "createdAt") ASC, "createdAt" ASC, "id" ASC
    )::BIGINT AS sequence
  FROM "Note"
  WHERE "source" = 'gy-clipboard' AND "sourceId" IS NOT NULL
)
INSERT INTO "ClipboardEvent" ("ownerId", "sequence", "kind", "sourceId", "noteId", "dedupeKey")
SELECT "ownerId", sequence, 'ADD', "sourceId", "noteId", 'add:' || "sourceId"
FROM ordered;

UPDATE "Note" AS note
SET "clipboardSequence" = event.sequence
FROM "ClipboardEvent" AS event
WHERE event."noteId" = note."id" AND event.kind = 'ADD';

INSERT INTO "ClipboardStream" ("ownerId", "nextSequence")
SELECT "ownerId", MAX(sequence)
FROM "ClipboardEvent"
GROUP BY "ownerId";
