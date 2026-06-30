import { fail, ok } from "@/lib/api-response"
import { fileToItem, folderToItem, syncUserStorageUsed } from "@/lib/file-records"
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
    const nextTrashState = parsed.data.isTrashed
    const trashChanged = typeof nextTrashState === "boolean" && nextTrashState !== file.isTrashed
    const updated = await prisma.file.update({
      where: { id: params.id },
      data: {
        name: parsed.data.name,
        parentId: parsed.data.parentId,
        isStarred: parsed.data.isStarred,
        isTrashed: nextTrashState,
        trashedAt: nextTrashState ? new Date() : nextTrashState === false ? null : undefined,
      },
      include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
    })

    if (trashChanged) await syncUserStorageUsed(actor.actorId)
    return ok({ file: fileToItem(updated) })
  }

  const folder = await prisma.folder.findFirst({
    where: { id: params.id, ownerId: actor.actorId },
    include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
  })
  if (!folder) return fail("FORBIDDEN", "You do not have access to this resource.", 403)

  const nextTrashState = parsed.data.isTrashed
  const folderTrashChanged = typeof nextTrashState === "boolean" && nextTrashState !== folder.isTrashed
  const cascadeTrashedAt = nextTrashState ? new Date() : nextTrashState === false ? null : undefined
  const updatedFolder = folderTrashChanged
    ? await updateFolderTrashState(actor.actorId, params.id, nextTrashState, folder.trashedAt ?? null, {
        name: parsed.data.name,
        parentId: parsed.data.parentId,
        isStarred: parsed.data.isStarred,
        trashedAt: cascadeTrashedAt,
      })
    : await prisma.folder.update({
        where: { id: params.id },
        data: {
          name: parsed.data.name,
          parentId: parsed.data.parentId,
          isStarred: parsed.data.isStarred,
          isTrashed: nextTrashState,
          trashedAt: cascadeTrashedAt,
        },
        include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
      })

  if (folderTrashChanged) await syncUserStorageUsed(actor.actorId)

  const [childFolders, childFiles] = await Promise.all([
    prisma.folder.count({ where: { ownerId: actor.actorId, parentId: updatedFolder.id, isTrashed: false } }),
    prisma.file.count({ where: { ownerId: actor.actorId, parentId: updatedFolder.id, isTrashed: false } }),
  ])

  return ok({ file: folderToItem(updatedFolder, childFolders + childFiles) })
}

export async function DELETE(request: Request, { params }: FileRouteProps) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const prisma = getPrisma()
  const trashedAt = new Date()
  const file = await prisma.file.updateMany({
    where: { id: params.id, ownerId: actor.actorId },
    data: { isTrashed: true, trashedAt },
  })

  if (file.count > 0) {
    await syncUserStorageUsed(actor.actorId)
    return ok({ id: params.id, isTrashed: true, trashedAt: trashedAt.toISOString() })
  }

  const folder = await prisma.folder.findFirst({
    where: { id: params.id, ownerId: actor.actorId },
    select: { id: true },
  })
  if (!folder) return fail("FORBIDDEN", "You do not have access to this resource.", 403)

  const folderIds = await collectFolderTreeIds(actor.actorId, folder.id)
  await prisma.$transaction([
    prisma.file.updateMany({
      where: { ownerId: actor.actorId, parentId: { in: folderIds } },
      data: { isTrashed: true, trashedAt },
    }),
    prisma.folder.updateMany({
      where: { ownerId: actor.actorId, id: { in: folderIds } },
      data: { isTrashed: true, trashedAt },
    }),
  ])
  await syncUserStorageUsed(actor.actorId)

  return ok({ id: params.id, isTrashed: true, trashedAt: trashedAt.toISOString() })
}

async function updateFolderTrashState(
  ownerId: string,
  folderId: string,
  isTrashed: boolean,
  previousTrashedAt: Date | null,
  rootData: {
    name?: string
    parentId?: string | null
    isStarred?: boolean
    trashedAt?: Date | null
  },
) {
  const prisma = getPrisma()
  const folderIds = await collectFolderTreeIds(ownerId, folderId)
  const restoreTimestampFilter = !isTrashed && previousTrashedAt ? { trashedAt: previousTrashedAt } : {}
  const cascadeWhere = isTrashed
    ? { ownerId, isTrashed: false }
    : { ownerId, isTrashed: true, ...restoreTimestampFilter }

  return prisma.$transaction(async (tx) => {
    await tx.file.updateMany({
      where: { ...cascadeWhere, parentId: { in: folderIds } },
      data: { isTrashed, trashedAt: rootData.trashedAt },
    })
    await tx.folder.updateMany({
      where: { ...cascadeWhere, id: { in: folderIds } },
      data: { isTrashed, trashedAt: rootData.trashedAt },
    })

    return tx.folder.update({
      where: { id: folderId },
      data: {
        name: rootData.name,
        parentId: rootData.parentId,
        isStarred: rootData.isStarred,
        isTrashed,
        trashedAt: rootData.trashedAt,
      },
      include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
    })
  })
}

async function collectFolderTreeIds(ownerId: string, rootFolderId: string) {
  const prisma = getPrisma()
  const ids = new Set([rootFolderId])
  let frontier = [rootFolderId]

  while (frontier.length > 0) {
    const children = await prisma.folder.findMany({
      where: { ownerId, parentId: { in: frontier } },
      select: { id: true },
    })
    frontier = children.map((child) => child.id).filter((id) => !ids.has(id))
    for (const id of frontier) ids.add(id)
  }

  return [...ids]
}