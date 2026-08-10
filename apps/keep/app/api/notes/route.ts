import { fail, ok } from "@/lib/api-response"
import { ensureFreeMembership } from "@/lib/membership"
import { createNote, getNotesPayloadEtag, getNotesSyncEtag, listNotesAndLabels, listNotesPage } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"
import { getBearerToken } from "@/lib/supabase-server"

export const runtime = "nodejs"

const INITIAL_PAGE_MIN = 20
const INITIAL_PAGE_MAX = 160

function readPageRequest(request: Request): { offset: number; limit: number } | null | "invalid" {
  const url = new URL(request.url)
  if (!url.searchParams.has("limit") && !url.searchParams.has("offset")) return null
  const offset = Number(url.searchParams.get("offset") ?? "0")
  const limit = Number(url.searchParams.get("limit") ?? "0")
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < INITIAL_PAGE_MIN || limit > INITIAL_PAGE_MAX) {
    return "invalid"
  }
  return { offset, limit }
}

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const accessToken = getBearerToken(request)
  if (accessToken) {
    // Membership housekeeping is deliberately not in the read path.  A slow
    // external Supabase call must never delay opening the user's notes.
    void ensureFreeMembership(accessToken).catch(() => undefined)
  }

  try {
    const pageRequest = readPageRequest(request)
    if (pageRequest === "invalid") return fail("INVALID_PAGE", "Expected a valid notes page request.", 400)
    if (pageRequest) {
      const payload = await listNotesPage(actor, pageRequest.offset, pageRequest.limit)
      const response = ok(payload)
      // Only the final incremental page represents a complete local library,
      // so only it may seed the next conditional refresh.
      if (payload.nextOffset === null) {
        response.headers.set("ETag", await getNotesSyncEtag(actor))
        response.headers.set("Cache-Control", "private, no-cache")
        response.headers.set("Vary", "Authorization")
      }
      return response
    }

    const clientEtag = request.headers.get("if-none-match")
    if (clientEtag && clientEtag === await getNotesSyncEtag(actor)) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: clientEtag,
          "Cache-Control": "private, no-cache",
          Vary: "Authorization",
        },
      })
    }
    // On a cold load we already have to read the library. Hash that response
    // rather than doing a separate metadata query before it.
    const payload = await listNotesAndLabels(actor)
    const response = ok(payload)
    response.headers.set("ETag", getNotesPayloadEtag(payload))
    response.headers.set("Cache-Control", "private, no-cache")
    response.headers.set("Vary", "Authorization")
    return response
  } catch (error) {
    return fail("NOTES_UNAVAILABLE", "Could not load notes.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function POST(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body.title !== "string" || typeof body.content !== "string") {
    return fail("INVALID_BODY", "Missing note fields.", 400)
  }

  try {
    const note = await createNote(actor, {
      title: body.title,
      content: body.content,
      type: body.type === "checklist" ? "checklist" : "text",
      items: Array.isArray(body.items) ? body.items : undefined,
      color: body.color ?? "default",
      isPinned: Boolean(body.isPinned),
      isArchived: Boolean(body.isArchived),
      isTrashed: Boolean(body.isTrashed),
      trashedAt: body.trashedAt ?? undefined,
      labels: Array.isArray(body.labels) ? body.labels : [],
      reminder: body.reminder ?? null,
    })
    return ok(note, 201)
  } catch (error) {
    return fail("NOTE_CREATE_FAILED", "Could not create note.", 503, {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
