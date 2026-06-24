import { ok, fail } from "@/lib/api-response"
import { requireActor } from "@/lib/ownership"
import { createPresignedUpload } from "@/lib/s3"
import { fileListQuerySchema, uploadReservationSchema } from "@/lib/validations"
import { mockFiles } from "@/lib/mock-data"

export async function GET(request: Request) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const url = new URL(request.url)
  const parsed = fileListQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid file list query.", 422, parsed.error.flatten())
  }

  const files = mockFiles.filter((file) => {
    if (!parsed.data.type) return true
    if (parsed.data.type === "document") return ["pdf", "document", "spreadsheet", "presentation"].includes(file.kind)
    return file.kind === parsed.data.type
  })

  return ok({
    files,
    total: files.length,
    nextCursor: null,
  })
}

export async function POST(request: Request) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  const parsed = uploadReservationSchema.safeParse(body)
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid upload reservation payload.", 422, parsed.error.flatten())
  }

  const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024 * 1024)
  if (parsed.data.size > maxUploadBytes) {
    return fail("QUOTA_EXCEEDED", "File is larger than the configured upload limit.", 413)
  }

  try {
    const presigned = await createPresignedUpload({
      userId: actor.actorId,
      filename: parsed.data.name,
      mimeType: parsed.data.mimeType,
      checksum: parsed.data.checksum,
    })

    return ok(
      {
        fileId: `pending_${crypto.randomUUID()}`,
        uploadUrl: presigned.uploadUrl,
        chunkUrls: null,
      },
      201,
    )
  } catch (error) {
    return fail("STORAGE_NOT_CONFIGURED", "S3-compatible storage is not configured yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown storage error",
    })
  }
}
