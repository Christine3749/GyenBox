import { Storage } from "@google-cloud/storage"
import { nanoid } from "nanoid"

type UploadObjectInput = {
  key: string
  body: Buffer
  contentType: string
  metadata?: Record<string, string>
}

type SignedUploadInput = {
  key: string
  contentType: string
  metadata?: Record<string, string>
  expiresInSeconds?: number
}

type SignedDownloadInput = {
  key: string
  filename: string
  contentType?: string | null
  expiresInSeconds?: number
}

const globalForGcs = globalThis as unknown as {
  gyenboxGcs?: Storage
}

function getGcsCredentials() {
  const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!rawCredentials) return undefined

  try {
    return JSON.parse(rawCredentials) as {
      client_email?: string
      private_key?: string
      project_id?: string
    }
  } catch {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON")
  }
}

export function getStorageClient() {
  if (!globalForGcs.gyenboxGcs) {
    const credentials = getGcsCredentials()
    globalForGcs.gyenboxGcs = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || credentials?.project_id,
      credentials,
    })
  }

  return globalForGcs.gyenboxGcs
}

export function getGcsBucketName() {
  const bucket = process.env.GCS_BUCKET ?? process.env.GCS_BUCKET_NAME
  if (!bucket) {
    throw new Error("GCS_BUCKET or GCS_BUCKET_NAME is not configured")
  }

  return bucket
}

export function createStorageKey(userId: string, filename: string) {
  const safeName = filename.replace(/[^\w.\-]+/g, "_")
  return `users/${userId}/${new Date().toISOString().slice(0, 10)}/${nanoid(18)}-${safeName}`
}

export async function createSignedUploadUrl(input: SignedUploadInput) {
  const bucket = getStorageClient().bucket(getGcsBucketName())
  const file = bucket.file(input.key)
  const expiresIn = input.expiresInSeconds ?? 900
  const extensionHeaders = Object.fromEntries(Object.entries(input.metadata ?? {}).map(([key, value]) => [`x-goog-meta-${key.toLowerCase()}`, value]))
  const contentType = input.contentType || "application/octet-stream"

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + expiresIn * 1000,
    contentType,
    extensionHeaders,
  })

  return {
    bucket: bucket.name,
    key: input.key,
    url,
    method: "PUT" as const,
    headers: {
      "Content-Type": contentType,
      ...extensionHeaders,
    },
    expiresIn,
  }
}

export async function createSignedDownloadUrl(input: SignedDownloadInput) {
  const bucket = getStorageClient().bucket(getGcsBucketName())
  const file = bucket.file(input.key)
  const expiresIn = input.expiresInSeconds ?? 300
  const contentType = input.contentType || "application/octet-stream"

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiresIn * 1000,
    responseDisposition: attachmentDisposition(input.filename),
    responseType: contentType,
  })

  return {
    bucket: bucket.name,
    key: input.key,
    url,
    method: "GET" as const,
    expiresIn,
  }
}

function attachmentDisposition(filename: string) {
  const trimmed = filename.trim() || "gyenbox-file"
  const fallback = trimmed
    .replace(/[\r\n"\\]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim() || "gyenbox-file"
  const encoded = encodeURIComponent(trimmed).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

export async function getObjectMetadata(storageKey: string) {
  const bucket = getStorageClient().bucket(getGcsBucketName())
  const [metadata] = await bucket.file(storageKey).getMetadata()
  const customMetadata = metadata.metadata as Record<string, unknown> | undefined

  return {
    bucket: bucket.name,
    key: storageKey,
    size: BigInt(String(metadata.size ?? "0")),
    contentType: typeof metadata.contentType === "string" ? metadata.contentType : null,
    metadata: Object.fromEntries(Object.entries(customMetadata ?? {}).map(([key, value]) => [key, String(value)])),
  }
}

export async function uploadObject(input: UploadObjectInput) {
  const bucket = getStorageClient().bucket(getGcsBucketName())
  const file = bucket.file(input.key)

  await file.save(input.body, {
    resumable: input.body.byteLength > 8 * 1024 * 1024,
    contentType: input.contentType,
    metadata: {
      metadata: input.metadata,
    },
  })

  return {
    bucket: bucket.name,
    key: input.key,
  }
}
