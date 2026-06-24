import { fail, ok } from "@/lib/api-response"
import { assertResourceOwner, requireActor } from "@/lib/ownership"
import { updateFileSchema } from "@/lib/validations"

type FileRouteProps = {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: FileRouteProps) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const ownsResource = await assertResourceOwner(actor.actorId, "file", params.id)
  if (!ownsResource) return fail("FORBIDDEN", "You do not have access to this file.", 403)

  return ok({
    id: params.id,
    downloadUrl: `/api/download/${params.id}`,
  })
}

export async function PATCH(request: Request, { params }: FileRouteProps) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  const parsed = updateFileSchema.safeParse(body)
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid file update payload.", 422, parsed.error.flatten())
  }

  const ownsResource = await assertResourceOwner(actor.actorId, "file", params.id)
  if (!ownsResource) return fail("FORBIDDEN", "You do not have access to this file.", 403)

  return ok({
    id: params.id,
    ...parsed.data,
  })
}

export async function DELETE(request: Request, { params }: FileRouteProps) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const ownsResource = await assertResourceOwner(actor.actorId, "file", params.id)
  if (!ownsResource) return fail("FORBIDDEN", "You do not have access to this file.", 403)

  return ok({
    id: params.id,
    isTrashed: true,
    trashedAt: new Date().toISOString(),
  })
}
