import { listClipboardChanges } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"
import { wireChanges } from "@/lib/clipboard-wire"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 15

const CURSOR = /^(?:0|[1-9][0-9]{0,19})$/
const STREAM_WAIT_MS = 12_000
const CHECK_INTERVAL_MS = 200

function delay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(done, milliseconds)
    function done() {
      clearTimeout(timer)
      signal.removeEventListener("abort", done)
      resolve()
    }
    signal.addEventListener("abort", done, { once: true })
  })
}

function sse(event: string, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// This endpoint is deliberately only a low-latency wake-up signal. Clients
// still fetch /api/clipboard/sync?cursor=… to apply the authoritative ordered
// page, which keeps reconnects, old clients, and a missed SSE message safe.
export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response
  const cursorText = new URL(request.url).searchParams.get("cursor")
  if (!cursorText || !CURSOR.test(cursorText)) {
    return Response.json({ ok: false, error: { code: "INVALID_CURSOR", message: "Expected an unsigned decimal cursor." } }, { status: 400 })
  }

  const cursor = BigInt(cursorText)
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const finish = () => {
        try {
          controller.close()
        } catch {
          // A disconnected client has already closed the stream.
        }
      }
      try {
        controller.enqueue(encoder.encode("retry: 1000\n\n"))
        const deadline = Date.now() + STREAM_WAIT_MS
        while (!request.signal.aborted && Date.now() < deadline) {
          const page = await listClipboardChanges(actor, cursor)
          if (page.events.length > 0) {
            controller.enqueue(encoder.encode(sse("clipboard", {
              cursor: page.cursor,
              hasMore: page.hasMore,
              payload: wireChanges(page.events),
            })))
            finish()
            return
          }
          await delay(Math.min(CHECK_INTERVAL_MS, Math.max(0, deadline - Date.now())), request.signal)
        }
        if (!request.signal.aborted) controller.enqueue(encoder.encode(sse("keepalive", { cursor: cursorText })))
      } catch {
        if (!request.signal.aborted) {
          try {
            controller.enqueue(encoder.encode(sse("error", { code: "CLIPBOARD_STREAM_UNAVAILABLE" })))
          } catch {
            // Ignore a connection that closed while an error was handled.
          }
        }
      } finally {
        finish()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
