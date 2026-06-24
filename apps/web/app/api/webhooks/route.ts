import { fail, ok } from "@/lib/api-response"

const supportedEvents = [
  "file.created",
  "file.updated",
  "file.deleted",
  "share.created",
  "member.joined",
]

export async function GET() {
  return ok({
    events: supportedEvents,
    retryPolicy: {
      attempts: 3,
      backoff: "exponential",
    },
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.url || !body?.events) {
    return fail("VALIDATION_ERROR", "Webhook registration requires url and events.", 422)
  }

  return ok(
    {
      id: `webhook_${crypto.randomUUID()}`,
      url: body.url,
      events: body.events,
      status: "active",
    },
    201,
  )
}
