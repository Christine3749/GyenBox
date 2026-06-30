# GyenBox Storage Commercialization Roadmap

> Goal: keep GCS as the optimized global storage path while making the GyenBox upload/download chain commercial-grade, provider-aware, and ready for a future China region.

## Current Direction

GyenBox uses Google Cloud Storage as the primary object store. The product should not expose provider details to clients as a permanent contract. Clients talk to GyenBox APIs; GyenBox decides whether the object path is direct GCS, a relay, or a future S3-compatible provider.

The current production-grade upload contract is:

```text
client -> POST /api/upload/presign
client -> PUT signed object URL
client -> POST /api/upload/complete
```

As of 2026-06-30, Web workspace uploads use this contract instead of the legacy multipart `/api/upload` route. Desktop already used the same presign/direct-upload/complete shape.

## Implemented Now

- Web upload no longer sends file bytes through the Next.js API process.
- Web computes SHA-256 in browser chunks before upload, avoiding one full-file `arrayBuffer()` allocation.
- Web uploads the file body directly to the signed GCS URL.
- Web completes metadata through `/api/upload/complete` after the object upload succeeds.
- Server API routes now import storage operations through `apps/web/lib/storage.ts`, with GCS as the active provider.
- `/api/upload/presign` returns `storageProvider: "gcs"` so clients and diagnostics can see the active storage backend.
- `/api/files` upload discovery now advertises `signed-url` with presign and complete endpoints instead of multipart form upload.

## Provider Boundary

The first provider boundary is intentionally thin:

```text
apps/web/lib/storage.ts
  active provider: gcs
  createStorageKey()
  createSignedUploadUrl()
  createSignedDownloadUrl()
  getObjectMetadata()
  uploadObject()
```

GCS remains the first-class path. S3-compatible storage should be added as a separate adapter only when there is a real migration, China region, or enterprise requirement.

Future metadata fields should be added before multi-provider production rollout:

| Field | Purpose |
|---|---|
| `storageProvider` | `gcs`, `s3-compatible`, `minio-cn`, etc. |
| `bucket` | Bucket or logical container at object creation time. |
| `region` | Data residency and routing decision. |
| `storageKey` | Provider-local object key. |
| `storageClass` | Optional cost/performance tier. |

Do not infer these forever from environment variables. Persist them once multi-region/provider support begins.

## Deployment Notes

Web direct upload requires the GCS bucket CORS policy to allow the GyenBox web origin, `PUT`, and the signed headers returned by `/api/upload/presign`, including `Content-Type`, `x-goog-meta-owner`, and `x-goog-meta-checksum`. If CORS is missing, the browser upload will fail before the object reaches GCS even though the signed URL is valid.

## Next: Resumable Upload
The remaining commercial gap is resumability. Single signed PUT is acceptable for early 5 GB testing, but commercial users need recovery from network drops, sleep/wake, tab close, and transient GCS failures.

Target contract:

```text
client -> POST /api/upload/session
client -> upload chunks or provider resumable session
client -> POST /api/upload/complete
client -> background retry until committed or cancelled
```

Required behavior:

- Persist upload tasks locally on Desktop and in browser storage for Web.
- Store `fileId`, `storageKey`, size, checksum, provider, session URL/chunk state, and last confirmed offset.
- Retry transient failures without creating duplicate file records.
- Re-request an upload session when a signed URL/session expires.
- Complete metadata only after provider confirms the full object exists and size matches.
- Surface clear states: preparing, reserving, uploading, retrying, finishing, complete, failed, cancelled.

## China Region Path

Do not route mainland China clients directly to `storage.googleapis.com` as a hard dependency. Keep the client contract on GyenBox-owned domains.

Recommended rollout:

1. Keep GCS as global primary storage.
2. Add provider-aware routing at the API layer.
3. Add download/upload relay or acceleration paths for mainland networks if needed.
4. If China commercialization becomes real, deploy a separate China region using an S3-compatible provider such as MinIO on owned infrastructure.
5. Keep China-region metadata, objects, logs, and backups isolated unless the user explicitly chooses cross-region transfer.

## Legacy Multipart Route

`POST /api/upload` still exists for compatibility, but it reads files into API memory and should not be used by primary clients. Treat it as deprecated.

Removal criteria:

- Web workspace no longer uses it.
- Desktop does not use it.
- Android uses presign/session upload from the start.
- Any old tests or demos are updated to the signed upload contract.
