import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

import type { FileItem } from './types'

type ApiEnvelope<T> = { ok: boolean; data?: T; error?: { message?: string } }

type UploadReservationPayload = {
  fileId: string | null
  storageKey: string
  uploadUrl: string
  method: string
  headers?: Record<string, string>
  expiresIn: number
}

type UploadCompletePayload = {
  file: FileItem
}

type UploadFileOptions = {
  file: File
  folderId?: string | null
  authHeaders?: HeadersInit
}

const HASH_CHUNK_BYTES = 8 * 1024 * 1024

export async function uploadFileDirectToStorage({ file, folderId, authHeaders }: UploadFileOptions) {
  const mimeType = file.type || 'application/octet-stream'
  const checksum = await sha256File(file)
  const reservation = await readApi<UploadReservationPayload>(
    await fetch('/api/upload/presign', {
      method: 'POST',
      credentials: 'same-origin',
      headers: jsonHeaders(authHeaders),
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        mimeType,
        checksum,
        folderId: folderId ?? null,
      }),
    }),
  )

  const uploadHeaders = new Headers(reservation.headers)
  if (!uploadHeaders.has('Content-Type')) uploadHeaders.set('Content-Type', mimeType)

  const uploadResponse = await fetch(reservation.uploadUrl, {
    method: reservation.method || 'PUT',
    headers: uploadHeaders,
    body: file,
  })

  if (!uploadResponse.ok) {
    const details = await uploadResponse.text().catch(() => '')
    throw new Error(`Object upload failed with HTTP ${uploadResponse.status}${details ? `: ${details.slice(0, 180)}` : ''}`)
  }

  const completed = await readApi<UploadCompletePayload>(
    await fetch('/api/upload/complete', {
      method: 'POST',
      credentials: 'same-origin',
      headers: jsonHeaders(authHeaders),
      body: JSON.stringify({
        fileId: reservation.fileId,
        storageKey: reservation.storageKey,
        name: file.name,
        size: file.size,
        mimeType,
        checksum,
        folderId: folderId ?? null,
      }),
    }),
  )

  return completed.file
}

async function sha256File(file: File) {
  const hash = sha256.create()
  for (let offset = 0; offset < file.size; offset += HASH_CHUNK_BYTES) {
    const chunk = new Uint8Array(await file.slice(offset, offset + HASH_CHUNK_BYTES).arrayBuffer())
    hash.update(chunk)
  }
  return bytesToHex(hash.digest())
}

function jsonHeaders(authHeaders?: HeadersInit) {
  const headers = new Headers(authHeaders)
  headers.set('Content-Type', 'application/json')
  return headers
}

async function readApi<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!response.ok || !payload?.ok || !payload.data) {
    throw new Error(payload?.error?.message ?? 'Request failed')
  }
  return payload.data
}
