import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import { fail, ok } from "@/lib/api-response"
import { ensureUserRecord } from "@/lib/file-records"
import { assertResourceOwner, requireActor } from "@/lib/ownership"
import { getPrisma } from "@/lib/prisma"
import { shareCreateSchema } from "@/lib/validations"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  const parsed = shareCreateSchema.safeParse(body)
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid share payload.", 422, parsed.error.flatten())
  }

  const ownsResource = await assertResourceOwner(actor.actorId, parsed.data.resourceType, parsed.data.resourceId)
  if (!ownsResource) return fail("FORBIDDEN", "You do not have access to this resource.", 403)

  await ensureUserRecord(actor)
  const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : null
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null

  const share = await getPrisma().share.create({
    data: {
      token: nanoid(32),
      permission: parsed.data.permission,
      passwordHash,
      expiresAt,
      createdById: actor.actorId,
      fileId: parsed.data.resourceType === "file" ? parsed.data.resourceId : null,
      folderId: parsed.data.resourceType === "folder" ? parsed.data.resourceId : null,
    },
  })

  return ok(
    {
      token: share.token,
      url: `${new URL(request.url).origin}/share/${share.token}`,
      permission: share.permission,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      passwordProtected: Boolean(passwordHash),
    },
    201,
  )
}
