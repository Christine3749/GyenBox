import { PrismaClient } from "@gyenbox/db"

const globalForPrisma = globalThis as unknown as {
  gyenboxPrisma?: PrismaClient
}

export function getPrisma() {
  if (!globalForPrisma.gyenboxPrisma) {
    globalForPrisma.gyenboxPrisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    })
  }

  return globalForPrisma.gyenboxPrisma
}
