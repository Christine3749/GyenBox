export type SyncState = "idle" | "paused" | "needs-auth" | "syncing" | "error"

export type DesktopSettings = {
  apiBaseUrl: string
  accessToken: string
  syncFolder: string
  paused: boolean
}

export type SyncSummary = {
  state: SyncState
  syncFolder: string
  apiBaseUrl: string
  accessTokenConfigured: boolean
  paused: boolean
  queued: number
  syncing: number
  uploaded: number
  failed: number
  skipped: number
  totalBytes: number
  lastMessage: string
  updatedAt: string
}

export type SyncActivity = {
  id: number
  type: "info" | "queued" | "syncing" | "uploaded" | "failed" | "deleted" | "skipped"
  path: string
  message: string
  createdAt: string
}

export type DesktopSnapshot = {
  settings: DesktopSettings
  summary: SyncSummary
  activity: SyncActivity[]
}
