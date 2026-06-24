import type { ApiEnvelope, FileItem, Permission, ResourceType } from "@gyenbox/types"

type ClientOptions = {
  baseUrl?: string
  accessToken?: string
}

type CreateShareInput = {
  resourceType: ResourceType
  resourceId: string
  permission: Permission
  expiresAt?: string
  password?: string
}

export class GyenboxClient {
  private readonly baseUrl: string
  private readonly accessToken?: string

  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? ""
    this.accessToken = options.accessToken
  }

  async listFiles(folderId?: string) {
    const params = new URLSearchParams()
    if (folderId) params.set("folderId", folderId)
    return this.request<{ files: FileItem[]; total: number; nextCursor: string | null }>(
      `/api/files?${params.toString()}`,
    )
  }

  async createFolder(name: string, parentId?: string) {
    return this.request<{ id: string; name: string }>("/api/folders", {
      method: "POST",
      body: JSON.stringify({ name, parentId }),
    })
  }

  async createShare(input: CreateShareInput) {
    return this.request<{ token: string; url: string }>("/api/shares", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
    const headers = new Headers(init.headers)
    headers.set("content-type", "application/json")
    if (this.accessToken) headers.set("authorization", `Bearer ${this.accessToken}`)

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    })

    return response.json() as Promise<ApiEnvelope<T>>
  }
}
