import { createClient } from "@supabase/supabase-js"

// Keep is bundled into the GyenBox membership rather than sold as a
// separate product — same product_code as apps/web, see
// gyenbox/docs/membership-system.md.
const PRODUCT_CODE = "gyenbox"
const OPEN_STATUSES = ["trialing", "active", "past_due"]
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hrtynofmjcumuanjvpxz.supabase.co"
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getHsClient(accessToken: string) {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/**
 * Keep has no paid tiers of its own — this just makes sure the signed-in
 * user has an open HalfSphere membership row for product_code "gyenbox" so
 * they show up consistently alongside the rest of the GyenBox suite.
 * Best-effort: failures here should never block note-taking.
 */
export async function ensureFreeMembership(accessToken: string): Promise<void> {
  const client = getHsClient(accessToken)

  const { data: rows, error } = await client
    .from("hs_subscriptions")
    .select("id")
    .eq("product_code", PRODUCT_CODE)
    .in("status", OPEN_STATUSES)
    .limit(1)

  if (error || (rows && rows.length > 0)) return

  await client.rpc("hs_activate_free_membership", { target_product_code: PRODUCT_CODE })
}
