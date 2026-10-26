import * as r2 from "@gyenbox/storage"
import { nanoid } from "nanoid"

export const getStorageProvider = r2.getStorageProvider
export function createStorageKey(userId: string, filename: string) {
  const safeName = filename.replace(/[^\w.\-]+/g, "_")
  return `users/${userId}/${new Date().toISOString().slice(0, 10)}/${nanoid(18)}-${safeName}`
}

export function createSignedUploadUrl(input: r2.SignedUploadInput) {
  return r2.createSignedUploadUrl(input)
}

export async function createSignedDownloadUrl(input: r2.SignedDownloadInput) {
  return r2.createSignedDownloadUrl(input)
}

export function getObjectMetadata(key: string) {
  return r2.getObjectMetadata(key)
}

export function uploadObject(input: r2.UploadObjectInput) {
  return r2.uploadObject(input)
}
