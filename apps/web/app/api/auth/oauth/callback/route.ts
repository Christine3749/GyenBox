import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { hsRequest, type HsSession } from "@/lib/hs-account"
import { saveSession } from "@/lib/hs-session"
export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  try {
    const state = JSON.parse((await cookies()).get("gyenbox-hs-oauth")?.value || "null")
    if (!state?.sessionId) throw new Error("登录已过期，请重试")
    const callback = new URL(request.url)
    const result = await hsRequest<HsSession>("/gyenbox/oauth/finish", { method: "POST", body: JSON.stringify({
      requestUri: `https://gyenbox.com/api/auth/oauth/callback${callback.search}`, sessionId: state.sessionId }) })
    await saveSession(result)
    (await cookies()).delete("gyenbox-hs-oauth")
    return NextResponse.redirect(new URL(state.next, "https://gyenbox.com"))
  } catch (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error instanceof Error ? error.message : "登录未完成")}`, "https://gyenbox.com"))
  }
}
