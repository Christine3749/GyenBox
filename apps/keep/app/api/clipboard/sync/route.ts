import { fail, ok } from "@/lib/api-response"
import { readClipboardOrigin } from "@/lib/clipboard-device-request"
import {
  commitClipboardText,
  isClipboardWriteAllowed,
  listClipboardChanges,
  listClipboardSnapshot,
} from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"
import { wireChanges, wireChangesV4, wireSnapshot, wireSnapshotV4 } from "@/lib/clipboard-wire"

export const runtime = "nodejs"

const MAX_UTF8_BYTES = 1024 * 1024
const SOURCE_ID = /^[A-Za-z0-9_-]{8,128}$/
const CURSOR = /^(?:0|[1-9][0-9]{0,19})$/
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

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
  const url = new URL(request.url)
  const v4 = url.searchParams.get("format") === "wire-v4"
  if (url.searchParams.get("snapshot") === "1") {
    try {
      const snapshot = await listClipboardSnapshot(actor)
      return ok({ cursor: snapshot.cursor, hasMore: false, payload: v4 ? wireSnapshotV4(snapshot.entries) : wireSnapshot(snapshot.entries) })
    } catch (error) {
      return fail("CLIPBOARD_SYNC_UNAVAILABLE", "Could not load clipboard snapshot.", 503, { message: error instanceof Error ? error.message : "Unknown error" })
    }
  }
  const raw = url.searchParams.get("cursor")
  if (!raw || !CURSOR.test(raw)) return fail("INVALID_CURSOR", "Expected an unsigned decimal cursor.", 400)
  try {
    const page = await listClipboardChanges(actor, BigInt(raw))
    return ok({ cursor: page.cursor, hasMore: page.hasMore, payload: v4 ? wireChangesV4(page.events) : wireChanges(page.events) })
  } catch (error) {
    return fail("CLIPBOARD_SYNC_UNAVAILABLE", "Could not load clipboard changes.", 503, { message: error instanceof Error ? error.message : "Unknown error" })
  }
}

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response
  const body = await request.json().catch(() => null)
  if (!body || typeof body.id !== "string" || !Number.isSafeInteger(body.capturedAt)) return fail("INVALID_BODY", "Expected { id, text, capturedAt }.", 400)
  const text = readText(body)
  if (!text || !SOURCE_ID.test(body.id) || new TextEncoder().encode(text).byteLength > MAX_UTF8_BYTES) return fail("INVALID_CLIPBOARD_ENTRY", "Clipboard entry is invalid or too large.", 400)
  if (!await isClipboardWriteAllowed(actor, body.id)) return fail("CLIPBOARD_RATE_LIMITED", "Too many clipboard writes. Retry in one minute.", 429)
  const capturedAt = Number(body.capturedAt)
  if (capturedAt < 946684800000 || capturedAt > Date.now() + 24 * 60 * 60 * 1000) return fail("INVALID_CAPTURE_TIME", "Clipboard capture time is invalid.", 400)
  const device = readClipboardOrigin(request)
  if ("error" in device) return fail("INVALID_DEVICE", device.error, 400)
  try {
    const ack = await commitClipboardText(actor, { id: body.id, text, capturedAt }, device.origin)
    return ok({ ack, cursor: ack.sequence }, 201)
  } catch (error) {
    return fail("CLIPBOARD_COMMIT_FAILED", "Could not commit clipboard record.", 503, { message: error instanceof Error ? error.message : "Unknown error" })
  }
}
