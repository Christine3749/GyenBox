import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export type SignedUploadInput = {
  key: string
  contentType: string
  metadata?: Record<string, string>
  expiresInSeconds?: number
}

export type SignedDownloadInput = {
  key: string
  filename: string
  contentType?: string | null
  expiresInSeconds?: number
  disposition?: "inline" | "attachment"
  cacheControl?: string
  bucket?: string
}

export type UploadObjectInput = {
  key: string
  body: Buffer
  contentType: string
  metadata?: Record<string, string>
}

// GyenBox storage now uses R2 exclusively; an unset or stale provider value
// must never route file operations back to Google Cloud Storage.
export function getStorageProvider(): "r2" {
  return "r2"
}

let client: S3Client | undefined

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export function getR2Client() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT || `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
      // Browser PUT requests supply the signed metadata headers themselves.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    })
  }
  return client
}

export function getR2BucketName() {
  return required("R2_BUCKET")
}

export function isObjectMissing(error: unknown) {
  if (!error || typeof error !== "object") return false
  const storageError = error as { name?: string; code?: unknown; $metadata?: { httpStatusCode?: number } }
  if (storageError.name === "NoSuchBucket") return false
  return storageError.$metadata?.httpStatusCode === 404 || storageError.code === 404 ||
    storageError.name === "NoSuchKey" || storageError.name === "NotFound"
}

export async function createSignedUploadUrl(input: SignedUploadInput) {
  const bucket = getR2BucketName()
  const expiresIn = input.expiresInSeconds ?? 900
  const contentType = input.contentType || "application/octet-stream"
  const metadata = Object.fromEntries(Object.entries(input.metadata ?? {}).map(([key, value]) => [key.toLowerCase(), value]))
  const metadataHeaders = Object.fromEntries(Object.entries(metadata).map(([key, value]) => [`x-amz-meta-${key}`, value]))
  const url = await getSignedUrl(getR2Client(), new PutObjectCommand({
    Bucket: bucket, Key: input.key, ContentType: contentType, Metadata: metadata,
  }), {
    expiresIn,
    signableHeaders: new Set(["content-type"]),
    unhoistableHeaders: new Set(Object.keys(metadataHeaders)),
  })
  return { bucket, key: input.key, url, method: "PUT" as const, headers: { "Content-Type": contentType, ...metadataHeaders }, expiresIn }
}

function attachmentDisposition(filename: string, disposition: "inline" | "attachment" = "attachment") {
  const trimmed = filename.trim() || "gyenbox-file"
  const fallback = trimmed.replace(/[\r\n"\\]/g, "").replace(/[^\x20-\x7E]/g, "_").trim() || "gyenbox-file"
  const encoded = encodeURIComponent(trimmed).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

export async function createSignedDownloadUrl(input: SignedDownloadInput) {
  const bucket = input.bucket || getR2BucketName()
  const expiresIn = input.expiresInSeconds ?? 300
  const url = await getSignedUrl(getR2Client(), new GetObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ResponseContentType: input.contentType || "application/octet-stream",
    ResponseContentDisposition: attachmentDisposition(input.filename, input.disposition),
    ...(input.cacheControl ? { ResponseCacheControl: input.cacheControl } : {}),
  }), { expiresIn })
  return { bucket, key: input.key, url, method: "GET" as const, expiresIn }
}

export async function getObjectMetadata(key: string, bucket = getR2BucketName()) {
  try {
    const object = await getR2Client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return { bucket, key, size: BigInt(object.ContentLength ?? 0), contentType: object.ContentType ?? null, metadata: object.Metadata ?? {} }
  } catch (error) {
    // Preserve the upload-completion API's existing missing-object response.
    if (isObjectMissing(error) && error instanceof Error) Object.assign(error, { code: 404 })
    throw error
  }
}

export async function uploadObject(input: UploadObjectInput) {
  const bucket = getR2BucketName()
  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket, Key: input.key, Body: input.body, ContentType: input.contentType, Metadata: input.metadata,
  }))
  return { bucket, key: input.key }
}

export async function loadObject(key: string, bucket = getR2BucketName()) {
  const object = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  if (!object.Body) throw new Error("R2 returned an empty response body")
  return Buffer.from(await object.Body.transformToByteArray())
}
