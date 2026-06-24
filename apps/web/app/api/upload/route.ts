import { createHash } from "node:crypto"
import { fail, ok } from "@/lib/api-response"
import { ensureUserRecord, fileToItem } from "@/lib/file-records"
import { createStorageKey, uploadObject } from "@/lib/gcs"
import { getPrisma } from "@/lib/prisma"
import { requireActor } from "@/lib/ownership"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const formData = await request.formData().catch(() => null)
  const uploaded = formData?.get("file")
  if (!(uploaded instanceof File)) {
    return fail("VALIDATION_ERROR", "Upload requires a multipart file field named file.", 422)
  }

  const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024 * 1024)
  if (uploaded.size > maxUploadBytes) {
    return fail("QUOTA_EXCEEDED", "File is larger than the configured upload limit.", 413)
  }

  const folderValue = formData?.get("folderId")
  const parentId = typeof folderValue === "string" && folderValue && folderValue !== "root" ? folderValue : null
  const contentType = uploaded.type || "application/octet-stream"
  const buffer = Buffer.from(await uploaded.arrayBuffer())
  const checksum = createHash("sha256").update(buffer).digest("hex")
  const storageKey = createStorageKey(actor.actorId, uploaded.name)

  try {
    await ensureUserRecord(actor)
    await uploadObject({
      key: storageKey,
      body: buffer,
      contentType,
      metadata: {
        owner: actor.actorId,
        checksum,
      },
    })

    const file = await getPrisma().file.create({
      data: {
        name: uploaded.name,
        mimeType: contentType,
        size: BigInt(uploaded.size),
        storageKey,
        checksum,
        parentId,
        ownerId: actor.actorId,
      },
      include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
    })

    return ok({ file: fileToItem(file) }, 201)
  } catch (error) {
    return fail("UPLOAD_FAILED", "Could not store this file yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown upload error",
    })
  }
}
