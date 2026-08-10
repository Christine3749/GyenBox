import { fail, ok } from "@/lib/api-response"
import { deleteLabel, renameLabel } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body.name !== "string") {
    return fail("INVALID_BODY", "Expected { name: string }.", 400)
  }

  try {
    const label = await renameLabel(actor, id, body.name)
    if (!label) return fail("LABEL_NOT_FOUND", "Label not found.", 404)
    return ok(label)
  } catch (error) {
    return fail("LABEL_RENAME_FAILED", "Could not rename label.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  try {
    await deleteLabel(actor, id)
    return ok({ id })
  } catch (error) {
    return fail("LABEL_DELETE_FAILED", "Could not delete label.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
