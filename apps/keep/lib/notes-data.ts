import {
  ClipboardDeviceColor as DbClipboardDeviceColor,
  Prisma,
  NoteType as DbNoteType,
  NoteColor as DbNoteColor,
} from "@gyenbox/db"
import { createHash } from "node:crypto"
import { getPrisma } from "./prisma"
import type { SupabaseActor } from "./supabase-server"
import type { ChecklistItem, Label, Note, NoteColor, NoteSource } from "@/types"

type ActorInput = Pick<SupabaseActor, "actorId" | "email" | "name" | "avatarUrl">
type NoteInput = Omit<Note, "id" | "createdAt" | "updatedAt" | "order" | "source" | "sourceId" | "capturedAt">

export const GY_CLIPBOARD_SOURCE = "gy-clipboard"
export const CLIPBOARD_DEVICE_ID = /^[A-Za-z0-9_-]{8,128}$/
export const CLIPBOARD_DEVICE_NAME_MAX_LENGTH = 64

export const CLIPBOARD_DEVICE_COLORS = ["blue", "coral", "mint", "amber", "violet", "silver"] as const
export type ClipboardDeviceColor = (typeof CLIPBOARD_DEVICE_COLORS)[number]

export type ClipboardOrigin = {
  deviceId: string
  displayName?: string
}

export type ClipboardDevice = {
  id: string
  name: string
  color: ClipboardDeviceColor
  lastSeenAt: number
}

const DEVICE_COLOR_TO_DB: Record<ClipboardDeviceColor, DbClipboardDeviceColor> = {
  blue: "BLUE",
  coral: "CORAL",
  mint: "MINT",
  amber: "AMBER",
  violet: "VIOLET",
  silver: "SILVER",
}

const DEVICE_COLOR_FROM_DB: Record<DbClipboardDeviceColor, ClipboardDeviceColor> = {
  BLUE: "blue",
  CORAL: "coral",
  MINT: "mint",
  AMBER: "amber",
  VIOLET: "violet",
  SILVER: "silver",
}

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

// Note reads only need the User row to satisfy ownership and foreign-key
// constraints. Re-upserting profile fields before every read adds a write
// round trip to the first-screen path. Keep a small per-instance confirmation
// cache: a new instance or an expired entry still performs the authoritative
// upsert, while a warm instance can read notes immediately.
const USER_RECORD_CACHE_TTL_MS = 5 * 60_000
const USER_RECORD_CACHE_MAX_ENTRIES = 1_000
const confirmedUserRecords = new Map<string, number>()

function rememberUserRecord(actorId: string, now = Date.now()) {
  if (confirmedUserRecords.size >= USER_RECORD_CACHE_MAX_ENTRIES) {
    for (const [id, expiresAt] of confirmedUserRecords) {
      if (expiresAt <= now || confirmedUserRecords.size >= USER_RECORD_CACHE_MAX_ENTRIES) {
        confirmedUserRecords.delete(id)
      }
    }
  }
  confirmedUserRecords.set(actorId, now + USER_RECORD_CACHE_TTL_MS)
}

export async function ensureUserRecord(actor: ActorInput) {
  const now = Date.now()
  if ((confirmedUserRecords.get(actor.actorId) ?? 0) > now) return

  const email = actor.email ?? `${actor.actorId}@users.gyenbox.local`
  const user = await getPrisma().user.upsert({
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
  rememberUserRecord(actor.actorId, now)
  return user
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
  clipboardSequence: bigint | null
  clipboardOriginDeviceId: string | null
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
    syncSequence: row.clipboardSequence?.toString(),
    originDeviceId: row.clipboardOriginDeviceId ?? undefined,
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

export async function listLabels(actor: ActorInput): Promise<Label[]> {
  await ensureUserRecord(actor)
  const labels = await getPrisma().noteLabel.findMany({
    where: { ownerId: actor.actorId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  return labels.map(labelToDto)
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

export type ClipboardAck = {
  id: string
  sequence: string
}

export type ClipboardSequencedBlock = ClipboardBlock & {
  sequence: string
  originDeviceId?: string
}

export type NotesPage = {
  notes: Note[]
  labels: Label[]
  nextOffset: number | null
}

export async function listNotesPage(actor: ActorInput, offset: number, limit: number): Promise<NotesPage> {
  await ensureUserRecord(actor)

  const [rows, labels] = await Promise.all([
    getPrisma().note.findMany({
      where: { ownerId: actor.actorId },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      skip: offset,
      // One look-ahead row replaces a full-library COUNT query on every page.
      // This is especially important while a large note library hydrates over
      // a cross-region database connection.
      take: limit + 1,
    }),
    offset === 0
      ? getPrisma().noteLabel.findMany({
          where: { ownerId: actor.actorId },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        })
      : Promise.resolve([]),
  ])

  const hasMore = rows.length > limit
  const notes = rows.slice(0, limit)
  const nextOffset = hasMore ? offset + notes.length : null
  return { notes: notes.map(noteToDto), labels: labels.map(labelToDto), nextOffset }
}

function makeNotesSyncEtag(input: {
  notes: Array<{ id: string; updatedAt: Date | number }>
  labels: Array<{ id: string; name: string }>
}) {
  const fingerprint = JSON.stringify({
    notes: input.notes
      .map((note) => [note.id, note.updatedAt instanceof Date ? note.updatedAt.getTime() : note.updatedAt])
      .sort(([left], [right]) => String(left).localeCompare(String(right))),
    labels: input.labels
      .map((label) => [label.id, label.name])
      .sort(([left], [right]) => String(left).localeCompare(String(right))),
  })
  return `"keep-notes-${createHash("sha256").update(fingerprint).digest("base64url")}"`
}

// The tag contains no note content. It lets authenticated clients prove that
// their local library is current without downloading the entire note payload.
export async function getNotesSyncEtag(actor: ActorInput) {
  await ensureUserRecord(actor)

  const [notes, labels] = await Promise.all([
    getPrisma().note.findMany({
      where: { ownerId: actor.actorId },
      select: { id: true, updatedAt: true },
    }),
    getPrisma().noteLabel.findMany({
      where: { ownerId: actor.actorId },
      select: { id: true, name: true },
    }),
  ])

  return makeNotesSyncEtag({ notes, labels })
}

export function getNotesPayloadEtag(payload: { notes: Note[]; labels: Label[] }) {
  return makeNotesSyncEtag(payload)
}

export type ClipboardSyncEvent =
  | { kind: "ADD"; entry: ClipboardSequencedBlock }
  | { kind: "DELETE"; id: string; sequence: string; originDeviceId?: string }

export type ClipboardSyncPage = {
  events: ClipboardSyncEvent[]
  cursor: string
  hasMore: boolean
}

export type ClipboardSnapshot = {
  entries: ClipboardSequencedBlock[]
  cursor: string
}

const CLIPBOARD_HEAD_LIMIT = 20
const CLIPBOARD_CHANGE_PAGE_SIZE = 64
const CLIPBOARD_WRITE_LIMIT_PER_MINUTE = 120
const CLIPBOARD_ADD = "ADD"
const CLIPBOARD_DELETE = "DELETE"

type ClipboardBlockRow = {
  sourceId: string | null
  content: string
  capturedAt: Date | null
  createdAt: Date
  mediaStorageKey: string | null
  mediaMimeType: string | null
  mediaSize: number | null
  mediaSha256: string | null
  clipboardSequence: bigint | null
  clipboardOriginDeviceId: string | null
}

function clipboardRowToBlock(
  row: ClipboardBlockRow,
  sequence = row.clipboardSequence,
  originDeviceId = row.clipboardOriginDeviceId,
): ClipboardSequencedBlock | null {
  if (!row.sourceId || sequence === null) return null
  const base = {
    id: row.sourceId,
    capturedAt: (row.capturedAt ?? row.createdAt).getTime(),
    sequence: sequence.toString(),
    ...(originDeviceId ? { originDeviceId } : {}),
  }
  if (row.mediaStorageKey && row.mediaMimeType === "image/png" && row.mediaSize !== null && row.mediaSha256) {
    return { kind: "image", ...base, mimeType: "image/png", sizeBytes: row.mediaSize, sha256: row.mediaSha256 }
  }
  return row.content ? { kind: "text", ...base, text: row.content } : null
}

export async function listClipboardEntries(actor: ActorInput): Promise<ClipboardEntry[]> {
  await ensureUserRecord(actor)
  const rows = await getPrisma().note.findMany({
    where: {
      ownerId: actor.actorId,
      source: GY_CLIPBOARD_SOURCE,
      isTrashed: false,
      isArchived: false,
      mediaStorageKey: null,
      clipboardSequence: { not: null },
    },
    orderBy: { clipboardSequence: "desc" },
    take: CLIPBOARD_HEAD_LIMIT,
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
      clipboardSequence: { not: null },
    },
    orderBy: { clipboardSequence: "desc" },
    take: CLIPBOARD_HEAD_LIMIT,
    select: {
      sourceId: true,
      content: true,
      capturedAt: true,
      createdAt: true,
      mediaStorageKey: true,
      mediaMimeType: true,
      mediaSize: true,
      mediaSha256: true,
      clipboardSequence: true,
      clipboardOriginDeviceId: true,
    },
  })

  return rows.flatMap((row): ClipboardBlock[] => {
    const block = clipboardRowToBlock(row)
    if (!block) return []
    const { sequence: _sequence, ...legacyBlock } = block
    return [legacyBlock]
  })
}

function deviceToDto(row: {
  deviceId: string
  displayName: string
  color: DbClipboardDeviceColor
  lastSeenAt: Date
}): ClipboardDevice {
  return {
    id: row.deviceId,
    name: row.displayName,
    color: DEVICE_COLOR_FROM_DB[row.color],
    lastSeenAt: row.lastSeenAt.getTime(),
  }
}

function initialDeviceColor(existing: DbClipboardDeviceColor[]): ClipboardDeviceColor {
  const used = new Set(existing.map((color) => DEVICE_COLOR_FROM_DB[color]))
  return CLIPBOARD_DEVICE_COLORS.find((color) => !used.has(color)) ?? "blue"
}

export async function registerClipboardDevice(
  actor: ActorInput,
  input: { id: string; name?: string; color?: ClipboardDeviceColor },
): Promise<ClipboardDevice> {
  await ensureUserRecord(actor)
  if (!CLIPBOARD_DEVICE_ID.test(input.id)) throw new Error("Invalid clipboard device ID")
  const name = input.name?.trim()
  if (name !== undefined && (name.length === 0 || name.length > CLIPBOARD_DEVICE_NAME_MAX_LENGTH)) {
    throw new Error("Invalid clipboard device name")
  }

  const now = new Date()
  return getPrisma().$transaction(async (tx) => {
    // Native upsert makes simultaneous first commits from one new device
    // idempotent. The previous find-then-create could lose a unique-key race
    // and make a healthy client retry an otherwise valid clipboard write.
    const colors = await tx.clipboardDevice.findMany({
      where: { ownerId: actor.actorId },
      select: { color: true },
    })
    const color = input.color ?? initialDeviceColor(colors.map((device) => device.color))
    const row = await tx.clipboardDevice.upsert({
      where: { ownerId_deviceId: { ownerId: actor.actorId, deviceId: input.id } },
      create: {
        ownerId: actor.actorId,
        deviceId: input.id,
        displayName: name ?? "GY device",
        color: DEVICE_COLOR_TO_DB[color],
        lastSeenAt: now,
      },
      update: {
        ...(name ? { displayName: name } : {}),
        ...(input.color ? { color: DEVICE_COLOR_TO_DB[input.color] } : {}),
        lastSeenAt: now,
      },
    })
    return deviceToDto(row)
  })
}

// Clipboard commits arrive much more often than explicit device settings.
// Existing devices only need a small last-seen update; a new device falls back
// to the fully validated, colour-assigning registration path above.
async function touchClipboardDevice(actor: ActorInput, origin: ClipboardOrigin) {
  const name = origin.displayName?.trim()
  const updated = await getPrisma().clipboardDevice.updateMany({
    where: { ownerId: actor.actorId, deviceId: origin.deviceId },
    data: {
      ...(name ? { displayName: name } : {}),
      lastSeenAt: new Date(),
    },
  })
  if (updated.count === 0) {
    await registerClipboardDevice(actor, { id: origin.deviceId, name })
  }
}

export async function listClipboardDevices(actor: ActorInput): Promise<ClipboardDevice[]> {
  await ensureUserRecord(actor)
  const rows = await getPrisma().clipboardDevice.findMany({
    where: { ownerId: actor.actorId },
    orderBy: [{ lastSeenAt: "desc" }, { deviceId: "asc" }],
  })
  return rows.map(deviceToDto)
}

export async function listClipboardSnapshot(actor: ActorInput): Promise<ClipboardSnapshot> {
  await ensureUserRecord(actor)
  const [stream, rows] = await Promise.all([
    getPrisma().clipboardStream.findUnique({ where: { ownerId: actor.actorId }, select: { nextSequence: true } }),
    getPrisma().note.findMany({
      where: {
        ownerId: actor.actorId,
        source: GY_CLIPBOARD_SOURCE,
        isTrashed: false,
        isArchived: false,
        clipboardSequence: { not: null },
      },
      orderBy: { clipboardSequence: "desc" },
      take: CLIPBOARD_HEAD_LIMIT,
      select: {
        sourceId: true,
        content: true,
        capturedAt: true,
        createdAt: true,
        mediaStorageKey: true,
        mediaMimeType: true,
        mediaSize: true,
        mediaSha256: true,
        clipboardSequence: true,
        clipboardOriginDeviceId: true,
      },
    }),
  ])
  return {
    entries: rows.flatMap((row) => {
      const block = clipboardRowToBlock(row)
      return block ? [block] : []
    }),
    cursor: stream?.nextSequence.toString() ?? "0",
  }
}

async function listClipboardChangesCore(actor: ActorInput, cursor: bigint): Promise<ClipboardSyncPage> {
  const rows = await getPrisma().clipboardEvent.findMany({
    where: { ownerId: actor.actorId, sequence: { gt: cursor } },
    orderBy: { sequence: "asc" },
    take: CLIPBOARD_CHANGE_PAGE_SIZE + 1,
    select: { sequence: true, kind: true, sourceId: true, originDeviceId: true },
  })
  const hasMore = rows.length > CLIPBOARD_CHANGE_PAGE_SIZE
  const page = rows.slice(0, CLIPBOARD_CHANGE_PAGE_SIZE)
  const addSourceIds = page.filter((row) => row.kind === CLIPBOARD_ADD).map((row) => row.sourceId)
  const notes = addSourceIds.length === 0 ? [] : await getPrisma().note.findMany({
    where: {
      ownerId: actor.actorId,
      source: GY_CLIPBOARD_SOURCE,
      sourceId: { in: addSourceIds },
      isTrashed: false,
      isArchived: false,
    },
    select: {
      sourceId: true,
      content: true,
      capturedAt: true,
      createdAt: true,
      mediaStorageKey: true,
      mediaMimeType: true,
      mediaSize: true,
      mediaSha256: true,
      clipboardSequence: true,
      clipboardOriginDeviceId: true,
    },
  })
  const noteBySourceId = new Map(notes.flatMap((note) => note.sourceId ? [[note.sourceId, note] as const] : []))
  const events = page.flatMap((row): ClipboardSyncEvent[] => {
    if (row.kind === CLIPBOARD_DELETE) {
      return [{
        kind: "DELETE",
        id: row.sourceId,
        sequence: row.sequence.toString(),
        ...(row.originDeviceId ? { originDeviceId: row.originDeviceId } : {}),
      }]
    }
    if (row.kind !== CLIPBOARD_ADD) return []
    const note = noteBySourceId.get(row.sourceId)
    const entry = note ? clipboardRowToBlock(note, row.sequence, row.originDeviceId) : null
    return entry ? [{ kind: "ADD", entry }] : []
  })
  return { events, cursor: page.at(-1)?.sequence.toString() ?? cursor.toString(), hasMore }
}

// Most callers issue a single cursor request, so they retain the defensive
// user-record check. The SSE route validates once when its connection opens
// and uses the known-user variant during its short polling loop; otherwise a
// read-only wait would repeatedly turn into a user upsert every 750 ms.
export async function listClipboardChanges(actor: ActorInput, cursor: bigint): Promise<ClipboardSyncPage> {
  await ensureUserRecord(actor)
  return listClipboardChangesCore(actor, cursor)
}

export async function listClipboardChangesForKnownUser(actor: ActorInput, cursor: bigint): Promise<ClipboardSyncPage> {
  return listClipboardChangesCore(actor, cursor)
}

function clipboardDedupeKey(sourceId: string) {
  return `add:${sourceId}`
}

async function existingClipboardAck(actor: ActorInput, sourceId: string): Promise<ClipboardAck | null> {
  const event = await getPrisma().clipboardEvent.findUnique({
    where: { ownerId_dedupeKey: { ownerId: actor.actorId, dedupeKey: clipboardDedupeKey(sourceId) } },
    select: { sourceId: true, sequence: true },
  })
  return event ? { id: event.sourceId, sequence: event.sequence.toString() } : null
}

async function appendClipboardEvent(
  tx: Prisma.TransactionClient,
  actor: ActorInput,
  input: {
    kind: typeof CLIPBOARD_ADD | typeof CLIPBOARD_DELETE
    sourceId: string
    noteId?: string
    dedupeKey?: string
    originDeviceId?: string
  },
): Promise<ClipboardAck> {
  const stream = await tx.clipboardStream.upsert({
    where: { ownerId: actor.actorId },
    create: { ownerId: actor.actorId, nextSequence: 1 },
    update: { nextSequence: { increment: 1 } },
    select: { nextSequence: true },
  })
  await tx.clipboardEvent.create({
    data: {
      ownerId: actor.actorId,
      sequence: stream.nextSequence,
      kind: input.kind,
      sourceId: input.sourceId,
      noteId: input.noteId ?? null,
      dedupeKey: input.dedupeKey ?? null,
      originDeviceId: input.originDeviceId ?? null,
    },
  })
  if (input.kind === CLIPBOARD_ADD && input.noteId) {
    await tx.note.update({ where: { id: input.noteId }, data: { clipboardSequence: stream.nextSequence } })
  }
  return { id: input.sourceId, sequence: stream.nextSequence.toString() }
}

async function commitClipboardAdd(
  actor: ActorInput,
  sourceId: string,
  origin: ClipboardOrigin | undefined,
  createNote: (tx: Prisma.TransactionClient, order: number) => Promise<{ id: string }>,
): Promise<ClipboardAck> {
  await ensureUserRecord(actor)
  if (origin) await touchClipboardDevice(actor, origin)
  const prior = await existingClipboardAck(actor, sourceId)
  if (prior) return prior
  try {
    return await getPrisma().$transaction(async (tx) => {
      const duplicate = await tx.clipboardEvent.findUnique({
        where: { ownerId_dedupeKey: { ownerId: actor.actorId, dedupeKey: clipboardDedupeKey(sourceId) } },
        select: { sourceId: true, sequence: true },
      })
      if (duplicate) return { id: duplicate.sourceId, sequence: duplicate.sequence.toString() }
      const first = await tx.note.aggregate({ where: { ownerId: actor.actorId }, _min: { order: true } })
      const note = await createNote(tx, (first._min.order ?? 0) - 1)
      return appendClipboardEvent(tx, actor, {
        kind: CLIPBOARD_ADD,
        sourceId,
        noteId: note.id,
        dedupeKey: clipboardDedupeKey(sourceId),
        originDeviceId: origin?.deviceId,
      })
    })
  } catch (error) {
    // Concurrent retries may race at the unique dedupe key. The successful
    // transaction is the authority; return its immutable ACK instead of
    // making the caller retry and risk a duplicate visual state.
    const acknowledged = await existingClipboardAck(actor, sourceId)
    if (acknowledged) return acknowledged
    throw error
  }
}

export async function isClipboardWriteAllowed(actor: ActorInput, sourceId: string): Promise<boolean> {
  await ensureUserRecord(actor)
  if (await existingClipboardAck(actor, sourceId)) return true
  const since = new Date(Date.now() - 60_000)
  const count = await getPrisma().clipboardEvent.count({
    where: { ownerId: actor.actorId, kind: CLIPBOARD_ADD, createdAt: { gte: since } },
  })
  return count < CLIPBOARD_WRITE_LIMIT_PER_MINUTE
}

export async function commitClipboardText(
  actor: ActorInput,
  entry: ClipboardEntry,
  origin?: ClipboardOrigin,
): Promise<ClipboardAck> {
  return commitClipboardAdd(actor, entry.id, origin, (tx, order) => tx.note.upsert({
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
      order,
      clipboardOriginDeviceId: origin?.deviceId ?? null,
    },
    select: { id: true },
  }))
}

export async function commitClipboardImage(
  actor: ActorInput,
  entry: ClipboardImageEntry,
  origin?: ClipboardOrigin,
): Promise<ClipboardAck> {
  return commitClipboardAdd(actor, entry.id, origin, (tx, order) => tx.note.upsert({
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
      order,
      clipboardOriginDeviceId: origin?.deviceId ?? null,
    },
    select: { id: true },
  }))
}

// Legacy v1/v2 endpoints deliberately retain their response shapes. They now
// still create a v3 ADD event, so an old client and a cursor client can safely
// coexist on the same account.
export async function createClipboardEntry(
  actor: ActorInput,
  entry: ClipboardEntry,
  origin?: ClipboardOrigin,
): Promise<ClipboardEntry[]> {
  await commitClipboardText(actor, entry, origin)
  return listClipboardEntries(actor)
}

export async function createClipboardImageEntry(
  actor: ActorInput,
  entry: ClipboardImageEntry,
  origin?: ClipboardOrigin,
): Promise<ClipboardBlock[]> {
  await commitClipboardImage(actor, entry, origin)
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

export async function findClipboardImageForCommit(actor: ActorInput, sourceId: string) {
  await ensureUserRecord(actor)
  return getPrisma().note.findFirst({
    where: { ownerId: actor.actorId, source: GY_CLIPBOARD_SOURCE, sourceId, mediaMimeType: "image/png" },
    select: { mediaStorageKey: true, mediaMimeType: true, mediaSize: true, mediaSha256: true, capturedAt: true },
  })
}

export class NoteConflictError extends Error {
  constructor(readonly current: Note) {
    super("This note changed on another device. The latest version has been restored.")
    this.name = "NoteConflictError"
  }
}

export async function updateNote(
  actor: ActorInput,
  id: string,
  input: Note,
  expectedUpdatedAt?: number,
): Promise<Note | null> {
  const existing = await getPrisma().note.findFirst({ where: { id, ownerId: actor.actorId } })
  if (!existing) return null

  const managesClipboard = existing.source === GY_CLIPBOARD_SOURCE && Boolean(existing.sourceId)
  const wasVisible = !existing.isTrashed && !existing.isArchived
  const willBeVisible = !input.isTrashed && !input.isArchived
  const expectedUpdatedAtDate = Number.isSafeInteger(expectedUpdatedAt)
    ? new Date(expectedUpdatedAt as number)
    : undefined

  const row = await getPrisma().$transaction(async (tx) => {
    // A copied block is immutable content. Keep may still change its colour,
    // pin/archive/trash state, but editing it in the web UI must not mutate a
    // payload that other devices treat as one canonical clipboard event.
    const write = await tx.note.updateMany({
      where: {
        id,
        ownerId: actor.actorId,
        ...(expectedUpdatedAtDate ? { updatedAt: expectedUpdatedAtDate } : {}),
      },
      data: {
        title: managesClipboard ? existing.title : input.title,
        content: managesClipboard ? existing.content : input.content,
        type: managesClipboard ? existing.type : input.type === "checklist" ? "CHECKLIST" : "TEXT",
        items: managesClipboard
          ? existing.items === null ? Prisma.JsonNull : existing.items as Prisma.InputJsonValue
          : input.items ? (input.items as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        color: COLOR_TO_DB[input.color],
        isPinned: input.isPinned,
        isArchived: input.isArchived,
        isTrashed: input.isTrashed,
        trashedAt: input.trashedAt ? new Date(input.trashedAt) : null,
        labelIds: input.labels,
        reminder: input.reminder ?? null,
      },
    })
    if (write.count === 0) {
      const latest = await tx.note.findFirst({ where: { id, ownerId: actor.actorId } })
      if (!latest) return null
      throw new NoteConflictError(noteToDto(latest))
    }
    const updated = await tx.note.findUniqueOrThrow({ where: { id } })
    if (!managesClipboard || !existing.sourceId || wasVisible === willBeVisible) return updated
    const acknowledgement = await appendClipboardEvent(tx, actor, {
      kind: willBeVisible ? CLIPBOARD_ADD : CLIPBOARD_DELETE,
      sourceId: existing.sourceId,
      noteId: updated.id,
    })
    return willBeVisible
      ? { ...updated, clipboardSequence: BigInt(acknowledgement.sequence) }
      : updated
  })

  return row ? noteToDto(row) : null
}

export async function deleteNotePermanently(actor: ActorInput, id: string): Promise<boolean> {
  const existing = await getPrisma().note.findFirst({ where: { id, ownerId: actor.actorId } })
  if (!existing) return false
  if (existing.source === GY_CLIPBOARD_SOURCE) {
    // Clipboard blocks keep their soft-delete tombstone indefinitely. Purging
    // the Note would remove the only evidence a lagging device needs to drop
    // the block from its local HEAD(20) projection.
    const dto = noteToDto(existing)
    await updateNote(actor, id, {
      ...dto,
      isPinned: false,
      isTrashed: true,
      trashedAt: dto.trashedAt ?? Date.now(),
    })
    return true
  }
  const result = await getPrisma().note.deleteMany({ where: { id, ownerId: actor.actorId } })
  return result.count > 0
}

export async function emptyTrash(actor: ActorInput): Promise<void> {
  // GY clipboard rows are retained as tombstones. The visible Keep UI can
  // still remove ordinary notes permanently without breaking native clients.
  await getPrisma().note.deleteMany({
    where: { ownerId: actor.actorId, isTrashed: true, source: { not: GY_CLIPBOARD_SOURCE } },
  })
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
