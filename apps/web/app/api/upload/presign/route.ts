import { fail, ok } from "@/lib/api-response"
import { requireActor } from "@/lib/ownership"
import { createPresignedUpload } from "@/lib/s3"
import { uploadReservationSchema } from "@/lib/validations"

export async function POST(request: Request) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  const parsed = uploadReservationSchema.safeParse(body)
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid presign payload.", 422, parsed.error.flatten())
  }

  try {
    const result = await createPresignedUpload({
      userId: actor.actorId,
      filename: parsed.data.name,
      mimeType: parsed.data.mimeType,
      checksum: parsed.data.checksum,
    })

    return ok({
      fileId: `pending_${crypto.randomUUID()}`,
      uploadUrl: result.uploadUrl,
      expiresIn: 600,
    })
  } catch (error) {
    return fail("STORAGE_NOT_CONFIGURED", "S3-compatible storage is not configured yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown storage error",
    })
  }
}
