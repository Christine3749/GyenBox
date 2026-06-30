import { fail, ok } from "@/lib/api-response"
import { createSignedDownloadUrl } from "@/lib/storage"
import { requireActor } from "@/lib/ownership"
import { getPrisma } from "@/lib/prisma"

type DownloadRouteProps = {
  params: {
    id: string
  }
}

type DownloadPayload = {
  downloadUrl: string
  expiresIn: number
}

export const runtime = "nodejs"

export async function GET(request: Request, { params }: DownloadRouteProps) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const file = await getPrisma().file.findFirst({
    where: { id: params.id, ownerId: actor.actorId, isTrashed: false },
    select: { id: true, name: true, mimeType: true, storageKey: true },
  })
  if (!file) return fail("FORBIDDEN", "You do not have access to this download.", 403)

  try {
    const signedDownload = await createSignedDownloadUrl({
      key: file.storageKey,
      filename: file.name,
      contentType: file.mimeType,
      expiresInSeconds: 300,
    })

    if (wantsJson(request)) {
      return ok<DownloadPayload>({
        downloadUrl: signedDownload.url,
        expiresIn: signedDownload.expiresIn,
      })
    }

    return Response.redirect(signedDownload.url, 302)
  } catch (error) {
    return fail("DOWNLOAD_FAILED", "Could not prepare this download yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown storage error",
    })
  }
}

function wantsJson(request: Request) {
  return request.headers.get("accept")?.toLowerCase().includes("application/json") ?? false
}
