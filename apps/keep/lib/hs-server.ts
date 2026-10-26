import { hsRequest, AccountError, type AccountUser } from "./hs-account"
export type HsActor = { actorId: string; email: string | null; name: string | null; avatarUrl: string | null; user: AccountUser }
export function hasHsServerConfig() { return true }
export function getBearerToken(request: Request) {
  return request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] || null
}
export async function actorFromToken(token: string): Promise<HsActor | null> {
  try {
    const { user } = await hsRequest<{ user: { id: string; email?: string; displayName?: string } }>("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
    return { actorId: user.id, email: user.email || null, name: user.displayName || null, avatarUrl: null,
      user: { id: user.id, email: user.email, user_metadata: { full_name: user.displayName } } }
  } catch (error) {
    if (error instanceof AccountError && error.status === 401) return null
    throw error
  }
}
export async function getHsActor(request: Request) {
  const token = getBearerToken(request)
  return token ? actorFromToken(token) : null
}
