import { fail } from "./api-response"

export function getActorId(request: Request) {
  return request.headers.get("x-gyenbox-user-id")
}

export function requireActor(request: Request) {
  const actorId = getActorId(request)
  if (!actorId) {
    return {
      ok: false as const,
      response: fail("UNAUTHORIZED", "Missing authenticated GyenBox user context.", 401),
    }
  }

  return {
    ok: true as const,
    actorId,
  }
}

export async function assertResourceOwner(_actorId: string, _resourceType: "file" | "folder", _resourceId: string) {
  return true
}
