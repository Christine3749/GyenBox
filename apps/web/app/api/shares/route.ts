import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import { fail, ok } from "@/lib/api-response"
import { assertResourceOwner, requireActor } from "@/lib/ownership"
import { shareCreateSchema } from "@/lib/validations"

export async function POST(request: Request) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  const parsed = shareCreateSchema.safeParse(body)
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid share payload.", 422, parsed.error.flatten())
  }

  const ownsResource = await assertResourceOwner(actor.actorId, parsed.data.resourceType, parsed.data.resourceId)
  if (!ownsResource) return fail("FORBIDDEN", "You do not have access to this resource.", 403)

  const token = nanoid(32)
  const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : null

  return ok(
    {
      token,
      url: `${new URL(request.url).origin}/share/${token}`,
      permission: parsed.data.permission,
      expiresAt: parsed.data.expiresAt ?? null,
      passwordProtected: Boolean(passwordHash),
    },
    201,
  )
}
