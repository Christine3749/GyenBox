import { Prisma, NoteType as DbNoteType, NoteColor as DbNoteColor } from "@gyenbox/db"
import { getPrisma } from "./prisma"
import type { SupabaseActor } from "./supabase-server"
import type { ChecklistItem, Label, Note, NoteColor, NoteSource } from "@/types"

type ActorInput = Pick<SupabaseActor, "actorId" | "email" | "name" | "avatarUrl">
type NoteInput = Omit<Note, "id" | "createdAt" | "updatedAt" | "order" | "source" | "sourceId" | "capturedAt">

export const GY_CLIPBOARD_SOURCE = "gy-clipboard"

const COLOR_TO_DB: Record<NoteColor, DbNoteColor> = {
  default: "DEFAULT",
  red: "RED",
  orange: "ORANGE",
  yellow: "YELLOW",
  green: "GREEN",
  teal: "TEAL",
  blue: "BLUE",
  purple: "PURPLE",
  pink: "PINK",
  brown: "BROWN",
  gray: "GRAY",
}

const COLOR_FROM_DB: Record<DbNoteColor, NoteColor> = {
  DEFAULT: "default",
  RED: "red",
  ORANGE: "orange",
  YELLOW: "yellow",
  GREEN: "green",
  TEAL: "teal",
  BLUE: "blue",
  PURPLE: "purple",
  PINK: "pink",
  BROWN: "brown",
  GRAY: "gray",
}

export async function ensureUserRecord(actor: ActorInput) {
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

function noteToDto(row: {
  id: string
  title: string
  content: string
  type: DbNoteType
  items: Prisma.JsonValue
  color: DbNoteColor
  isPinned: boolean
  isArchived: boolean
  isTrashed: boolean
  trashedAt: Date | null
  labelIds: string[]
  reminder: string | null
  order: number
  source: string
  sourceId: string | null
  capturedAt: Date | null
  mediaStorageKey: string | null
  mediaMimeType: string | null
  mediaSize: number | null
  mediaSha256: string | null
  createdAt: Date
  updatedAt: Date
}): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type === "CHECKLIST" ? "checklist" : "text",
    items: row.type === "CHECKLIST" ? ((row.items as unknown as ChecklistItem[] | null) ?? []) : undefined,
    color: COLOR_FROM_DB[row.color],
    isPinned: row.isPinned,
    isArchived: row.isArchived,
    isTrashed: row.isTrashed,
    trashedAt: row.trashedAt ? row.trashedAt.getTime() : undefined,
    labels: row.labelIds,
    reminder: row.reminder,
    source: row.source === GY_CLIPBOARD_SOURCE ? "gy-clipboard" : "manual",
    sourceId: row.sourceId ?? undefined,
    capturedAt: row.capturedAt ? row.capturedAt.getTime() : undefined,
    image: row.mediaStorageKey && row.mediaMimeType && row.mediaSize !== null
      ? {
          mimeType: row.mediaMimeType,
          sizeBytes: row.mediaSize,
          // This endpoint uses the browser's same-origin Supabase session.
          url: `/api/clipboard/images/${encodeURIComponent(row.sourceId ?? row.id)}`,
        }
      : undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    order: row.order,
  }
}

function labelToDto(row: { id: string; name: string }): Label {
  return { id: row.id, name: row.name }
}

export async function listNotesAndLabels(actor: ActorInput) {
  await ensureUserRecord(actor)

  const [notes, labels] = await Promise.all([
    getPrisma().note.findMany({
      where: { ownerId: actor.actorId },
      orderBy: [{ order: "asc" }],
    }),
    getPrisma().noteLabel.findMany({
      where: { ownerId: actor.actorId },
      orderBy: [{ createdAt: "asc" }],
    }),
  ])

  return {
    notes: notes.map(noteToDto),
    labels: labels.map(labelToDto),
  }
}

export async function createNote(actor: ActorInput, input: NoteInput): Promise<Note> {
  const count = await getPrisma().note.count({ where: { ownerId: actor.actorId } })

  const row = await getPrisma().note.create({
    data: {
      ownerId: actor.actorId,
      title: input.title,
      content: input.content,
      type: input.type === "checklist" ? "CHECKLIST" : "TEXT",
      items: input.items ? (input.items as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      color: COLOR_TO_DB[input.color],
      isPinned: input.isPinned,
      isArchived: input.isArchived,
      isTrashed: input.isTrashed,
      trashedAt: input.trashedAt ? new Date(input.trashedAt) : null,
      labelIds: input.labels,
      reminder: input.reminder ?? null,
      order: count,
    },
  })

  return noteToDto(row)
}

export type ClipboardEntry = {
  id: string
  text: string
  capturedAt: number
}

export type ClipboardImageEntry = {
  id: string
  capturedAt: number
  mimeType: "image/png"
  sizeBytes: number
  sha256: string
  storageKey: string
}

export type ClipboardBlock =
  | ({ kind: "text" } & ClipboardEntry)
  | ({ kind: "image" } & Omit<ClipboardImageEntry, "storageKey">)

export async function listClipboardEntries(actor: ActorInput): Promise<ClipboardEntry[]> {
  await ensureUserRecord(actor)
  const rows = await getPrisma().note.findMany({
    where: {
      ownerId: actor.actorId,
      source: GY_CLIPBOARD_SOURCE,
      isTrashed: false,
      isArchived: false,
    },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    take: 20,
    select: { sourceId: true, content: true, capturedAt: true, createdAt: true },
  })

  return rows.flatMap((row) => {
    if (!row.sourceId) return []
    return [{
      id: row.sourceId,
      text: row.content,
      capturedAt: (row.capturedAt ?? row.createdAt).getTime(),
    }]
  })
}

export async function listClipboardBlocks(actor: ActorInput): Promise<ClipboardBlock[]> {
  await ensureUserRecord(actor)
  const rows = await getPrisma().note.findMany({
    where: {
      ownerId: actor.actorId,
      source: GY_CLIPBOARD_SOURCE,
      isTrashed: false,
      isArchived: false,
    },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    take: 20,
    select: {
      sourceId: true,
      content: true,
      capturedAt: true,
      createdAt: true,
      mediaStorageKey: true,
      mediaMimeType: true,
      mediaSize: true,
      mediaSha256: true,
    },
  })

  return rows.flatMap((row): ClipboardBlock[] => {
    if (!row.sourceId) return []
    const capturedAt = (row.capturedAt ?? row.createdAt).getTime()
    if (row.mediaStorageKey && row.mediaMimeType === "image/png" && row.mediaSize !== null && row.mediaSha256) {
      return [{
        kind: "image",
        id: row.sourceId,
        capturedAt,
        mimeType: "image/png",
        sizeBytes: row.mediaSize,
        sha256: row.mediaSha256,
      }]
    }
    return row.content ? [{ kind: "text", id: row.sourceId, text: row.content, capturedAt }] : []
  })
}

export async function createClipboardEntry(actor: ActorInput, entry: ClipboardEntry): Promise<ClipboardEntry[]> {
  await ensureUserRecord(actor)

  // Assign a lower order than every existing note.  The normal Keep view can
  // still be rearranged, while a newly copied item always reappears at its top.
  const first = await getPrisma().note.aggregate({
    where: { ownerId: actor.actorId },
    _min: { order: true },
  })

  await getPrisma().note.upsert({
    where: { ownerId_sourceId: { ownerId: actor.actorId, sourceId: entry.id } },
    update: {},
    create: {
      ownerId: actor.actorId,
      title: "",
      content: entry.text,
      type: "TEXT",
      color: "BLUE",
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      labelIds: [],
      source: GY_CLIPBOARD_SOURCE,
      sourceId: entry.id,
      capturedAt: new Date(entry.capturedAt),
      order: (first._min.order ?? 0) - 1,
    },
  })

  return listClipboardEntries(actor)
}

export async function createClipboardImageEntry(
  actor: ActorInput,
  entry: ClipboardImageEntry,
): Promise<ClipboardBlock[]> {
  await ensureUserRecord(actor)
  const first = await getPrisma().note.aggregate({
    where: { ownerId: actor.actorId },
    _min: { order: true },
  })

  await getPrisma().note.upsert({
    where: { ownerId_sourceId: { ownerId: actor.actorId, sourceId: entry.id } },
    update: {},
    create: {
      ownerId: actor.actorId,
      title: "",
      content: "",
      type: "TEXT",
      color: "BLUE",
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      labelIds: [],
      source: GY_CLIPBOARD_SOURCE,
      sourceId: entry.id,
      capturedAt: new Date(entry.capturedAt),
      mediaStorageKey: entry.storageKey,
      mediaMimeType: entry.mimeType,
      mediaSize: entry.sizeBytes,
      mediaSha256: entry.sha256,
      order: (first._min.order ?? 0) - 1,
    },
  })

  return listClipboardBlocks(actor)
}

export async function findClipboardImage(actor: ActorInput, sourceId: string) {
  await ensureUserRecord(actor)
  return getPrisma().note.findFirst({
    where: {
      ownerId: actor.actorId,
      source: GY_CLIPBOARD_SOURCE,
      sourceId,
      isTrashed: false,
      isArchived: false,
      mediaStorageKey: { not: null },
      mediaMimeType: "image/png",
    },
    select: { mediaStorageKey: true, mediaMimeType: true },
  })
}

export async function updateNote(actor: ActorInput, id: string, input: Note): Promise<Note | null> {
  const existing = await getPrisma().note.findFirst({ where: { id, ownerId: actor.actorId } })
  if (!existing) return null

  const row = await getPrisma().note.update({
    where: { id },
    data: {
      title: input.title,
      content: input.content,
      type: input.type === "checklist" ? "CHECKLIST" : "TEXT",
      items: input.items ? (input.items as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      color: COLOR_TO_DB[input.color],
      isPinned: input.isPinned,
      isArchived: input.isArchived,
      isTrashed: input.isTrashed,
      trashedAt: input.trashedAt ? new Date(input.trashedAt) : null,
      labelIds: input.labels,
      reminder: input.reminder ?? null,
    },
  })

  return noteToDto(row)
}

export async function deleteNotePermanently(actor: ActorInput, id: string): Promise<boolean> {
  const result = await getPrisma().note.deleteMany({ where: { id, ownerId: actor.actorId } })
  return result.count > 0
}

export async function emptyTrash(actor: ActorInput): Promise<void> {
  await getPrisma().note.deleteMany({ where: { ownerId: actor.actorId, isTrashed: true } })
}

export async function reorderNotes(actor: ActorInput, orderedIds: string[]): Promise<void> {
  await getPrisma().$transaction(
    orderedIds.map((id, index) =>
      getPrisma().note.updateMany({
        where: { id, ownerId: actor.actorId },
        data: { order: index },
      }),
    ),
  )
}

export async function createLabel(actor: ActorInput, name: string): Promise<Label | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const existing = await getPrisma().noteLabel.findFirst({
    where: { ownerId: actor.actorId, name: { equals: trimmed, mode: "insensitive" } },
  })
  if (existing) return labelToDto(existing)

  const row = await getPrisma().noteLabel.create({
    data: { ownerId: actor.actorId, name: trimmed },
  })
  return labelToDto(row)
}

export async function renameLabel(actor: ActorInput, id: string, name: string): Promise<Label | null> {
  const result = await getPrisma().noteLabel.updateMany({
    where: { id, ownerId: actor.actorId },
    data: { name },
  })
  if (result.count === 0) return null
  return { id, name }
}

export async function deleteLabel(actor: ActorInput, id: string): Promise<void> {
  await getPrisma().$transaction([
    getPrisma().noteLabel.deleteMany({ where: { id, ownerId: actor.actorId } }),
    getPrisma().$executeRaw`UPDATE "Note" SET "labelIds" = array_remove("labelIds", ${id}) WHERE "ownerId" = ${actor.actorId} AND ${id} = ANY("labelIds")`,
  ])
}

export async function importData(
  actor: ActorInput,
  payload: { notes?: Note[]; labels?: Label[] },
): Promise<{ notes: Note[]; labels: Label[] }> {
  await ensureUserRecord(actor)

  if (Array.isArray(payload.labels)) {
    for (const label of payload.labels) {
      if (!label?.name) continue
      await getPrisma().noteLabel.upsert({
        where: { ownerId_name: { ownerId: actor.actorId, name: label.name } },
        update: {},
        create: { ownerId: actor.actorId, name: label.name },
      })
    }
  }

  if (Array.isArray(payload.notes)) {
    let order = await getPrisma().note.count({ where: { ownerId: actor.actorId } })
    for (const note of payload.notes) {
      if (!note) continue
      await getPrisma().note.create({
        data: {
          ownerId: actor.actorId,
          title: note.title ?? "",
          content: note.content ?? "",
          type: note.type === "checklist" ? "CHECKLIST" : "TEXT",
          items: note.items ? (note.items as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          color: COLOR_TO_DB[note.color ?? "default"],
          isPinned: Boolean(note.isPinned),
          isArchived: Boolean(note.isArchived),
          isTrashed: Boolean(note.isTrashed),
          trashedAt: note.trashedAt ? new Date(note.trashedAt) : null,
          labelIds: Array.isArray(note.labels) ? note.labels : [],
          reminder: note.reminder ?? null,
          order: order++,
        },
      })
    }
  }

  return listNotesAndLabels(actor)
}
