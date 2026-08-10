import { fail, ok } from "@/lib/api-response"
import { createMemoryCard, listMemoryCards, type MemoryCardInput } from "@/lib/memory-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

const KINDS = new Set(["word_origin", "example", "related_words", "correction", "preference"])
const SOURCES = new Set(["user", "local-learning", "ai", "keep"])

function text(value: unknown, field: string, max: number, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field} is required`)
    return undefined
  }
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    throw new Error(`${field} is invalid`)
  }
  return value.trim()
}

function strings(value: unknown, field: string, maxItems: number, maxItemLength: number) {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== "string" || item.length > maxItemLength)) {
    throw new Error(`${field} is invalid`)
  }
  return value.map((item) => item.trim()).filter(Boolean)
}

export function parseMemoryCardInput(body: unknown): MemoryCardInput
export function parseMemoryCardInput(body: unknown, partial: true): Partial<MemoryCardInput>
export function parseMemoryCardInput(body: unknown, partial = false): MemoryCardInput | Partial<MemoryCardInput> {
  if (!body || typeof body !== "object") throw new Error("Expected a JSON object")
  const value = body as Record<string, unknown>
  const kind = value.kind
  if (!partial || kind !== undefined) {
    if (typeof kind !== "string" || !KINDS.has(kind)) throw new Error("kind is invalid")
  }
  const surface = text(value.surface, "surface", 256, !partial)
  if (!partial && !surface) throw new Error("surface is required")
  const source = value.source
  if (source !== undefined && (typeof source !== "string" || !SOURCES.has(source))) throw new Error("source is invalid")
  const privacy = value.privacy
  if (privacy !== undefined && privacy !== "account") {
    throw new Error("local-only cards must not be uploaded to Keep")
  }
  if (value.confidence !== undefined && value.confidence !== null &&
      (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1)) {
    throw new Error("confidence is invalid")
  }
  if (value.approved !== undefined && typeof value.approved !== "boolean") throw new Error("approved is invalid")
  if (value.nextReviewAt !== undefined && value.nextReviewAt !== null &&
      (!Number.isSafeInteger(value.nextReviewAt) || Number(value.nextReviewAt) < 0)) {
    throw new Error("nextReviewAt is invalid")
  }
  const clientId = value.clientId === undefined ? undefined : text(value.clientId, "clientId", 128, true)
  return {
    ...(kind !== undefined ? { kind: kind as MemoryCardInput["kind"] } : {}),
    ...(surface !== undefined ? { surface } : {}),
    ...(clientId !== undefined ? { clientId } : {}),
    pinyin: text(value.pinyin, "pinyin", 128),
    meaning: text(value.meaning, "meaning", 4000),
    origin: text(value.origin, "origin", 4000),
    relatedWords: strings(value.relatedWords, "relatedWords", 64, 256),
    examples: strings(value.examples, "examples", 32, 2000),
    mnemonic: text(value.mnemonic, "mnemonic", 2000),
    source: source as MemoryCardInput["source"],
    confidence: value.confidence === null ? undefined : value.confidence as number | undefined,
    approved: value.approved as boolean | undefined,
    privacy: "account",
    nextReviewAt: value.nextReviewAt as number | null | undefined,
  }
}

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response
  const url = new URL(request.url)
  const rawLimit = Number(url.searchParams.get("limit") ?? "100")
  const limit = Number.isSafeInteger(rawLimit) ? rawLimit : 100
  const rawKind = url.searchParams.get("kind") ?? undefined
  const kind = rawKind && KINDS.has(rawKind) ? rawKind as MemoryCardInput["kind"] : undefined
  try {
    return ok(await listMemoryCards(actor, limit, kind))
  } catch (error) {
    return fail("MEMORY_LIST_FAILED", "Could not load memory cards.", 503, { message: error instanceof Error ? error.message : "Unknown error" })
  }
}

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response
  const body = await request.json().catch(() => null)
  try {
    const input = parseMemoryCardInput(body)
    return ok(await createMemoryCard(actor, input), 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid memory card"
    if (message.includes("required") || message.includes("invalid") || message.includes("must not")) {
      return fail("INVALID_MEMORY_CARD", message, 400)
    }
    return fail("MEMORY_CREATE_FAILED", "Could not create memory card.", 503, { message })
  }
}
