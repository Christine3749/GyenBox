import { fail, ok } from "@/lib/api-response"
import { requireActor } from "@/lib/ownership"
import { uploadCompleteSchema } from "@/lib/validations"

export async function POST(request: Request) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  const parsed = uploadCompleteSchema.safeParse(body)
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid upload completion payload.", 422, parsed.error.flatten())
  }

  return ok({
    file: {
      id: parsed.data.fileId,
      ownerId: actor.actorId,
      status: "indexed",
      thumbnailQueued: true,
      searchQueued: true,
    },
  })
}
