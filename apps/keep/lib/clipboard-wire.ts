import type { ClipboardSequencedBlock, ClipboardSyncEvent } from "./notes-data"

export function wireSnapshot(entries: ClipboardSequencedBlock[]) {
  const lines = entries.map((entry) => {
    if (entry.kind === "image") return `I\t${entry.sequence}\t${entry.id}\t${entry.capturedAt}\t${entry.mimeType}\t${entry.sizeBytes}\t${entry.sha256}`
    return `T\t${entry.sequence}\t${entry.id}\t${entry.capturedAt}\t${Buffer.from(entry.text, "utf8").toString("base64")}`
  })
  return Buffer.from(lines.join("\n"), "utf8").toString("base64")
}

export function wireChanges(events: ClipboardSyncEvent[]) {
  const lines = events.map((event) => {
    if (event.kind === "DELETE") return `D\t${event.sequence}\t${event.id}`
    const entry = event.entry
    if (entry.kind === "image") return `I\t${entry.sequence}\t${entry.id}\t${entry.capturedAt}\t${entry.mimeType}\t${entry.sizeBytes}\t${entry.sha256}`
    return `T\t${entry.sequence}\t${entry.id}\t${entry.capturedAt}\t${Buffer.from(entry.text, "utf8").toString("base64")}`
  })
  return Buffer.from(lines.join("\n"), "utf8").toString("base64")
}

// v4 keeps v3's compact base64 envelope, but appends the opaque device ID to
// every transition. It is opt-in: the established v3 format stays byte-for-
// byte compatible for already released Windows and macOS clients.
export function wireSnapshotV4(entries: ClipboardSequencedBlock[]) {
  const lines = entries.map((entry) => {
    const origin = entry.originDeviceId ?? ""
    if (entry.kind === "image") return `I\t${entry.sequence}\t${entry.id}\t${entry.capturedAt}\t${entry.mimeType}\t${entry.sizeBytes}\t${entry.sha256}\t${origin}`
    return `T\t${entry.sequence}\t${entry.id}\t${entry.capturedAt}\t${Buffer.from(entry.text, "utf8").toString("base64")}\t${origin}`
  })
  return Buffer.from(lines.join("\n"), "utf8").toString("base64")
}

export function wireChangesV4(events: ClipboardSyncEvent[]) {
  const lines = events.map((event) => {
    const origin = event.kind === "DELETE" ? event.originDeviceId ?? "" : event.entry.originDeviceId ?? ""
    if (event.kind === "DELETE") return `D\t${event.sequence}\t${event.id}\t${origin}`
    const entry = event.entry
    if (entry.kind === "image") return `I\t${entry.sequence}\t${entry.id}\t${entry.capturedAt}\t${entry.mimeType}\t${entry.sizeBytes}\t${entry.sha256}\t${origin}`
    return `T\t${entry.sequence}\t${entry.id}\t${entry.capturedAt}\t${Buffer.from(entry.text, "utf8").toString("base64")}\t${origin}`
  })
  return Buffer.from(lines.join("\n"), "utf8").toString("base64")
}
