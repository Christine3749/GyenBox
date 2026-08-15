import { fail, logApiFailure, ok } from "@/lib/api-response"
import { createLabel, listLabels } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

const MUTATION_ID = /^[A-Za-z0-9_-]{16,160}$/

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
  const mutationId = request.headers.get("x-gyenbox-mutation-id")
  if (mutationId !== null && !MUTATION_ID.test(mutationId)) {
    return fail("INVALID_MUTATION_ID", "Expected a valid client mutation ID.", 400)
  }

  try {
    const label = await createLabel(actor, body.name, mutationId ?? undefined)
    if (!label) return fail("INVALID_NAME", "Label name cannot be empty.", 400)
    return ok(label, 201)
  } catch (error) {
    logApiFailure("labels.create", error)
    return fail("LABEL_CREATE_FAILED", "Could not create label.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
