import { fail, ok } from "@/lib/api-response"
import { deleteNotePermanently, NoteConflictError, updateNote } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  if (!body) return fail("INVALID_BODY", "Missing note payload.", 400)

  try {
    const expectedUpdatedAt = Number.isSafeInteger(body.baseUpdatedAt) ? body.baseUpdatedAt : undefined
    const note = await updateNote(actor, id, body, expectedUpdatedAt)
    if (!note) return fail("NOTE_NOT_FOUND", "Note not found.", 404)
    return ok(note)
  } catch (error) {
    if (error instanceof NoteConflictError) {
      return fail("NOTE_CONFLICT", error.message, 409, { current: error.current })
    }
    return fail("NOTE_UPDATE_FAILED", "Could not update note.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  try {
    const deleted = await deleteNotePermanently(actor, id)
    if (!deleted) return fail("NOTE_NOT_FOUND", "Note not found.", 404)
    return ok({ id })
  } catch (error) {
    return fail("NOTE_DELETE_FAILED", "Could not delete note.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
