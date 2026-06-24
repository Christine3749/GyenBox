import { fail } from "@/lib/api-response"
import { downloadObject } from "@/lib/gcs"
import { requireActor } from "@/lib/ownership"
import { getPrisma } from "@/lib/prisma"

type DownloadRouteProps = {
  params: {
    id: string
  }
}

export const runtime = "nodejs"

export async function GET(request: Request, { params }: DownloadRouteProps) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const file = await getPrisma().file.findFirst({
    where: { id: params.id, ownerId: actor.actorId, isTrashed: false },
    select: { id: true, name: true, mimeType: true, size: true, storageKey: true },
  })
  if (!file) return fail("FORBIDDEN", "You do not have access to this download.", 403)

  try {
    const buffer = await downloadObject(file.storageKey)
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename="${file.name.replace(/"/g, "")}"`,
      },
    })
  } catch (error) {
    return fail("DOWNLOAD_FAILED", "Could not stream this file yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown storage error",
    })
  }
}
