import { fail, ok } from "@/lib/api-response"
import { importData } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  if (!body) return fail("INVALID_BODY", "Expected { notes, labels }.", 400)

  try {
    return ok(await importData(actor, body))
  } catch (error) {
    return fail("IMPORT_FAILED", "Could not import backup.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
