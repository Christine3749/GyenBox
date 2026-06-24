import { fail, ok } from "@/lib/api-response"
import { fileToItem, folderToItem } from "@/lib/file-records"
import { requireActor } from "@/lib/ownership"
import { buildPostgresSearchQuery, searchQuerySchema } from "@/lib/search"
import { getPrisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const actor = await requireActor(request)
  if (!actor.ok) return actor.response

  const url = new URL(request.url)
  const parsed = searchQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid search query.", 422, parsed.error.flatten())
  }

  const query = parsed.data.q.trim()
  if (!query) {
    return ok({ query: buildPostgresSearchQuery(parsed.data), results: [], total: 0 })
  }

  const [files, folders] = await Promise.all([
    getPrisma().file.findMany({
      where: {
        ownerId: actor.actorId,
        isTrashed: false,
        name: { contains: query, mode: "insensitive" },
      },
      include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
      take: 25,
    }),
    getPrisma().folder.findMany({
      where: {
        ownerId: actor.actorId,
        isTrashed: false,
        name: { contains: query, mode: "insensitive" },
      },
      include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
      take: 25,
    }),
  ])

  const results = [...folders.map((folder) => folderToItem(folder, 0)), ...files.map(fileToItem)]

  return ok({
    query: buildPostgresSearchQuery(parsed.data),
    results,
    total: results.length,
  })
}
