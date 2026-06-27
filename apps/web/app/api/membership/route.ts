import { fail, ok } from "@/lib/api-response"
import { getMembershipOverview, provisionFreeMembership } from "@/lib/membership"
import { requireActor } from "@/lib/ownership"
import { getBearerToken } from "@/lib/supabase-server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const accessToken = getBearerToken(request)
  if (!accessToken) return fail("AUTH_REQUIRED", "Missing Supabase access token.", 401)

  try {
    return ok(await getMembershipOverview(actor, accessToken))
  } catch (error) {
    return fail("MEMBERSHIP_UNAVAILABLE", "Membership is not ready yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown membership error",
    })
  }
}

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const accessToken = getBearerToken(request)
  if (!accessToken) return fail("AUTH_REQUIRED", "Missing Supabase access token.", 401)

  try {
    return ok(await provisionFreeMembership(actor, accessToken), 201)
  } catch (error) {
    return fail("MEMBERSHIP_PROVISION_FAILED", "Could not activate membership yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown membership error",
    })
  }
}
