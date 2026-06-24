import { fail, ok } from "@/lib/api-response"
import { assertResourceOwner, requireActor } from "@/lib/ownership"

type DownloadRouteProps = {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: DownloadRouteProps) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const ownsResource = await assertResourceOwner(actor.actorId, "file", params.id)
  if (!ownsResource) return fail("FORBIDDEN", "You do not have access to this download.", 403)

  return ok({
    id: params.id,
    downloadUrl: null,
    message: "Presigned GET URL generation is reserved for the storage implementation task.",
  })
}
