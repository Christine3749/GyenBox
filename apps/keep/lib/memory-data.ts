import { Prisma } from "@gyenbox/db"
import { ensureUserRecord } from "./notes-data"
import { getPrisma } from "./prisma"
import type {
  MemoryCard,
  MemoryCardKind,
  MemoryCardPrivacy,
  MemoryCardSource,
} from "@/types"

type ActorInput = {
  actorId: string
  email: string | null
  name: string | null
  avatarUrl: string | null
}

export type MemoryCardInput = {
  clientId?: string
  kind: MemoryCardKind
  surface: string
  pinyin?: string
  meaning?: string
  origin?: string
  relatedWords?: string[]
  examples?: string[]
  mnemonic?: string
  source?: MemoryCardSource
  confidence?: number
  approved?: boolean
  privacy?: MemoryCardPrivacy
  nextReviewAt?: number | null
}

export type MemoryCardPatch = Partial<MemoryCardInput>

function cardToDto(row: {
  id: string
  clientId: string | null
  kind: string
  surface: string
  pinyin: string
  meaning: string | null
  origin: string | null
  relatedWords: string[]
  examples: string[]
  mnemonic: string | null
  source: string
  confidence: number | null
  approved: boolean
  privacy: string
  nextReviewAt: Date | null
  createdAt: Date
  updatedAt: Date
}): MemoryCard {
  return {
    id: row.id,
    clientId: row.clientId ?? undefined,
    kind: row.kind as MemoryCardKind,
    surface: row.surface,
    pinyin: row.pinyin,
    meaning: row.meaning ?? undefined,
    origin: row.origin ?? undefined,
    relatedWords: row.relatedWords,
    examples: row.examples,
    mnemonic: row.mnemonic ?? undefined,
    source: row.source as MemoryCardSource,
    confidence: row.confidence ?? undefined,
    approved: row.approved,
    privacy: row.privacy as MemoryCardPrivacy,
    nextReviewAt: row.nextReviewAt?.getTime(),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}

function dataForInput(input: MemoryCardInput | MemoryCardPatch): Prisma.MemoryCardUpdateInput {
  const data: Prisma.MemoryCardUpdateInput = {}
  if (input.clientId !== undefined) data.clientId = input.clientId || null
  if (input.kind !== undefined) data.kind = input.kind
  if (input.surface !== undefined) data.surface = input.surface
  if (input.pinyin !== undefined) data.pinyin = input.pinyin ?? ""
  if (input.meaning !== undefined) data.meaning = input.meaning || null
  if (input.origin !== undefined) data.origin = input.origin || null
  if (input.relatedWords !== undefined) data.relatedWords = input.relatedWords
  if (input.examples !== undefined) data.examples = input.examples
  if (input.mnemonic !== undefined) data.mnemonic = input.mnemonic || null
  if (input.source !== undefined) data.source = input.source
  if (input.confidence !== undefined) data.confidence = input.confidence ?? null
  if (input.approved !== undefined) data.approved = input.approved
  if (input.privacy !== undefined) data.privacy = input.privacy
  if (input.nextReviewAt !== undefined) {
    data.nextReviewAt = input.nextReviewAt === null ? null : new Date(input.nextReviewAt)
  }
  return data
}

export async function listMemoryCards(actor: ActorInput, limit = 100, kind?: MemoryCardKind) {
  await ensureUserRecord(actor)
  const rows = await getPrisma().memoryCard.findMany({
    where: {
      ownerId: actor.actorId,
      ...(kind ? { kind } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 200),
  })
  return rows.map(cardToDto)
}

export async function createMemoryCard(actor: ActorInput, input: MemoryCardInput) {
  await ensureUserRecord(actor)
  if (input.clientId) {
    const existing = await getPrisma().memoryCard.findUnique({
      where: { ownerId_clientId: { ownerId: actor.actorId, clientId: input.clientId } },
    })
    if (existing) return updateMemoryCard(actor, existing.id, input)
  }
  const row = await getPrisma().memoryCard.create({
    data: {
      ownerId: actor.actorId,
      clientId: input.clientId ?? null,
      kind: input.kind,
      surface: input.surface,
      pinyin: input.pinyin ?? "",
      meaning: input.meaning ?? null,
      origin: input.origin ?? null,
      relatedWords: input.relatedWords ?? [],
      examples: input.examples ?? [],
      mnemonic: input.mnemonic ?? null,
      source: input.source ?? "user",
      confidence: input.confidence ?? null,
      approved: input.approved ?? false,
      privacy: input.privacy ?? "account",
      nextReviewAt: input.nextReviewAt === undefined || input.nextReviewAt === null ? null : new Date(input.nextReviewAt),
    },
  })
  return cardToDto(row)
}

export async function updateMemoryCard(actor: ActorInput, id: string, input: MemoryCardPatch) {
  const current = await getPrisma().memoryCard.findFirst({ where: { id, ownerId: actor.actorId } })
  if (!current) return null
  const row = await getPrisma().memoryCard.update({
    where: { id: current.id },
    data: dataForInput(input),
  })
  return cardToDto(row)
}

export async function deleteMemoryCard(actor: ActorInput, id: string) {
  const current = await getPrisma().memoryCard.findFirst({ where: { id, ownerId: actor.actorId } })
  if (!current) return false
  await getPrisma().memoryCard.delete({ where: { id: current.id } })
  return true
}
