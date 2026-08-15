-- Keep Sync v5: a user-private cursor for every visible note and label change.
CREATE TABLE "KeepStream" (
    "ownerId" TEXT NOT NULL,
    "nextSequence" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeepStream_pkey" PRIMARY KEY ("ownerId")
);

CREATE TABLE "KeepChange" (
    "ownerId" TEXT NOT NULL,
    "sequence" BIGINT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeepChange_pkey" PRIMARY KEY ("ownerId", "sequence"),
    CONSTRAINT "KeepChange_kind_check" CHECK ("kind" IN ('NOTE_UPSERT', 'NOTE_DELETE', 'LABEL_UPSERT', 'LABEL_DELETE'))
);

CREATE INDEX "KeepChange_ownerId_sequence_idx" ON "KeepChange"("ownerId", "sequence");
CREATE INDEX "KeepChange_ownerId_entityId_createdAt_idx" ON "KeepChange"("ownerId", "entityId", "createdAt");

ALTER TABLE "KeepStream" ADD CONSTRAINT "KeepStream_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KeepChange" ADD CONSTRAINT "KeepChange_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
