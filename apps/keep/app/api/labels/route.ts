import { fail, ok } from "@/lib/api-response"
import { createLabel } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body.name !== "string") {
    return fail("INVALID_BODY", "Expected { name: string }.", 400)
  }

  try {
    const label = await createLabel(actor, body.name)
    if (!label) return fail("INVALID_NAME", "Label name cannot be empty.", 400)
    return ok(label, 201)
  } catch (error) {
    return fail("LABEL_CREATE_FAILED", "Could not create label.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
