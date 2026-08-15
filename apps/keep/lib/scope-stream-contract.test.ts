import { describe, expect, it } from "vitest";
import { assertScopeChangeContract, listScopeChanges, userScope } from "@gyenbox/db";

describe("Core scope-stream contracts", () => {
  it("allows SafeAuth to announce an encrypted vault without exposing its contents", () => {
    expect(() =>
      assertScopeChangeContract({
        source: "safeauth",
        entityType: "encrypted-vault",
        entityId: "vault_20260812",
        action: "UPSERT",
      }),
    ).not.toThrow();
  });

  it("rejects sensitive SafeAuth payload categories", () => {
    expect(() =>
      assertScopeChangeContract({
        source: "safeauth",
        entityType: "password",
        entityId: "credential_123",
        action: "UPSERT",
      }),
    ).toThrow("Unsupported safeauth sync entity");
  });

  it("requires opaque entity identifiers", () => {
    expect(() =>
      assertScopeChangeContract({
        source: "keep",
        entityType: "note",
        entityId: "note/contains/a/path",
        action: "UPSERT",
      }),
    ).toThrow("opaque identifier");
  });

  it("does not advance an idle cursor beyond events it actually read", async () => {
    const client = {
      scopeChange: {
        findMany: async () => [],
      },
    };

    await expect(listScopeChanges(client as never, userScope("owner_123"), 41n)).resolves.toMatchObject({
      cursor: "41",
      hasMore: false,
      changes: [],
    });
  });

  it("returns a page cursor at the final delivered event", async () => {
    const client = {
      scopeChange: {
        findMany: async () => [
          { sequence: 42n, source: "gyenbox", entityType: "file", entityId: "file_42", action: "UPSERT" },
          { sequence: 43n, source: "keep", entityType: "note", entityId: "note_43", action: "UPSERT" },
          { sequence: 44n, source: "keep", entityType: "note", entityId: "note_44", action: "UPSERT" },
        ],
      },
    };

    await expect(listScopeChanges(client as never, userScope("owner_123"), 41n, 2)).resolves.toMatchObject({
      cursor: "43",
      hasMore: true,
      changes: [
        { sequence: "42", source: "gyenbox" },
        { sequence: "43", source: "keep" },
      ],
    });
  });
});
