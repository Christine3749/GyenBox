import { fail, ok } from "@/lib/api-response"
import { reorderNotes } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.ids)) {
    return fail("INVALID_BODY", "Expected { ids: string[] }.", 400)
  }

  try {
    await reorderNotes(actor, body.ids)
    return ok({ ok: true })
  } catch (error) {
    return fail("NOTES_REORDER_FAILED", "Could not reorder notes.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
