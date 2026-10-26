import type { Session } from "./hs-account"
export type HsBrowserConfig = { url: string; anonKey: string }
export function setHsBrowserConfig(_config: HsBrowserConfig | null) {}
export function hasHsBrowserConfig() { return true }
type Listener = (event: string, session: Session | null) => void
const listeners = new Set<Listener>()
let pending: Promise<{ data: { session: Session | null }; error: Error | null }> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let generation = 0
let channel: BroadcastChannel | undefined
let cached: Session | null | undefined
function publish(session: Session | null, event = "TOKEN_REFRESHED") {
  cached = session
  clearTimeout(refreshTimer)
  if (session) refreshTimer = setTimeout(() => { void auth.getSession() }, Math.max(1000, session.expires_at * 1000 - Date.now() - 60000))
  for (const listener of listeners) listener(event, session)
}
async function request(path: string, body?: unknown) {
  try {
    const initial: Response | null = null
    const response = initial ?? await fetch(`/api/auth/${path}`, { method: body === undefined ? "GET" : "POST", cache: "no-store", signal: AbortSignal.timeout(path === "login" ? 35000 : 20000),
      headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
    const result = await response.json()
    if (!response.ok) throw Object.assign(new Error(result.error || "账号服务暂时不可用"), { status: response.status })
    return { data: { session: (result.session || null) as Session | null }, error: null }
  } catch (error) { return { data: { session: null }, error: error instanceof Error ? error : new Error("账号服务暂时不可用") } }
}
const auth = {
  getSession(force = false) {
    if (!force && cached !== undefined && (!cached || cached.expires_at > Date.now() / 1000 + 90))
      return Promise.resolve({ data: { session: cached }, error: null })
    if (!pending) {
      const current = generation
      pending = request("session").then(result => {
        if (current === generation && !result.error) publish(result.data.session)
        if (result.error && listeners.size) { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { void auth.getSession() }, 30000) }
        return current === generation ? result : { data: { session: cached || null }, error: null }
      }).finally(() => { pending = null })
    }
    return pending
  },
  async refreshSession() {
    const current = generation
    const result = await request("session", {})
    if (current === generation && !result.error) publish(result.data.session)
    return current === generation ? result : { data: { session: cached || null }, error: null }
  },
  async signInWithPassword(body: { email: string; password: string }) {
    const result = await request("login", body)
    if (!result.error) { generation++; publish(result.data.session, "SIGNED_IN"); channel?.postMessage("changed") }
    return result
  },
  async signUp(body: { email: string; password: string; options?: { emailRedirectTo?: string } }) {
    const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const result = await response.json()
    if (!response.ok) return { data: { session: null }, error: new Error(result.error || "注册暂时不可用") }
    return auth.setSession(result)
  },
  async setSession(body: { access_token: string; refresh_token: string }) {
    const result = await request("session", body)
    if (!result.error) { generation++; publish(result.data.session, "SIGNED_IN"); channel?.postMessage("changed") }
    return result
  },
  async signOut() {
    const result = await request("logout", {})
    if (!result.error) { generation++; publish(null, "SIGNED_OUT"); channel?.postMessage("changed") }
    return { error: result.error }
  },
  onAuthStateChange(listener: Listener) {
    listeners.add(listener)
    return { data: { subscription: { unsubscribe() { listeners.delete(listener) } } } }
  },
  async signInWithOAuth(options: { provider: string; options: { redirectTo: string } }) {
    try {
      const next = new URL(options.options.redirectTo).pathname + new URL(options.options.redirectTo).search
      const response = await fetch(`/api/auth/oauth/start?next=${encodeURIComponent(next)}`, { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "GitHub 登录暂时不可用")
      window.location.assign(result.authUri)
      return { error: null }
    } catch (error) { return { error: error instanceof Error ? error : new Error("GitHub 登录暂时不可用") } }
  },
}
export function getHsBrowserClient() {
  if (!channel && typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("gyenbox-account")
    channel.onmessage = () => { cached = undefined; void auth.getSession(true) }
    window.addEventListener("focus", () => { void auth.getSession(true) })
  }
  return { auth }
}
