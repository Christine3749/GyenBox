import { NextResponse, type NextRequest } from "next/server"
import { ACCESS_COOKIE, REFRESH_COOKIE, expiresAt, hsRequest, AccountError, type HsSession } from "./lib/hs-account"
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":", 1)[0]?.toLowerCase()
  if (hostname === "iwriter.gyenbox.com" && request.nextUrl.pathname === "/") {
    const iwriterUrl = request.nextUrl.clone()
    iwriterUrl.pathname = "/iwriter"
    return NextResponse.rewrite(iwriterUrl)
  }

  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  if (!refresh || (access && expiresAt(access) > Date.now() / 1000 + 90)) return NextResponse.next()
  try {
    const result = await hsRequest<HsSession>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: refresh }) })
    request.cookies.set(ACCESS_COOKIE, result.idToken)
    request.cookies.set(REFRESH_COOKIE, result.refreshToken)
    const response = NextResponse.next({ request })
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" }
    response.cookies.set(ACCESS_COOKIE, result.idToken, { ...options, maxAge: result.expiresIn })
    response.cookies.set(REFRESH_COOKIE, result.refreshToken, { ...options, maxAge: 60 * 60 * 24 * 30 })
    return response
  } catch (error) {
    if (error instanceof AccountError && error.status === 401) {
      request.cookies.delete(ACCESS_COOKIE); request.cookies.delete(REFRESH_COOKIE)
      const response = NextResponse.next({ request })
      response.cookies.delete(ACCESS_COOKIE); response.cookies.delete(REFRESH_COOKIE)
      return response
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/",
    "/workspace/:path*",
    "/home/:path*",
    "/files/:path*",
    "/shared/:path*",
    "/starred/:path*",
    "/trash/:path*",
    "/settings/:path*",
  ],
}
