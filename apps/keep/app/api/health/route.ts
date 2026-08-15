import { fail, logApiFailure, ok } from "@/lib/api-response"
import { getPrisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// This is deliberately data-free. It proves a canary can reach its database
// before production traffic is moved to that revision.
export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`
    const response = ok({ status: "ok", database: "ok" })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    logApiFailure("health.database", error)
    return fail("DATABASE_UNAVAILABLE", "Database is unavailable.", 503)
  }
}
