import { createHash } from "node:crypto"

import { fail, ok } from "@/lib/api-response"
import { loadClipboardImage, saveClipboardImage } from "@/lib/gcs"
import { createClipboardImageEntry, findClipboardImage } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const SOURCE_ID = /^[A-Za-z0-9_-]{8,128}$/
const SHA256 = /^[a-f0-9]{64}$/

function captureTime(request: Request) {
  const raw = request.headers.get("x-gy-captured-at")
  if (!raw || !/^\d{13}$/.test(raw)) return null
  const value = Number(raw)
  return value >= 946684800000 && value <= Date.now() + 24 * 60 * 60 * 1000 ? value : null
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response
  if (!SOURCE_ID.test(params.id) || request.headers.get("content-type")?.split(";", 1)[0] !== "image/png") {
    return fail("INVALID_IMAGE", "Expected a PNG image with a valid source ID.", 400)
  }
  const capturedAt = captureTime(request)
  const expectedHash = request.headers.get("x-gy-sha256")?.toLowerCase() ?? ""
  if (!capturedAt || !SHA256.test(expectedHash)) {
    return fail("INVALID_IMAGE_METADATA", "Image metadata is invalid.", 400)
  }

  const bytes = Buffer.from(await request.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
    return fail("IMAGE_TOO_LARGE", "Images must be between 1 byte and 10 MB.", 413)
  }
  const actualHash = createHash("sha256").update(bytes).digest("hex")
  if (actualHash !== expectedHash) return fail("IMAGE_HASH_MISMATCH", "Image integrity check failed.", 400)

  try {
    // actor IDs and source IDs are restricted by the authentication and route
    // validators, respectively, so this deterministic key cannot escape its prefix.
    const storageKey = `keep/clipboard/${actor.actorId}/${params.id}.png`
    await saveClipboardImage(storageKey, bytes, "image/png", actualHash)
    const entries = await createClipboardImageEntry(actor, {
      id: params.id,
      capturedAt,
      mimeType: "image/png",
      sizeBytes: bytes.byteLength,
      sha256: actualHash,
      storageKey,
    })
    return ok({ entries }, 201)
  } catch (error) {
    return fail("IMAGE_SAVE_FAILED", "Could not save clipboard image.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response
  if (!SOURCE_ID.test(params.id)) return fail("INVALID_IMAGE", "Image ID is invalid.", 400)

  try {
    const image = await findClipboardImage(actor, params.id)
    if (!image?.mediaStorageKey) return fail("IMAGE_NOT_FOUND", "Image was not found.", 404)
    const body = await loadClipboardImage(image.mediaStorageKey)
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": image.mediaMimeType ?? "image/png",
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    return fail("IMAGE_LOAD_FAILED", "Could not load clipboard image.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
