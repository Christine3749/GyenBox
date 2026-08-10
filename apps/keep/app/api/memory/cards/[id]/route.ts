import { fail, ok } from "@/lib/api-response"
import { deleteMemoryCard, updateMemoryCard } from "@/lib/memory-data"
import { requireActor } from "@/lib/ownership"
import { parseMemoryCardInput } from "../route"

export const runtime = "nodejs"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response
  const body = await request.json().catch(() => null)
  try {
    const card = await updateMemoryCard(actor, id, parseMemoryCardInput(body, true))
    if (!card) return fail("MEMORY_CARD_NOT_FOUND", "Memory card not found.", 404)
    return ok(card)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid memory card"
    if (message.includes("invalid") || message.includes("must not")) {
      return fail("INVALID_MEMORY_CARD", message, 400)
    }
    return fail("MEMORY_UPDATE_FAILED", "Could not update memory card.", 503, { message })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response
  try {
    if (!await deleteMemoryCard(actor, id)) return fail("MEMORY_CARD_NOT_FOUND", "Memory card not found.", 404)
    return ok({ id })
  } catch (error) {
    return fail("MEMORY_DELETE_FAILED", "Could not delete memory card.", 503, { message: error instanceof Error ? error.message : "Unknown error" })
  }
}
