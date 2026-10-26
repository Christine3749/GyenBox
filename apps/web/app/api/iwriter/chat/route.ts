import { NextResponse } from "next/server"


export const runtime = "nodejs"

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 })
  }

  const upstream = process.env.GSYEN_CHAT_UPSTREAM
  if (!upstream) return NextResponse.json({ error: "Chat service is not configured." }, { status: 503 })
  const response = await fetch(upstream, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
    body: await request.text(),
    cache: "no-store",
  })

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  })
}
