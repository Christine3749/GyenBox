import { fail, ok } from "@/lib/api-response"
import { requireActor } from "@/lib/ownership"
import { uploadReservationSchema } from "@/lib/validations"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  const parsed = uploadReservationSchema.safeParse(body)
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid presign payload.", 422, parsed.error.flatten())
  }

  return ok({
    fileId: `pending_${crypto.randomUUID()}`,
    uploadEndpoint: "/api/upload",
    method: "multipart/form-data",
    expiresIn: 600,
  })
}
