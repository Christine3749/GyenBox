import { fail, ok } from "@/lib/api-response"
import { fileToItem, folderToItem } from "@/lib/file-records"
import { assertResourceOwner, requireActor } from "@/lib/ownership"
import { getPrisma } from "@/lib/prisma"
import { updateFileSchema } from "@/lib/validations"

type FileRouteProps = {
  params: {
    id: string
  }
}

export const runtime = "nodejs"

export async function GET(request: Request, { params }: FileRouteProps) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const ownsResource = await assertResourceOwner(actor.actorId, "file", params.id)
  if (!ownsResource) return fail("FORBIDDEN", "You do not have access to this file.", 403)

  return ok({
    id: params.id,
    downloadUrl: `/api/download/${params.id}`,
  })
}

export async function PATCH(request: Request, { params }: FileRouteProps) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  const parsed = updateFileSchema.safeParse(body)
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid file update payload.", 422, parsed.error.flatten())
  }

  const prisma = getPrisma()
  const file = await prisma.file.findFirst({
    where: { id: params.id, ownerId: actor.actorId },
    include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
  })

  if (file) {
    const updated = await prisma.file.update({
      where: { id: params.id },
      data: {
        name: parsed.data.name,
        parentId: parsed.data.parentId,
        isStarred: parsed.data.isStarred,
        isTrashed: parsed.data.isTrashed,
        trashedAt: parsed.data.isTrashed ? new Date() : parsed.data.isTrashed === false ? null : undefined,
      },
      include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
    })

    return ok({ file: fileToItem(updated) })
  }

  const folder = await prisma.folder.findFirst({
    where: { id: params.id, ownerId: actor.actorId },
    include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
  })
  if (!folder) return fail("FORBIDDEN", "You do not have access to this resource.", 403)

  const updatedFolder = await prisma.folder.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      parentId: parsed.data.parentId,
      isStarred: parsed.data.isStarred,
      isTrashed: parsed.data.isTrashed,
      trashedAt: parsed.data.isTrashed ? new Date() : parsed.data.isTrashed === false ? null : undefined,
    },
    include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
  })

  const [childFolders, childFiles] = await Promise.all([
    prisma.folder.count({ where: { ownerId: actor.actorId, parentId: updatedFolder.id, isTrashed: false } }),
    prisma.file.count({ where: { ownerId: actor.actorId, parentId: updatedFolder.id, isTrashed: false } }),
  ])

  return ok({ file: folderToItem(updatedFolder, childFolders + childFiles) })
}

export async function DELETE(request: Request, { params }: FileRouteProps) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = { isTrashed: true }
  const file = await getPrisma().file.updateMany({
    where: { id: params.id, ownerId: actor.actorId },
    data: { isTrashed: true, trashedAt: new Date() },
  })

  if (file.count === 0) {
    const folder = await getPrisma().folder.updateMany({
      where: { id: params.id, ownerId: actor.actorId },
      data: { isTrashed: true, trashedAt: new Date() },
    })
    if (folder.count === 0) return fail("FORBIDDEN", "You do not have access to this resource.", 403)
  }

  return ok({ id: params.id, ...body, trashedAt: new Date().toISOString() })
}
