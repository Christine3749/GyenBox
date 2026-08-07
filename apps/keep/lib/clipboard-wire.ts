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
