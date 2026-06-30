import {
  createSignedDownloadUrl as createGcsSignedDownloadUrl,
  createSignedUploadUrl as createGcsSignedUploadUrl,
  createStorageKey as createGcsStorageKey,
  getObjectMetadata as getGcsObjectMetadata,
  uploadObject as uploadGcsObject,
} from './gcs'

export const ACTIVE_STORAGE_PROVIDER = 'gcs' as const

export function getStorageProvider() {
  return ACTIVE_STORAGE_PROVIDER
}

export const createStorageKey = createGcsStorageKey
export const createSignedUploadUrl = createGcsSignedUploadUrl
export const createSignedDownloadUrl = createGcsSignedDownloadUrl
export const getObjectMetadata = getGcsObjectMetadata
export const uploadObject = uploadGcsObject
