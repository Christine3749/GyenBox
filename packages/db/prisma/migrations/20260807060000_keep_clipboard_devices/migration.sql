-- Keep Sync v4: persistent, owner-scoped native device identities.  The
-- event and Note columns are deliberately nullable so pre-v4 history remains
-- valid and older clients can continue using the v3 wire format unchanged.
CREATE TYPE "ClipboardDeviceColor" AS ENUM ('BLUE', 'CORAL', 'MINT', 'AMBER', 'VIOLET', 'SILVER');

CREATE TABLE "ClipboardDevice" (
    "ownerId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "color" "ClipboardDeviceColor" NOT NULL DEFAULT 'BLUE',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClipboardDevice_pkey" PRIMARY KEY ("ownerId", "deviceId")
);

ALTER TABLE "Note" ADD COLUMN "clipboardOriginDeviceId" TEXT;
ALTER TABLE "ClipboardEvent" ADD COLUMN "originDeviceId" TEXT;

CREATE INDEX "ClipboardDevice_ownerId_lastSeenAt_idx"
  ON "ClipboardDevice"("ownerId", "lastSeenAt");

ALTER TABLE "ClipboardDevice" ADD CONSTRAINT "ClipboardDevice_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
