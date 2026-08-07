import { fail, ok } from "@/lib/api-response"
import { emptyTrash } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function DELETE(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  try {
    await emptyTrash(actor)
    return ok({ ok: true })
  } catch (error) {
    return fail("TRASH_EMPTY_FAILED", "Could not empty trash.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
