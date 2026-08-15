import { NextResponse } from "next/server"

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  )
}

// Keep route failures observable in Cloud Run without logging request bodies,
// tokens, or note content.
export function logApiFailure(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error"
  console.error(`[keep:${scope}] ${message}`)
}
