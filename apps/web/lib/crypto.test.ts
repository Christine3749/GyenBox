import { describe, expect, it } from "vitest"
import { buildPostgresSearchQuery } from "./search"

describe("buildPostgresSearchQuery", () => {
  it("normalizes whitespace and strips punctuation", () => {
    expect(buildPostgresSearchQuery({ q: " board-pack   final! " })).toBe("board-pack & final")
  })
})
