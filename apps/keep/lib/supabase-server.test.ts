import { describe, expect, it } from "vitest"
import { actorFromVerifiedClaims } from "./supabase-server"

describe("actorFromVerifiedClaims", () => {
  it("uses only verified JWT identity fields", () => {
    expect(actorFromVerifiedClaims({
      sub: "7c9d6c39-6000-4000-a000-000000000001",
      email: "ethan@example.com",
      user_metadata: { full_name: "Ethan", avatar_url: "https://example.com/avatar.png" },
    })).toMatchObject({
      actorId: "7c9d6c39-6000-4000-a000-000000000001",
      email: "ethan@example.com",
      name: "Ethan",
      avatarUrl: "https://example.com/avatar.png",
    })
  })

  it("rejects a verified token payload without a subject", () => {
    expect(actorFromVerifiedClaims({ email: "ethan@example.com" })).toBeNull()
  })
})
