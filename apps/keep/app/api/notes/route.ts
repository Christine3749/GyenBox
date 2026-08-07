import { fail, ok } from "@/lib/api-response"
import { ensureFreeMembership } from "@/lib/membership"
import { createNote, listNotesAndLabels } from "@/lib/notes-data"
import { requireActor } from "@/lib/ownership"
import { getBearerToken } from "@/lib/supabase-server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const accessToken = getBearerToken(request)
  if (accessToken) {
    try {
      await ensureFreeMembership(accessToken)
    } catch {
      // Best-effort — HalfSphere membership must never block note-taking.
    }
  }

  try {
    return ok(await listNotesAndLabels(actor))
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
