import { describe, expect, it } from "vitest";
import { assertScopeChangeContract } from "@gyenbox/db";

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
});
