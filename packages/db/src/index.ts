export * from "../generated/client"

/**
 * Cloud Run instances can scale faster than a relational database can accept
 * new Prisma pools. Keep each instance bounded unless an operator has already
 * supplied explicit limits in DATABASE_URL.
 */
export function databaseUrlWithBoundedPool() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required")
  }

  const url = new URL(databaseUrl)
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5")
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "10")
  return url.toString()
}
