import { fail, ok } from "@/lib/api-response"
import { createClipboardEntry, isClipboardWriteAllowed, listClipboardBlocks, listClipboardEntries } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

const MAX_UTF8_BYTES = 1024 * 1024
const SOURCE_ID = /^[A-Za-z0-9_-]{8,128}$/
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

function wirePayload(entries: Awaited<ReturnType<typeof listClipboardEntries>>) {
  // The native client only has a deliberately tiny JSON reader.  Base64 keeps
  // arbitrary clipboard text (quotes, tabs, newlines and emoji) out of that
  // transport grammar while the public JSON response remains available too.
  const lines = entries.map((entry) =>
    `${entry.id}\t${entry.capturedAt}\t${Buffer.from(entry.text, "utf8").toString("base64")}`,
  )
  return Buffer.from(lines.join("\n"), "utf8").toString("base64")
}

function wirePayloadV2(entries: Awaited<ReturnType<typeof listClipboardBlocks>>) {
  const lines = entries.map((entry) => {
    if (entry.kind === "image") {
      return `I\t${entry.id}\t${entry.capturedAt}\t${entry.mimeType}\t${entry.sizeBytes}\t${entry.sha256}`
    }
    return `T\t${entry.id}\t${entry.capturedAt}\t${Buffer.from(entry.text, "utf8").toString("base64")}`
  })
  return Buffer.from(lines.join("\n"), "utf8").toString("base64")
}

function readText(body: Record<string, unknown>): string | null {
  if (typeof body.text === "string") return body.text
  if (typeof body.textBase64 !== "string" || !BASE64.test(body.textBase64)) return null
  const bytes = Buffer.from(body.textBase64, "base64")
  const text = bytes.toString("utf8")
  return Buffer.from(text, "utf8").equals(bytes) ? text : null
}

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  try {
    const format = new URL(request.url).searchParams.get("format")
    if (format === "wire-v2") {
      const entries = await listClipboardBlocks(actor)
      return ok({ payload: wirePayloadV2(entries) })
    }
    const entries = await listClipboardEntries(actor)
    return ok(format === "wire" ? { payload: wirePayload(entries) } : { entries })
  } catch (error) {
    return fail("CLIPBOARD_UNAVAILABLE", "Could not load clipboard records.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body.id !== "string" || !Number.isSafeInteger(body.capturedAt)) {
    return fail("INVALID_BODY", "Expected { id, text, capturedAt }.", 400)
  }
  const text = readText(body)
  if (!text || !SOURCE_ID.test(body.id) || new TextEncoder().encode(text).byteLength > MAX_UTF8_BYTES) {
    return fail("INVALID_CLIPBOARD_ENTRY", "Clipboard entry is invalid or too large.", 400)
  }
  if (!await isClipboardWriteAllowed(actor, body.id)) {
    return fail("CLIPBOARD_RATE_LIMITED", "Too many clipboard writes. Retry in one minute.", 429)
  }
  const capturedAt = Number(body.capturedAt)
  if (capturedAt < 946684800000 || capturedAt > Date.now() + 24 * 60 * 60 * 1000) {
    return fail("INVALID_CAPTURE_TIME", "Clipboard capture time is invalid.", 400)
  }

  try {
    const entries = await createClipboardEntry(actor, { id: body.id, text, capturedAt })
    const wire = new URL(request.url).searchParams.get("format") === "wire"
    return ok(wire ? { payload: wirePayload(entries) } : { entries }, 201)
  } catch (error) {
    return fail("CLIPBOARD_CREATE_FAILED", "Could not save clipboard record.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
