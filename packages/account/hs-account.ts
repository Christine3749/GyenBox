export const HS_API_URL = (process.env.HALFSPHERE_API_URL || "https://account.gsyen.com").replace(/\/$/, "")
export const ACCESS_COOKIE = "gyenbox-hs-access"
export const REFRESH_COOKIE = "gyenbox-hs-refresh"
export type AccountUser = { id: string; email?: string; user_metadata: Record<string, unknown> }
export type Session = { access_token: string; refresh_token: string; expires_at: number; user: AccountUser }
export type HsSession = { idToken: string; refreshToken: string; expiresIn: number; user: { id: string; email?: string; displayName?: string } }
export class AccountError extends Error {
  constructor(message: string, public status: number) { super(message) }
}
export async function hsRequest<T>(path: string, options: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const response = await fetch(`${HS_API_URL}${path}`, { ...options, cache: "no-store", signal: AbortSignal.timeout(timeoutMs),
    headers: { "Content-Type": "application/json", ...options.headers } })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new AccountError(result.error || "账号服务暂时不可用", response.status)
  return result as T
}
export function toSession(result: HsSession): Session {
  return { access_token: result.idToken, refresh_token: result.refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + result.expiresIn,
    user: { id: result.user.id, email: result.user.email, user_metadata: { full_name: result.user.displayName } } }
}
export function expiresAt(token: string) {
  try { return Number(JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp) || 0 }
  catch { return 0 }
}
