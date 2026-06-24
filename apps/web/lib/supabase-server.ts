import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://hrtynofmjcumuanjvpxz.supabase.co"
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const globalForSupabase = globalThis as unknown as {
  gyenboxSupabaseAuth?: SupabaseClient
}

export type SupabaseActor = {
  actorId: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  user: User
}

export function hasSupabaseServerConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

export function getSupabaseAuthClient() {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")
  }

  if (!globalForSupabase.gyenboxSupabaseAuth) {
    globalForSupabase.gyenboxSupabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return globalForSupabase.gyenboxSupabaseAuth
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization")
  if (!header) return null

  const [scheme, token] = header.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !token) return null
  return token
}

export async function getSupabaseActor(request: Request): Promise<SupabaseActor | null> {
  const token = getBearerToken(request)
  if (!token) return null

  const { data, error } = await getSupabaseAuthClient().auth.getUser(token)
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
