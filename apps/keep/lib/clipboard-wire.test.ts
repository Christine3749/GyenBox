import { describe, expect, it } from "vitest"
import { wireChanges, wireChangesV4, wireSnapshot, wireSnapshotV4 } from "./clipboard-wire"

function decode(envelope: string) {
  return Buffer.from(envelope, "base64").toString("utf8")
}

const textEntry = {
  kind: "text" as const,
  id: "text-01",
  sequence: "42",
  capturedAt: 1_700_000_000_000,
  text: "A tab\tand unicode: \u4f60\u597d",
  originDeviceId: "device_alpha",
}

const imageEntry = {
  kind: "image" as const,
  id: "image-01",
  sequence: "43",
  capturedAt: 1_700_000_000_100,
  mimeType: "image/png" as const,
  sizeBytes: 2048,
  sha256: "abc123",
  originDeviceId: "device_beta",
}

describe("clipboard wire envelopes", () => {
  it("keeps the released v3 snapshot byte-compatible", () => {
    expect(decode(wireSnapshot([textEntry, imageEntry]))).toBe(
      "T\t42\ttext-01\t1700000000000\tQSB0YWIJYW5kIHVuaWNvZGU6IOS9oOWlvQ==\nI\t43\timage-01\t1700000000100\timage/png\t2048\tabc123",
    )
  })

  it("emits v3 change rows without device metadata for existing clients", () => {
    expect(
      decode(
        wireChanges([
          { kind: "ADD", entry: textEntry },
          { kind: "DELETE", id: "text-00", sequence: "41", originDeviceId: "device_legacy" },
        ]),
      ),
    ).toBe("T\t42\ttext-01\t1700000000000\tQSB0YWIJYW5kIHVuaWNvZGU6IOS9oOWlvQ==\nD\t41\ttext-00")
  })

  it("adds the opaque origin ID only in opt-in v4 envelopes", () => {
    expect(decode(wireSnapshotV4([textEntry, imageEntry]))).toBe(
      "T\t42\ttext-01\t1700000000000\tQSB0YWIJYW5kIHVuaWNvZGU6IOS9oOWlvQ==\tdevice_alpha\nI\t43\timage-01\t1700000000100\timage/png\t2048\tabc123\tdevice_beta",
    )
    expect(
      decode(
        wireChangesV4([
          { kind: "ADD", entry: textEntry },
          { kind: "DELETE", id: "text-00", sequence: "41", originDeviceId: "device_legacy" },
        ]),
      ),
    ).toBe("T\t42\ttext-01\t1700000000000\tQSB0YWIJYW5kIHVuaWNvZGU6IOS9oOWlvQ==\tdevice_alpha\nD\t41\ttext-00\tdevice_legacy")
  })
})
