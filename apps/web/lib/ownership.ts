import { fail } from "./api-response"
import { getHsActor, hasHsServerConfig, type HsActor } from "./hs-server"
import { getServerActor } from "./hs-server-ssr"

export type ActorContext =
  | HsActor
  | {
      actorId: string
      email: string | null
      name: string | null
      avatarUrl: string | null
    }

export async function requireActor(request: Request) {
  if (hasHsServerConfig()) {
    const actor = (await getHsActor(request)) ?? (await getServerActor())
    if (actor) {
      return {
        ok: true as const,
        ...actor,
      }
    }
  }

  const debugActorId = request.headers.get("x-gyenbox-user-id")
  const allowDebugActor =
    process.env.ALLOW_UNVERIFIED_ACTOR_HEADER === "true" ||
    (process.env.NODE_ENV !== "production" && !hasHsServerConfig())

  if (debugActorId && allowDebugActor) {
    return {
      ok: true as const,
      actorId: debugActorId,
      email: request.headers.get("x-gyenbox-user-email"),
      name: request.headers.get("x-gyenbox-user-name"),
      avatarUrl: null,
    }
  }

  if (!hasHsServerConfig()) {
    return {
      ok: false as const,
      response: fail("AUTH_NOT_CONFIGURED", "Supabase authentication is not configured yet.", 503),
    }
  }

  return {
    ok: false as const,
    response: fail("UNAUTHORIZED", "Missing or invalid Supabase session.", 401),
  }
}

export async function assertResourceOwner(actorId: string, resourceType: "file" | "folder", resourceId: string) {
  const { getPrisma } = await import("./prisma")
  const prisma = getPrisma()

  if (resourceType === "file") {
    const file = await prisma.file.findFirst({
      where: { id: resourceId, ownerId: actorId },
      select: { id: true },
    })
    return Boolean(file)
  }

  const folder = await prisma.folder.findFirst({
    where: { id: resourceId, ownerId: actorId },
    select: { id: true },
  })
  return Boolean(folder)
}
