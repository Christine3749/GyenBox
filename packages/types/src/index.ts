export type ResourceType = "file" | "folder"

export type FileKind =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "code"
  | "archive"
  | "other"

export type Permission = "VIEW" | "COMMENT" | "EDIT"

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST"

export type FileItem = {
  id: string
  name: string
  kind: FileKind
  mimeType?: string
  size: number
  ownerName: string
  updatedAt: string
  isStarred: boolean
  isShared: boolean
  path: string
  tags: string[]
}

export type ActivityEvent = {
  id: string
  actor: string
  action: string
  resourceName: string
  createdAt: string
}

export type StorageBucket = {
  label: string
  bytes: number
  color: string
}

export type ApiEnvelope<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: {
        code: string
        message: string
        details?: unknown
      }
    }
