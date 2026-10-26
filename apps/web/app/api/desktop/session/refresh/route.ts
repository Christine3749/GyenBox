import { fail, ok } from "@/lib/api-response"
import { hsRequest, AccountError, type HsSession } from "@/lib/hs-account"
export const runtime = "nodejs"
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : ""
  if (!refreshToken) return fail("VALIDATION_ERROR", "Refresh token is required.", 422)
  try {
    const result = await hsRequest<HsSession>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) })
    return ok({ accessToken: result.idToken, refreshToken: result.refreshToken,
      expiresAt: new Date(Date.now() + result.expiresIn * 1000).toISOString(), user: result.user })
  } catch (error) {
    return fail("SESSION_REFRESH_FAILED", error instanceof Error ? error.message : "Could not refresh session.", error instanceof AccountError ? error.status : 503)
  }
}
