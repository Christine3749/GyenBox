import { fail, ok } from "@/lib/api-response"
import { listFileItems } from "@/lib/file-records"
import { requireActor } from "@/lib/ownership"
import { fileListQuerySchema } from "@/lib/validations"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const url = new URL(request.url)
  const parsed = fileListQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid file list query.", 422, parsed.error.flatten())
  }

  try {
    const payload = await listFileItems(actor, parsed.data.folderId)
    const files = payload.files.filter((file) => {
      if (!parsed.data.type) return true
      if (parsed.data.type === "image") return file.type === "png" || file.type === "jpg"
      if (parsed.data.type === "video") return file.type === "mp4"
      if (parsed.data.type === "document") return ["pdf", "docx", "xlsx", "txt"].includes(file.type)
      return ["zip"].includes(file.type)
    })

    return ok({
      ...payload,
      files,
      total: files.length,
      nextCursor: null,
    })
  } catch (error) {
    return fail("DATABASE_NOT_CONFIGURED", "Postgres is not ready for file metadata yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown database error",
    })
  }
}

export async function POST() {
  return ok(
    {
      uploadEndpoint: "/api/upload/presign",
      completeEndpoint: "/api/upload/complete",
      method: "signed-url",
      storageProvider: "gcs",
    },
    201,
  )
}
