import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { nanoid } from "nanoid"

type PresignInput = {
  userId: string
  filename: string
  mimeType: string
  checksum: string
}

const globalForS3 = globalThis as unknown as {
  gyenboxS3?: S3Client
}

export function getS3Client() {
  if (!globalForS3.gyenboxS3) {
    globalForS3.gyenboxS3 = new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials:
        process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY,
              secretAccessKey: process.env.S3_SECRET_KEY,
            }
          : undefined,
    })
  }

  return globalForS3.gyenboxS3
}

export function getBucketName() {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured")
  }
  return bucket
}

export function createStorageKey(userId: string, filename: string) {
  const safeName = filename.replace(/[^\w.\-]+/g, "_")
  return `users/${userId}/${new Date().toISOString().slice(0, 10)}/${nanoid(18)}-${safeName}`
}

export async function createPresignedUpload(input: PresignInput) {
  const storageKey = createStorageKey(input.userId, input.filename)
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
    ContentType: input.mimeType,
    ChecksumSHA256: input.checksum,
    Metadata: {
      owner: input.userId,
    },
  })

  return {
    storageKey,
    uploadUrl: await getSignedUrl(getS3Client(), command, { expiresIn: 60 * 10 }),
  }
}
