DO $$ BEGIN
  CREATE TYPE "MembershipStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'LIFETIME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionProvider" AS ENUM ('MANUAL', 'STRIPE', 'APP_STORE', 'PLAY_STORE', 'PROMO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MembershipPlan" (
  "id" TEXT PRIMARY KEY,
  "code" "Plan" NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "storageQuota" BIGINT NOT NULL,
  "monthlyPriceCents" INTEGER NOT NULL DEFAULT 0,
  "annualPriceCents" INTEGER NOT NULL DEFAULT 0,
  "maxDevices" INTEGER NOT NULL DEFAULT 1,
  "maxFileSize" BIGINT NOT NULL DEFAULT 1073741824,
  "aiCreditsMonthly" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MembershipSubscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "planCode" "Plan" NOT NULL REFERENCES "MembershipPlan"("code"),
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  "provider" "SubscriptionProvider" NOT NULL DEFAULT 'MANUAL',
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "trialEndsAt" TIMESTAMP(3),
  "seats" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MembershipEvent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "eventType" TEXT NOT NULL,
  "previousPlan" "Plan",
  "nextPlan" "Plan",
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "MembershipSubscription_userId_status_idx" ON "MembershipSubscription"("userId", "status");
CREATE INDEX IF NOT EXISTS "MembershipSubscription_provider_providerSubscriptionId_idx" ON "MembershipSubscription"("provider", "providerSubscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "MembershipSubscription_one_open_per_user_idx"
  ON "MembershipSubscription"("userId")
  WHERE "status" IN ('TRIALING', 'ACTIVE', 'PAST_DUE');
CREATE INDEX IF NOT EXISTS "MembershipEvent_userId_createdAt_idx" ON "MembershipEvent"("userId", "createdAt");

INSERT INTO "MembershipPlan" (
  "id", "code", "name", "description", "storageQuota", "monthlyPriceCents", "annualPriceCents", "maxDevices", "maxFileSize", "aiCreditsMonthly", "sortOrder"
) VALUES
  ('plan_free', 'FREE', 'Free', 'Starter private sync box.', 10737418240, 0, 0, 1, 1073741824, 50, 10),
  ('plan_plus', 'PLUS', 'Plus', 'Personal file territory with more storage.', 107374182400, 999, 9900, 3, 10737418240, 500, 20),
  ('plan_professional', 'PROFESSIONAL', 'Professional', 'Power-user sync, share, and AI search.', 1099511627776, 1999, 19900, 10, 53687091200, 5000, 30),
  ('plan_business', 'BUSINESS', 'Business', 'Team territory with pooled storage.', 5497558138880, 4999, 49900, 50, 107374182400, 25000, 40)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "storageQuota" = EXCLUDED."storageQuota",
  "monthlyPriceCents" = EXCLUDED."monthlyPriceCents",
  "annualPriceCents" = EXCLUDED."annualPriceCents",
  "maxDevices" = EXCLUDED."maxDevices",
  "maxFileSize" = EXCLUDED."maxFileSize",
  "aiCreditsMonthly" = EXCLUDED."aiCreditsMonthly",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;
