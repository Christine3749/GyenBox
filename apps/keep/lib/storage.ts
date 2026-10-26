import { createSignedDownloadUrl, loadObject, uploadObject } from "@gyenbox/storage"

export async function saveClipboardImage(key: string, body: Buffer, contentType: "image/png", sha256: string) {
  return saveKeepObject(key, body, contentType, sha256)
}

export async function saveKeepObject(key: string, body: Buffer, contentType: string, sha256: string) {
  await uploadObject({ key, body, contentType, metadata: { sha256 } })
}

export async function loadClipboardImage(key: string) {
  return loadObject(key)
}

export async function directKeepDownload(key: string, contentType: string, filename: string,
  disposition: "inline" | "attachment" = "inline") {
  const signed = await createSignedDownloadUrl({ key, filename, contentType, disposition,
    expiresInSeconds: 900, cacheControl: "private, max-age=3600" })
  return new Response(null, { status: 302, headers: { Location: signed.url,
    "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" } })
}
