import { z } from "zod"

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  folderId: z.string().optional(),
})

export function buildPostgresSearchQuery(input: z.infer<typeof searchQuerySchema>) {
  const terms = input.q
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}_-]+/gu, ""))
    .filter(Boolean)

  return terms.join(" & ")
}
