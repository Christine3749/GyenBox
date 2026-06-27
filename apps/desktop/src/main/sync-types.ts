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

export type UploadReservationResponse = {
  ok?: boolean
  data?: {
    uploadId?: string
    fileId?: string | null
    bucket?: string
    storageKey?: string
    uploadUrl?: string
    method?: "PUT"
    headers?: Record<string, string>
    expiresIn?: number
  }
  error?: { message?: string }
}

export type UploadCompleteResponse = {
  ok?: boolean
  data?: { file?: { id?: string; name?: string } }
  error?: { message?: string }
}
