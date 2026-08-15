import { fail, logApiFailure, ok } from "@/lib/api-response"
import { listKeepChanges } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

function readCursor(request: Request): bigint | null {
  const raw = new URL(request.url).searchParams.get("cursor")
  if (!raw || !/^\d{1,20}$/.test(raw)) return null
  try {
    const cursor = BigInt(raw)
    return cursor <= 9_223_372_036_854_775_807n ? cursor : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const cursor = readCursor(request)
  if (cursor === null) return fail("INVALID_CURSOR", "Expected a valid sync cursor.", 400)

  try {
    const response = ok(await listKeepChanges(actor, cursor))
    response.headers.set("Cache-Control", "private, no-store")
    response.headers.set("Vary", "Authorization")
    return response
  } catch (error) {
    logApiFailure("notes.changes", error)
    return fail("NOTES_CHANGES_UNAVAILABLE", "Could not synchronize note changes.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
