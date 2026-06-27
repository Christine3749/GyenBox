import { fail, ok } from "@/lib/api-response";
import { ensureUserRecord, fileToItem } from "@/lib/file-records";
import { getObjectMetadata } from "@/lib/gcs";
import { requireActor } from "@/lib/ownership";
import { getPrisma } from "@/lib/prisma";
import {
  getMaxUploadBytes,
  getStorageQuotaBytes,
  normalizeUploadParentId,
  planAllowsUploads,
  readUploadEntitlements,
} from "@/lib/upload-policy";
import { uploadCompleteSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await requireActor(request);
  if (!actor.ok) return actor.response;

  const body = await request.json().catch(() => null);
  const parsed = uploadCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "Invalid upload completion payload.",
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
  if (!input.storageKey.startsWith(`users/${actor.actorId}/`)) {
    return fail(
      "FORBIDDEN",
      "This upload does not belong to the signed-in user.",
      403,
    );
  }

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
    const object = await getObjectMetadata(input.storageKey);

    if (object.size !== BigInt(input.size)) {
      return fail(
        "UPLOAD_MISMATCH",
        "Uploaded object size does not match the reservation.",
        409,
        {
          expected: input.size,
          actual: Number(object.size),
        },
      );
    }

    if (object.metadata.owner && object.metadata.owner !== actor.actorId) {
      return fail(
        "FORBIDDEN",
        "Uploaded object owner metadata does not match the signed-in user.",
        403,
      );
    }

    if (
      object.metadata.checksum &&
      object.metadata.checksum !== input.checksum
    ) {
      return fail(
        "UPLOAD_MISMATCH",
        "Uploaded object checksum metadata does not match the completion payload.",
        409,
      );
    }

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

    const file = await prisma.$transaction(async (tx) => {
      if (currentFile) {
        const versionNumber =
          (await tx.fileVersion.count({ where: { fileId: currentFile.id } })) +
          1;
        const updated = await tx.file.update({
          where: { id: currentFile.id },
          data: {
            name: input.name,
            mimeType: input.mimeType,
            size: BigInt(input.size),
            storageKey: input.storageKey,
            checksum: input.checksum,
            parentId,
          },
          include: {
            owner: { select: { email: true, name: true, avatarUrl: true } },
            _count: { select: { shares: true } },
          },
        });

        await tx.fileVersion.create({
          data: {
            fileId: currentFile.id,
            versionNumber,
            storageKey: input.storageKey,
            size: BigInt(input.size),
            checksum: input.checksum,
            createdById: actor.actorId,
          },
        });
        await tx.user.update({
          where: { id: actor.actorId },
          data: {
            storageUsed: { increment: BigInt(input.size) - currentFile.size },
          },
        });
        return updated;
      }

      const created = await tx.file.create({
        data: {
          name: input.name,
          mimeType: input.mimeType,
          size: BigInt(input.size),
          storageKey: input.storageKey,
          checksum: input.checksum,
          parentId,
          ownerId: actor.actorId,
        },
        include: {
          owner: { select: { email: true, name: true, avatarUrl: true } },
          _count: { select: { shares: true } },
        },
      });

      await tx.fileVersion.create({
        data: {
          fileId: created.id,
          versionNumber: 1,
          storageKey: input.storageKey,
          size: BigInt(input.size),
          checksum: input.checksum,
          createdById: actor.actorId,
        },
      });
      await tx.user.update({
        where: { id: actor.actorId },
        data: { storageUsed: { increment: BigInt(input.size) } },
      });
      return created;
    });

    return ok({ file: fileToItem(file) }, currentFile ? 200 : 201);
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "code" in error
        ? Number(error.code)
        : null;
    if (statusCode === 404) {
      return fail(
        "UPLOAD_NOT_FOUND",
        "Uploaded object is not available in storage.",
        404,
      );
    }

    return fail(
      "UPLOAD_COMPLETE_FAILED",
      "Could not complete this upload yet.",
      503,
      {
        message:
          error instanceof Error ? error.message : "Unknown completion error",
      },
    );
  }
}
