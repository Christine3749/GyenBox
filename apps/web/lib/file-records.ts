import { getPrisma } from "@/lib/prisma"
import type { SupabaseActor } from "@/lib/supabase-server"
import type { FileItem, FileType } from "@/components/gyenbox/types"

type DbOwner = {
  email: string
  name: string | null
  avatarUrl: string | null
}

type DbFile = {
  id: string
  name: string
  mimeType: string
  size: bigint | number
  parentId: string | null
  isStarred: boolean
  isTrashed: boolean
  createdAt: Date
  updatedAt: Date
  owner: DbOwner
  _count?: { shares: number }
}

type DbFolder = {
  id: string
  name: string
  parentId: string | null
  isStarred: boolean
  isTrashed: boolean
  createdAt: Date
  updatedAt: Date
  owner: DbOwner
  _count?: { shares: number }
}

export function getInitials(nameOrEmail: string | null | undefined) {
  const value = (nameOrEmail ?? "GyenBox User").trim()
  const words = value.includes("@") ? [value[0], value.split("@")[0]?.[1]] : value.split(/\s+/).map((part) => part[0])
  return words
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function detectFileType(name: string, mimeType = ""): FileType {
  const lower = name.toLowerCase()
  if (mimeType.startsWith("image/png") || lower.endsWith(".png")) return "png"
  if (mimeType.startsWith("image/jpeg") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg"
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "docx"
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv")) return "xlsx"
  if (mimeType.startsWith("video/") || lower.endsWith(".mp4")) return "mp4"
  if (lower.endsWith(".zip") || lower.endsWith(".7z") || lower.endsWith(".rar")) return "zip"
  return "txt"
}

export function formatBytes(bytesInput: bigint | number) {
  const bytes = Number(bytesInput)
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`
}

export function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return days === 1 ? "Yesterday" : `${days}d ago`

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" })
}

function ownerPayload(owner: DbOwner) {
  const name = owner.name ?? owner.email
  return {
    name,
    avatar: getInitials(name),
    email: owner.email,
  }
}

export function fileToItem(file: DbFile): FileItem {
  const bytes = Number(file.size)
  return {
    id: file.id,
    name: file.name,
    type: detectFileType(file.name, file.mimeType),
    size: formatBytes(file.size),
    sizeBytes: bytes,
    modifiedAt: formatRelativeDate(file.updatedAt),
    createdAt: file.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    starred: file.isStarred,
    shared: (file._count?.shares ?? 0) > 0,
    parentFolderId: file.parentId,
    isTrash: file.isTrashed,
    owner: ownerPayload(file.owner),
  }
}

export function folderToItem(folder: DbFolder, itemCount: number): FileItem {
  return {
    id: folder.id,
    name: folder.name,
    type: "folder",
    itemCount,
    size: `${itemCount} items`,
    sizeBytes: 0,
    modifiedAt: formatRelativeDate(folder.updatedAt),
    createdAt: folder.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    starred: folder.isStarred,
    shared: (folder._count?.shares ?? 0) > 0,
    parentFolderId: folder.parentId,
    isTrash: folder.isTrashed,
    owner: ownerPayload(folder.owner),
  }
}

export async function getActiveStorageUsed(ownerId: string) {
  const storage = await getPrisma().file.aggregate({
    where: { ownerId, isTrashed: false },
    _sum: { size: true },
  })
  return storage._sum.size ?? 0n
}

export async function syncUserStorageUsed(ownerId: string) {
  const storageUsed = await getActiveStorageUsed(ownerId)
  await getPrisma().user.update({
    where: { id: ownerId },
    data: { storageUsed },
  })
  return storageUsed
}
export async function ensureUserRecord(actor: Pick<SupabaseActor, "actorId" | "email" | "name" | "avatarUrl">) {
  const email = actor.email ?? `${actor.actorId}@users.gyenbox.local`
  return getPrisma().user.upsert({
    where: { id: actor.actorId },
    update: {
      email,
      name: actor.name,
      avatarUrl: actor.avatarUrl,
    },
    create: {
      id: actor.actorId,
      email,
      name: actor.name,
      avatarUrl: actor.avatarUrl,
    },
  })
}

export async function listFileItems(actor: Pick<SupabaseActor, "actorId" | "email" | "name" | "avatarUrl">, folderId?: string | null) {
  const user = await ensureUserRecord(actor)

  const parentId = folderId && folderId !== "root" ? folderId : null
  const where = {
    ownerId: actor.actorId,
    parentId,
    isTrashed: false,
  }

  const [folders, files, storage] = await Promise.all([
    getPrisma().folder.findMany({
      where,
      include: {
        owner: { select: { email: true, name: true, avatarUrl: true } },
        _count: { select: { shares: true } },
      },
      orderBy: [{ name: "asc" }],
    }),
    getPrisma().file.findMany({
      where,
      include: {
        owner: { select: { email: true, name: true, avatarUrl: true } },
        _count: { select: { shares: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    getActiveStorageUsed(actor.actorId),
  ])

  const folderCounts = await Promise.all(
    folders.map(async (folder) => {
      const [childFolders, childFiles] = await Promise.all([
        getPrisma().folder.count({ where: { ownerId: actor.actorId, parentId: folder.id, isTrashed: false } }),
        getPrisma().file.count({ where: { ownerId: actor.actorId, parentId: folder.id, isTrashed: false } }),
      ])
      return [folder.id, childFolders + childFiles] as const
    }),
  )

  const counts = new Map(folderCounts)
  const items = [
    ...folders.map((folder) => folderToItem(folder, counts.get(folder.id) ?? 0)),
    ...files.map(fileToItem),
  ]

  return {
    files: items,
    total: items.length,
    storageUsedBytes: Number(storage),
    storageQuotaBytes: Number(user.storageQuota),
  }
}
