import { listScopeChanges, userScope } from "@gyenbox/db"
import { fail, ok } from "@/lib/api-response"
import { requireActor } from "@/lib/ownership"
import { getPrisma } from "@/lib/prisma"

export const runtime = "nodejs"

const MAX_CURSOR = 9_223_372_036_854_775_807n

function readCursor(request: Request) {
  const raw = new URL(request.url).searchParams.get("cursor") ?? "0"
  if (!/^\d+$/.test(raw)) return null
  const cursor = BigInt(raw)
  return cursor <= MAX_CURSOR ? cursor : null
}

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const cursor = readCursor(request)
  if (cursor === null) return fail("INVALID_CURSOR", "Expected a valid sync cursor.", 400)

  try {
    const page = await listScopeChanges(getPrisma(), userScope(actor.actorId), cursor)
    const response = ok(page)
    response.headers.set("Cache-Control", "private, no-store")
    response.headers.set("Vary", "Authorization")
    return response
  } catch (error) {
    return fail("SYNC_UNAVAILABLE", "Could not read synchronized changes.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
