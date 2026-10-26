import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { hsRequest, AccountError } from "@/lib/hs-account"
export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  try {
    const result = await hsRequest<{ authUri: string; sessionId: string }>("/gyenbox/oauth/start")
    const next = new URL(request.url).searchParams.get("next") || "/workspace"
    (await cookies()).set("gyenbox-hs-oauth", JSON.stringify({ sessionId: result.sessionId, next: next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/workspace" }),
      { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 })
    return NextResponse.json({ authUri: result.authUri }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub 登录暂时不可用" }, { status: error instanceof AccountError ? error.status : 503 }) }
}
