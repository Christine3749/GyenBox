import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://hrtynofmjcumuanjvpxz.supabase.co"
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const globalForSupabase = globalThis as unknown as {
  keepSupabaseAuth?: SupabaseClient
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

  if (!globalForSupabase.keepSupabaseAuth) {
    globalForSupabase.keepSupabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return globalForSupabase.keepSupabaseAuth
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization")
  if (!header) return null

  const [scheme, token] = header.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !token) return null
  return token
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null
}

export function actorFromVerifiedClaims(claims: Record<string, unknown>): SupabaseActor | null {
  const actorId = typeof claims.sub === "string" ? claims.sub : null
  if (!actorId) return null

  const metadata = record(claims.user_metadata) ?? {}
  const name =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null
  const avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : null
  const email = typeof claims.email === "string" ? claims.email : null

  // The route layer only consumes the stable actor fields above. Keep the
  // declared shape compatible with cookie-authenticated actors without making
  // another Auth API request merely to hydrate an otherwise unused User object.
  return {
    actorId,
    email,
    name,
    avatarUrl,
    user: { id: actorId, email, user_metadata: metadata } as User,
  }
}

export async function getSupabaseActor(request: Request): Promise<SupabaseActor | null> {
  const token = getBearerToken(request)
  if (!token) return null

  // getClaims verifies the signature. With asymmetric signing keys it uses a
  // locally cached JWKS key after the first request, rather than calling the
  // Auth user endpoint for every notes API request. The Supabase client safely
  // falls back to remote verification for symmetric projects.
  const { data, error } = await getSupabaseAuthClient().auth.getClaims(token)
  if (error || !data?.claims) return null
  return actorFromVerifiedClaims(data.claims as Record<string, unknown>)
}
