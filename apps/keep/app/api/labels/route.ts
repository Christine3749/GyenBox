import { fail, logApiFailure, ok } from "@/lib/api-response"
import { createLabel, listLabels } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  try {
    return ok(await listLabels(actor))
  } catch (error) {
    logApiFailure("labels.list", error)
    return fail("LABELS_UNAVAILABLE", "Could not load labels.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

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
    logApiFailure("labels.create", error)
    return fail("LABEL_CREATE_FAILED", "Could not create label.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
