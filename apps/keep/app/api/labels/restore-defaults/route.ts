import { fail, logApiFailure, ok } from "@/lib/api-response"
import { restoreDefaultLabels } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.names) || body.names.some((name: unknown) => typeof name !== "string")) {
    return fail("INVALID_BODY", "Expected { names: string[] }.", 400)
  }

  try {
    return ok(await restoreDefaultLabels(actor, body.names))
  } catch (error) {
    logApiFailure("labels.restore-defaults", error)
    return fail("LABEL_RESTORE_FAILED", "Could not restore default labels.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
