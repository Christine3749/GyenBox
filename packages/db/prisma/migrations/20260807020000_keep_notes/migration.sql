DO $$ BEGIN
  CREATE TYPE "NoteType" AS ENUM ('TEXT', 'CHECKLIST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NoteColor" AS ENUM ('DEFAULT', 'RED', 'ORANGE', 'YELLOW', 'GREEN', 'TEAL', 'BLUE', 'PURPLE', 'PINK', 'BROWN', 'GRAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Note" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL DEFAULT '',
  "type" "NoteType" NOT NULL DEFAULT 'TEXT',
  "items" JSONB,
  "color" "NoteColor" NOT NULL DEFAULT 'DEFAULT',
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "isTrashed" BOOLEAN NOT NULL DEFAULT false,
  "trashedAt" TIMESTAMP(3),
  "labelIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "reminder" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Note_ownerId_isTrashed_isArchived_idx" ON "Note"("ownerId", "isTrashed", "isArchived");
CREATE INDEX IF NOT EXISTS "Note_ownerId_order_idx" ON "Note"("ownerId", "order");

CREATE TABLE IF NOT EXISTS "NoteLabel" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "NoteLabel_ownerId_name_key" ON "NoteLabel"("ownerId", "name");
CREATE INDEX IF NOT EXISTS "NoteLabel_ownerId_idx" ON "NoteLabel"("ownerId");
