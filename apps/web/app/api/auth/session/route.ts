import { NextResponse } from "next/server"
import { hsRequest, AccountError, type HsSession } from "@/lib/hs-account"
import { readSession, saveSession } from "@/lib/hs-session"
export const dynamic = "force-dynamic"
function reply(session: unknown) { return NextResponse.json({ session }, { headers: { "Cache-Control": "private, no-store" } }) }
export async function GET() {
  try { return reply(await readSession()) }
  catch { return NextResponse.json({ error: "账号服务暂时不可用，请稍后重试" }, { status: 503 }) }
}
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.refresh_token) return reply(await readSession(true))
    const result = await hsRequest<HsSession>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: body.refresh_token }) })
    return reply(await saveSession(result))
  } catch (error) { return NextResponse.json({ error: "会话已失效，请重新登录" }, { status: error instanceof AccountError ? error.status : 503 }) }
}
