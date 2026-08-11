-- Keep Memory Cards v1: owner-scoped, explicitly approved learning records.
-- They intentionally do not share the clipboard event stream or public ciku.
CREATE TABLE IF NOT EXISTS "MemoryCard" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "clientId" TEXT,
  "kind" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "pinyin" TEXT NOT NULL DEFAULT '',
  "meaning" TEXT,
  "origin" TEXT,
  "relatedWords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "examples" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "mnemonic" TEXT,
  "source" TEXT NOT NULL DEFAULT 'user',
  "confidence" DOUBLE PRECISION,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "privacy" TEXT NOT NULL DEFAULT 'account',
  "nextReviewAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MemoryCard_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemoryCard_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemoryCard_ownerId_clientId_key"
  ON "MemoryCard"("ownerId", "clientId");
CREATE INDEX IF NOT EXISTS "MemoryCard_ownerId_kind_updatedAt_idx"
  ON "MemoryCard"("ownerId", "kind", "updatedAt");
