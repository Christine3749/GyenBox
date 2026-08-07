import { Storage } from "@google-cloud/storage"

const globalForGcs = globalThis as unknown as { gyenboxKeepGcs?: Storage }

function credentials() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as { project_id?: string; client_email?: string; private_key?: string }
  } catch {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON")
  }
}

function storage() {
  if (!globalForGcs.gyenboxKeepGcs) {
    const parsed = credentials()
    globalForGcs.gyenboxKeepGcs = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || parsed?.project_id,
      credentials: parsed,
    })
  }
  return globalForGcs.gyenboxKeepGcs
}

function bucketName() {
  const value = process.env.GCS_BUCKET || process.env.GCS_BUCKET_NAME
  if (!value) throw new Error("GCS_BUCKET is not configured")
  return value
}

export async function saveClipboardImage(key: string, body: Buffer, contentType: "image/png", sha256: string) {
  await storage().bucket(bucketName()).file(key).save(body, {
    resumable: body.byteLength > 8 * 1024 * 1024,
    contentType,
    metadata: { metadata: { sha256 } },
  })
}

export async function loadClipboardImage(key: string) {
  const [body] = await storage().bucket(bucketName()).file(key).download()
  return body
}
