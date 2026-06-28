import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getPublicSupabaseConfig } from "./lib/supabase-public-config"

/**
 * Keeps the Supabase session cookie fresh on each request so SSR pages
 * (e.g. /workspace) can read a valid logged-in user and render the first
 * paint with real data instead of a client-side loading waterfall.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const config = getPublicSupabaseConfig()
  if (!config) return response

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Refreshes the access token if expired and rewrites the cookies.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    "/workspace/:path*",
    "/home/:path*",
    "/files/:path*",
    "/shared/:path*",
    "/starred/:path*",
    "/trash/:path*",
    "/settings/:path*",
  ],
}
