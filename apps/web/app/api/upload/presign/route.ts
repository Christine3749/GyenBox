import { fail, ok } from "@/lib/api-response";
import { ensureUserRecord } from "@/lib/file-records";
import { createSignedUploadUrl, createStorageKey } from "@/lib/gcs";
import { requireActor } from "@/lib/ownership";
import { getPrisma } from "@/lib/prisma";
import {
  getMaxUploadBytes,
  getStorageQuotaBytes,
  normalizeUploadParentId,
  planAllowsUploads,
  readUploadEntitlements,
} from "@/lib/upload-policy";
import { uploadReservationSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await requireActor(request);
  if (!actor.ok) return actor.response;

  const body = await request.json().catch(() => null);
  const parsed = uploadReservationSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "Invalid presign payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const entitlementResult = await readUploadEntitlements(request, actor);
  if (entitlementResult.response) return entitlementResult.response;
  const entitlements = entitlementResult.entitlements;

  if (!planAllowsUploads(entitlements)) {
    return fail(
      "PLAN_RESTRICTED",
      "Your current GyenBox plan cannot upload files.",
      403,
    );
  }

  const input = parsed.data;
  const maxUploadBytes = getMaxUploadBytes(entitlements);
  if (input.size > maxUploadBytes) {
    return fail(
      "QUOTA_EXCEEDED",
      "File is larger than your current plan allows.",
      413,
    );
  }

  const parentId = normalizeUploadParentId(input.folderId);
  const fileId = input.fileId ?? null;

  try {
    const prisma = getPrisma();
    const user = await ensureUserRecord(actor);

    if (parentId) {
      const folder = await prisma.folder.findFirst({
        where: { id: parentId, ownerId: actor.actorId, isTrashed: false },
        select: { id: true },
      });
      if (!folder)
        return fail("FORBIDDEN", "You do not have access to this folder.", 403);
    }

    const currentFile = fileId
      ? await prisma.file.findFirst({
          where: { id: fileId, ownerId: actor.actorId, isTrashed: false },
          select: { id: true, size: true },
        })
      : null;

    if (fileId && !currentFile) {
      return fail(
        "FORBIDDEN",
        "You do not have access to update this file.",
        403,
      );
    }

    const storageQuota = getStorageQuotaBytes(user.storageQuota, entitlements);
    const projectedStorage =
      user.storageUsed - (currentFile?.size ?? BigInt(0)) + BigInt(input.size);
    if (projectedStorage > storageQuota) {
      return fail(
        "QUOTA_EXCEEDED",
        "This upload would exceed your GyenBox plan storage.",
        413,
      );
    }

    const storageKey = createStorageKey(actor.actorId, input.name);
    const signedUpload = await createSignedUploadUrl({
      key: storageKey,
      contentType: input.mimeType,
      metadata: {
        owner: actor.actorId,
        checksum: input.checksum,
      },
      expiresInSeconds: 900,
    });

    return ok({
      uploadId: crypto.randomUUID(),
      fileId: currentFile?.id ?? null,
      bucket: signedUpload.bucket,
      storageKey: signedUpload.key,
      uploadUrl: signedUpload.url,
      method: signedUpload.method,
      headers: signedUpload.headers,
      expiresIn: signedUpload.expiresIn,
    });
  } catch (error) {
    return fail("PRESIGN_FAILED", "Could not reserve this upload yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown presign error",
    });
  }
}
