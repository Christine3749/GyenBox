import { fail, ok } from "@/lib/api-response"
import { requireActor } from "@/lib/ownership"
import { folderCreateSchema } from "@/lib/validations"

export async function GET(request: Request) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  return ok({
    folders: [
      { id: "root", name: "My files", parentId: null },
      { id: "strategy", name: "GSYEN Strategy", parentId: "root" },
    ],
  })
}

export async function POST(request: Request) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  const parsed = folderCreateSchema.safeParse(body)
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid folder payload.", 422, parsed.error.flatten())
  }

  return ok(
    {
      id: `folder_${crypto.randomUUID()}`,
      ownerId: actor.actorId,
      ...parsed.data,
    },
    201,
  )
}
