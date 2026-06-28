import { createBrowserClient } from "@supabase/ssr"
import { type SupabaseClient } from "@supabase/supabase-js"

export type SupabaseBrowserConfig = {
  url: string
  anonKey: string
}

const DEFAULT_SUPABASE_URL = "https://hrtynofmjcumuanjvpxz.supabase.co"

let browserClient: SupabaseClient | null = null
let runtimeConfig: SupabaseBrowserConfig | null = null

function getBuildTimeConfig(): SupabaseBrowserConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function setSupabaseBrowserConfig(config: SupabaseBrowserConfig | null) {
  const nextConfig = config?.url && config.anonKey ? config : null
  const changed = runtimeConfig?.url !== nextConfig?.url || runtimeConfig?.anonKey !== nextConfig?.anonKey

  runtimeConfig = nextConfig
  if (changed) browserClient = null
}

export function hasSupabaseBrowserConfig() {
  return Boolean(runtimeConfig ?? getBuildTimeConfig())
}

export function getSupabaseBrowserClient() {
  const config = runtimeConfig ?? getBuildTimeConfig()

  if (!config) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")
  }

  if (!browserClient) {
    // Cookie-backed session so the server (SSR pages, middleware, route handlers)
    // can read the logged-in user and render the first paint with real data.
    browserClient = createBrowserClient(config.url, config.anonKey)
  }

  return browserClient
}