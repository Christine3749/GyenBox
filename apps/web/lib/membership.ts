import { createClient } from "@supabase/supabase-js"
import { getPrisma } from "./prisma"
import { formatBytes, getActiveStorageUsed } from "./file-records"
import type { SupabaseActor } from "./supabase-server"

type ActorInput = Pick<SupabaseActor, "actorId" | "email" | "name" | "avatarUrl">

type HsPlan = {
  id: string
  product_code: string
  code: string
  name: string
  description: string | null
  storage_quota_bytes: number
  monthly_price_cents: number
  annual_price_cents: number
  max_devices: number
  max_file_size_bytes: number
  ai_credits_monthly: number
  features: Record<string, unknown>
}

type HsSubscription = {
  id: string
  plan_id: string
  status: string
  billing_interval: string
  provider: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  seats: number
  plan: HsPlan
}

const PRODUCT_CODE = "gyenbox"
const OPEN_STATUSES = ["trialing", "active", "past_due"]
const PLAN_FIELDS = "id, product_code, code, name, description, storage_quota_bytes, monthly_price_cents, annual_price_cents, max_devices, max_file_size_bytes, ai_credits_monthly, features"
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hrtynofmjcumuanjvpxz.supabase.co"
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export class MembershipRequiredError extends Error {
  constructor() {
    super("Activate a GyenBox membership before using this feature.")
    this.name = "MembershipRequiredError"
  }
}

export async function getMembershipOverview(actor: ActorInput, accessToken: string) {
  const client = getHsClient(accessToken)
  const [plans, subscription, usedBytes] = await Promise.all([
    listHsPlans(client),
    findHsSubscription(client),
    getStorageUsed(actor.actorId),
  ])

  if (plans.length === 0) throw new Error("HalfSphere membership plans are not ready.")

  const fallbackPlan = plans[0]
  const quota = subscription?.plan.storage_quota_bytes ?? fallbackPlan?.storage_quota_bytes ?? 0

  return {
    authority: "halfsphere",
    productCode: PRODUCT_CODE,
    needsProvision: !subscription,
    current: subscription ? serializeSubscription(subscription) : null,
    plans: plans.map(serializePlan),
    storage: {
      usedBytes: Number(usedBytes),
      quotaBytes: Number(quota),
      usedLabel: formatBytes(usedBytes),
      quotaLabel: formatBytes(quota),
    },
  }
}

export async function provisionFreeMembership(actor: ActorInput, accessToken: string) {
  const client = getHsClient(accessToken)
  const existing = await findHsSubscription(client)
  if (existing) return getMembershipOverview(actor, accessToken)

  const { error } = await client.rpc("hs_activate_free_membership", {
    target_product_code: PRODUCT_CODE,
  })

  if (error) throw new Error(error.message)

  await syncLegacyQuota(actor.actorId, accessToken)
  return getMembershipOverview(actor, accessToken)
}

export async function getCurrentMembershipEntitlements(accessToken: string) {
  const subscription = await findHsSubscription(getHsClient(accessToken))
  if (!subscription) throw new MembershipRequiredError()

  return {
    productCode: PRODUCT_CODE,
    planCode: subscription.plan.code,
    storageQuotaBytes: Number(subscription.plan.storage_quota_bytes),
    maxDevices: Number(subscription.plan.max_devices),
    maxFileSizeBytes: Number(subscription.plan.max_file_size_bytes),
    aiCreditsMonthly: Number(subscription.plan.ai_credits_monthly),
    features: subscription.plan.features ?? {},
  }
}

function getHsClient(accessToken: string) {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

async function listHsPlans(client: ReturnType<typeof getHsClient>) {
  const { data, error } = await client
    .from("hs_membership_plans")
    .select(PLAN_FIELDS)
    .eq("product_code", PRODUCT_CODE)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as HsPlan[]
}

async function findHsSubscription(client: ReturnType<typeof getHsClient>) {
  const { data: rows, error } = await client
    .from("hs_subscriptions")
    .select("id, plan_id, status, billing_interval, provider, current_period_end, cancel_at_period_end, seats")
    .eq("product_code", PRODUCT_CODE)
    .in("status", OPEN_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)

  const subscription = rows?.[0]
  if (!subscription) return null

  const { data: plan, error: planError } = await client
    .from("hs_membership_plans")
    .select(PLAN_FIELDS)
    .eq("id", subscription.plan_id)
    .single()

  if (planError) throw new Error(planError.message)
  return { ...subscription, plan } as HsSubscription
}

async function getStorageUsed(userId: string) {
  try {
    return await getActiveStorageUsed(userId)
  } catch {
    return 0n
  }
}

async function syncLegacyQuota(userId: string, accessToken: string) {
  const subscription = await findHsSubscription(getHsClient(accessToken))
  if (!subscription) return

  try {
    await getPrisma().user.update({
      where: { id: userId },
      data: {
        plan: subscription.plan.code.toUpperCase() as never,
        storageQuota: BigInt(subscription.plan.storage_quota_bytes),
      },
    })
  } catch {
    // HalfSphere is the source of truth. Legacy GyenBox rows are best-effort.
  }
}

function serializeSubscription(subscription: HsSubscription) {
  return {
    id: subscription.id,
    productCode: subscription.plan.product_code,
    planCode: subscription.plan.code.toUpperCase(),
    planName: subscription.plan.name,
    status: subscription.status.toUpperCase(),
    billingInterval: subscription.billing_interval.toUpperCase(),
    provider: subscription.provider.toUpperCase(),
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    seats: subscription.seats,
    plan: serializePlan(subscription.plan),
  }
}

function serializePlan(plan: HsPlan) {
  return {
    code: plan.code.toUpperCase(),
    name: plan.name,
    description: plan.description,
    storageQuotaBytes: Number(plan.storage_quota_bytes),
    storageQuotaLabel: formatBytes(plan.storage_quota_bytes),
    monthlyPriceCents: plan.monthly_price_cents,
    annualPriceCents: plan.annual_price_cents,
    maxDevices: plan.max_devices,
    maxFileSizeBytes: Number(plan.max_file_size_bytes),
    maxFileSizeLabel: formatBytes(plan.max_file_size_bytes),
    aiCreditsMonthly: plan.ai_credits_monthly,
    features: plan.features ?? {},
  }
}
