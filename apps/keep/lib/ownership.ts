import { fail } from "./api-response"
import { getSupabaseActor, hasSupabaseServerConfig, type SupabaseActor } from "./supabase-server"
import { getServerActor } from "./supabase-server-ssr"

export type ActorContext =
  | SupabaseActor
  | {
      actorId: string
      email: string | null
      name: string | null
      avatarUrl: string | null
    }

export async function requireActor(request: Request) {
  if (hasSupabaseServerConfig()) {
    const actor = (await getSupabaseActor(request)) ?? (await getServerActor())
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
    (process.env.NODE_ENV !== "production" && !hasSupabaseServerConfig())

  if (debugActorId && allowDebugActor) {
    return {
      ok: true as const,
      actorId: debugActorId,
      email: request.headers.get("x-gyenbox-user-email"),
      name: request.headers.get("x-gyenbox-user-name"),
      avatarUrl: null,
    }
  }

  if (!hasSupabaseServerConfig()) {
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
