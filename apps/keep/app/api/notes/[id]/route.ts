import { fail, ok } from "@/lib/api-response"
import { deleteNotePermanently, updateNote } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  if (!body) return fail("INVALID_BODY", "Missing note payload.", 400)

  try {
    const note = await updateNote(actor, params.id, body)
    if (!note) return fail("NOTE_NOT_FOUND", "Note not found.", 404)
    return ok(note)
  } catch (error) {
    return fail("NOTE_UPDATE_FAILED", "Could not update note.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  try {
    const deleted = await deleteNotePermanently(actor, params.id)
    if (!deleted) return fail("NOTE_NOT_FOUND", "Note not found.", 404)
    return ok({ id: params.id })
  } catch (error) {
    return fail("NOTE_DELETE_FAILED", "Could not delete note.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
