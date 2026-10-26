import { NextResponse } from "next/server"
import { hsRequest, AccountError, type HsSession } from "@/lib/hs-account"
import { saveSession } from "@/lib/hs-session"
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await hsRequest<HsSession>("/gyenbox/signup", { method: "POST", body: JSON.stringify({ email: body.email, password: body.password }) })
    const session = await saveSession(result)
    return NextResponse.json({ access_token: session.access_token, refresh_token: session.refresh_token }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "注册暂时不可用" }, { status: error instanceof AccountError ? error.status : 503 }) }
}
