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
      setAll(cookiesToSet, headersToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        for (const [name, value] of Object.entries(headersToSet)) {
          response.headers.set(name, value)
        }
      },
    },
  })

  // Validates locally against the cached JWKS when possible and refreshes the
  // session cookies when needed. This avoids an Auth-network round trip on
  // every protected navigation while keeping the server-side identity trusted.
  await supabase.auth.getClaims()

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
