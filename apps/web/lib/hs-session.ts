import { cookies } from "next/headers"
import { ACCESS_COOKIE, REFRESH_COOKIE, hsRequest, toSession, expiresAt, AccountError, type HsSession, type Session } from "./hs-account"
import { actorFromToken } from "./hs-server"
const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" }
export async function saveSession(result: HsSession) {
  const session = toSession(result)
  const cookieStore = await cookies()
  cookieStore.set(ACCESS_COOKIE, result.idToken, { ...options, maxAge: result.expiresIn })
  cookieStore.set(REFRESH_COOKIE, result.refreshToken, { ...options, maxAge: 60 * 60 * 24 * 30 })
  return session
}
export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.set(ACCESS_COOKIE, "", { ...options, maxAge: 0 })
  cookieStore.set(REFRESH_COOKIE, "", { ...options, maxAge: 0 })
}
export async function readSession(forceRefresh = false): Promise<Session | null> {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value
  const refresh = (await cookies()).get(REFRESH_COOKIE)?.value
  if (!forceRefresh && access && expiresAt(access) > Date.now() / 1000 + 90) {
    const actor = await actorFromToken(access)
    if (actor) return { access_token: access, refresh_token: refresh || "", expires_at: expiresAt(access), user: actor.user }
  }
  if (!refresh) return null
  try { return saveSession(await hsRequest<HsSession>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: refresh }) })) }
  catch (error) {
    if (error instanceof AccountError && error.status === 401) { await clearSession(); return null }
    throw error
  }
}
