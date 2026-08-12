import { fail, ok } from "@/lib/api-response"
import { appendScopeChange, rememberScopeMutation, userScope } from "@gyenbox/db"
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

const MUTATION_ID = /^[A-Za-z0-9_-]{16,160}$/

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
  const mutationId = request.headers.get("x-gyenbox-mutation-id")
  if (mutationId !== null && !MUTATION_ID.test(mutationId)) {
    return fail("INVALID_MUTATION_ID", "Expected a valid client mutation ID.", 400)
  }

  const prisma = getPrisma()
  const scope = userScope(actor.actorId)
  const replayMutation = async () => {
    if (!mutationId) return null
    const mutation = await prisma.scopeMutation.findUnique({
      where: { scopeType_scopeId_mutationId: { ...scope, mutationId } },
      select: { source: true, entityId: true },
    })
    if (mutation?.source !== "gyenbox.resource.update" || mutation.entityId !== params.id) return null

    const replayedFile = await prisma.file.findFirst({
      where: { id: params.id, ownerId: actor.actorId },
      include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
    })
    if (replayedFile) return fileToItem(replayedFile)

    const replayedFolder = await prisma.folder.findFirst({
      where: { id: params.id, ownerId: actor.actorId },
      include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
    })
    if (!replayedFolder) return null
    const [childFolders, childFiles] = await Promise.all([
      prisma.folder.count({ where: { ownerId: actor.actorId, parentId: replayedFolder.id, isTrashed: false } }),
      prisma.file.count({ where: { ownerId: actor.actorId, parentId: replayedFolder.id, isTrashed: false } }),
    ])
    return folderToItem(replayedFolder, childFolders + childFiles)
  }
  const replayed = await replayMutation()
  if (replayed) return ok({ file: replayed })

  const file = await prisma.file.findFirst({
    where: { id: params.id, ownerId: actor.actorId },
    include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
  })

  if (file) {
    const nextTrashState = parsed.data.isTrashed
    const trashChanged = typeof nextTrashState === "boolean" && nextTrashState !== file.isTrashed
    let updated
    try {
      updated = await prisma.$transaction(async (tx) => {
      const next = await tx.file.update({
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
      if (mutationId) {
        await rememberScopeMutation(tx, scope, {
          mutationId,
          source: "gyenbox.resource.update",
          entityId: next.id,
        })
      }
      await appendScopeChange(tx, scope, {
        source: "gyenbox",
        entityType: "file",
        entityId: next.id,
        action: "UPSERT",
        mutationId: mutationId ?? undefined,
      })
      return next
      })
    } catch (error) {
      if (mutationId && isMutationConflict(error)) {
        const retried = await replayMutation()
        if (retried) return ok({ file: retried })
      }
      throw error
    }

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
  let updatedFolder
  try {
    updatedFolder = folderTrashChanged
      ? await updateFolderTrashState(actor.actorId, params.id, nextTrashState, folder.trashedAt ?? null, {
        name: parsed.data.name,
        parentId: parsed.data.parentId,
        isStarred: parsed.data.isStarred,
        trashedAt: cascadeTrashedAt,
      }, mutationId ?? undefined)
      : await prisma.$transaction(async (tx) => {
        const next = await tx.folder.update({
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
        if (mutationId) {
          await rememberScopeMutation(tx, scope, {
            mutationId,
            source: "gyenbox.resource.update",
            entityId: next.id,
          })
        }
        await appendScopeChange(tx, scope, {
          source: "gyenbox",
          entityType: "folder",
          entityId: next.id,
          action: "UPSERT",
          mutationId: mutationId ?? undefined,
        })
        return next
        })
  } catch (error) {
    if (mutationId && isMutationConflict(error)) {
      const retried = await replayMutation()
      if (retried) return ok({ file: retried })
    }
    throw error
  }

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
  const mutationId = request.headers.get("x-gyenbox-mutation-id")
  if (mutationId !== null && !MUTATION_ID.test(mutationId)) {
    return fail("INVALID_MUTATION_ID", "Expected a valid client mutation ID.", 400)
  }

  const prisma = getPrisma()
  const scope = userScope(actor.actorId)
  if (mutationId) {
    const existingMutation = await prisma.scopeMutation.findUnique({
      where: { scopeType_scopeId_mutationId: { ...scope, mutationId } },
      select: { source: true, entityId: true },
    })
    if (existingMutation?.source === "gyenbox.resource.delete" && existingMutation.entityId === params.id) {
      return ok({ id: params.id, isTrashed: true })
    }
  }
  const trashedAt = new Date()
  let file
  try {
    file = await prisma.$transaction(async (tx) => {
    const updated = await tx.file.updateMany({
      where: { id: params.id, ownerId: actor.actorId },
      data: { isTrashed: true, trashedAt },
    })
    if (updated.count > 0) {
      if (mutationId) {
        await rememberScopeMutation(tx, scope, {
          mutationId,
          source: "gyenbox.resource.delete",
          entityId: params.id,
        })
      }
      await appendScopeChange(tx, scope, {
        source: "gyenbox",
        entityType: "file",
        entityId: params.id,
        action: "DELETE",
        mutationId: mutationId ?? undefined,
      })
    }
    return updated
    })
  } catch (error) {
    if (mutationId && isMutationConflict(error) && await hasDeletedMutation(prisma, scope, mutationId, params.id)) {
      return ok({ id: params.id, isTrashed: true })
    }
    throw error
  }

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
  try {
    await prisma.$transaction(async (tx) => {
    await tx.file.updateMany({
      where: { ownerId: actor.actorId, parentId: { in: folderIds } },
      data: { isTrashed: true, trashedAt },
    })
    await tx.folder.updateMany({
      where: { ownerId: actor.actorId, id: { in: folderIds } },
      data: { isTrashed: true, trashedAt },
    })
    if (mutationId) {
      await rememberScopeMutation(tx, scope, {
        mutationId,
        source: "gyenbox.resource.delete",
        entityId: folder.id,
      })
    }
    await appendScopeChange(tx, scope, {
      source: "gyenbox",
      entityType: "folder-tree",
      entityId: folder.id,
      action: "DELETE",
      mutationId: mutationId ?? undefined,
    })
    })
  } catch (error) {
    if (mutationId && isMutationConflict(error) && await hasDeletedMutation(prisma, scope, mutationId, folder.id)) {
      return ok({ id: params.id, isTrashed: true })
    }
    throw error
  }
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
  mutationId?: string,
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

    const updated = await tx.folder.update({
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
    const scope = userScope(ownerId)
    if (mutationId) {
      await rememberScopeMutation(tx, scope, {
        mutationId,
        source: "gyenbox.resource.update",
        entityId: folderId,
      })
    }
    await appendScopeChange(tx, scope, {
      source: "gyenbox",
      entityType: "folder-tree",
      entityId: folderId,
      action: isTrashed ? "DELETE" : "UPSERT",
      mutationId,
    })
    return updated
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

function isMutationConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"
}

async function hasDeletedMutation(
  prisma: ReturnType<typeof getPrisma>,
  scope: ReturnType<typeof userScope>,
  mutationId: string,
  entityId: string,
) {
  const mutation = await prisma.scopeMutation.findUnique({
    where: { scopeType_scopeId_mutationId: { ...scope, mutationId } },
    select: { source: true, entityId: true },
  })
  return mutation?.source === "gyenbox.resource.delete" && mutation.entityId === entityId
}
