import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getPublicSupabaseConfig } from "./supabase-public-config"
import type { SupabaseActor } from "./supabase-server"

/**
 * Cookie-backed Supabase client for Server Components / route handlers.
 * Reads the session the browser client (createBrowserClient) persisted in
 * cookies, so the server can know who is logged in during SSR.
 *
 * Note: in a Server Component cookies are read-only — writes throw and are
 * swallowed here; the middleware is responsible for refreshing session cookies.
 */
export async function getSupabaseServerClient() {
  const config = getPublicSupabaseConfig()
  if (!config) return null

  const cookieStore = await cookies()
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Read-only cookie context (Server Component). Middleware refreshes.
        }
      },
    },
  })
}

/**
 * Resolve the logged-in actor on the server from cookie session.
 * Mirrors the shape returned by getSupabaseActor (header/bearer path) so the
 * same downstream helpers (e.g. listFileItems, ensureUserRecord) can be reused.
 */
export async function getServerActor(): Promise<SupabaseActor | null> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  const metadata = data.user.user_metadata ?? {}
  const name =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null
  const avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : null

  return {
    actorId: data.user.id,
    email: data.user.email ?? null,
    name,
    avatarUrl,
    user: data.user,
  }
}
