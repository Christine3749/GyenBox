export type QueueReason = "created" | "changed" | "rescan" | "retry"
export type FileStatus = "queued" | "syncing" | "uploaded" | "failed" | "deleted" | "skipped"

export type LocalRecord = {
  relativePath: string
  size: number
  mtimeMs: number
  hash: string | null
  status: FileStatus
  remoteId: string | null
  lastError: string | null
}

export type UploadResponse = {
  ok?: boolean
  data?: { file?: { id?: string; name?: string } }
  error?: { message?: string }
}
