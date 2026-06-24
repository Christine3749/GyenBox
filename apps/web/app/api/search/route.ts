import { fail, ok } from "@/lib/api-response"
import { requireActor } from "@/lib/ownership"
import { buildPostgresSearchQuery, searchQuerySchema } from "@/lib/search"
import { mockFiles } from "@/lib/mock-data"

export async function GET(request: Request) {
  const actor = requireActor(request)
  if (!actor.ok) return actor.response

  const url = new URL(request.url)
  const parsed = searchQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid search query.", 422, parsed.error.flatten())
  }

  const query = parsed.data.q.toLowerCase()
  const results = mockFiles.filter((file) => {
    return [file.name, file.ownerName, file.path, ...file.tags].some((value) => value.toLowerCase().includes(query))
  })

  return ok({
    query: buildPostgresSearchQuery(parsed.data),
    results,
    total: results.length,
  })
}
