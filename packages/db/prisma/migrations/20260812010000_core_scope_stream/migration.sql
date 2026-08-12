-- GyenBox Core Sync v1: a single, scope-aware cursor journal. Payloads are
-- intentionally not stored here; consumers re-read authorized domain objects.
CREATE TABLE "ScopeStream" (
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "nextSequence" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScopeStream_pkey" PRIMARY KEY ("scopeType", "scopeId")
);

CREATE TABLE "ScopeChange" (
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "sequence" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "mutationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScopeChange_pkey" PRIMARY KEY ("scopeType", "scopeId", "sequence")
);

CREATE TABLE "ScopeMutation" (
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "mutationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScopeMutation_pkey" PRIMARY KEY ("scopeType", "scopeId", "mutationId")
);

CREATE INDEX "ScopeChange_scopeType_scopeId_sequence_idx"
  ON "ScopeChange"("scopeType", "scopeId", "sequence");
CREATE INDEX "ScopeChange_scopeType_scopeId_source_entityType_entityId_idx"
  ON "ScopeChange"("scopeType", "scopeId", "source", "entityType", "entityId");
CREATE INDEX "ScopeChange_scopeType_scopeId_mutationId_idx"
  ON "ScopeChange"("scopeType", "scopeId", "mutationId");
CREATE INDEX "ScopeMutation_scopeType_scopeId_source_createdAt_idx"
  ON "ScopeMutation"("scopeType", "scopeId", "source", "createdAt");
