import { createHash } from "node:crypto";
import { fail, ok } from "@/lib/api-response";
import { ensureUserRecord, fileToItem, getActiveStorageUsed } from "@/lib/file-records";
import { createStorageKey, uploadObject } from "@/lib/storage";
import { getPrisma } from "@/lib/prisma";
import { requireActor } from "@/lib/ownership";
import { getBearerToken } from "@/lib/supabase-server";
import {
  getCurrentMembershipEntitlements,
  MembershipRequiredError,
  provisionFreeMembership,
} from "@/lib/membership";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await requireActor(request);
  if (!actor.ok) return actor.response;

  const formData = await request.formData().catch(() => null);
  const uploaded = formData?.get("file");
  if (!(uploaded instanceof File)) {
    return fail(
      "VALIDATION_ERROR",
      "Upload requires a multipart file field named file.",
      422,
    );
  }

  const entitlementResult = await readUploadEntitlements(request, actor);
  if (entitlementResult.response) return entitlementResult.response;

  const entitlements = entitlementResult.entitlements;
  if (entitlements && entitlements.features.web_upload === false) {
    return fail(
      "PLAN_RESTRICTED",
      "Your current GyenBox plan cannot upload files.",
      403,
    );
  }

  const configuredMaxUploadBytes = Number(
    process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024 * 1024,
  );
  const maxUploadBytes =
    entitlements?.maxFileSizeBytes && entitlements.maxFileSizeBytes > 0
      ? entitlements.maxFileSizeBytes
      : configuredMaxUploadBytes;
  if (uploaded.size > maxUploadBytes) {
    return fail(
      "QUOTA_EXCEEDED",
      "File is larger than your current plan allows.",
      413,
    );
  }

  const folderValue = formData?.get("folderId");
  const fileIdValue = formData?.get("fileId");
  const parentId =
    typeof folderValue === "string" && folderValue && folderValue !== "root"
      ? folderValue
      : null;
  const fileId =
    typeof fileIdValue === "string" && fileIdValue ? fileIdValue : null;
  const contentType = uploaded.type || "application/octet-stream";
  const buffer = Buffer.from(await uploaded.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const storageKey = createStorageKey(actor.actorId, uploaded.name);

  try {
    const prisma = getPrisma();
    const user = await ensureUserRecord(actor);
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

    const storageQuota = entitlements
      ? BigInt(entitlements.storageQuotaBytes)
      : user.storageQuota;
    const activeStorageUsed = await getActiveStorageUsed(actor.actorId);
    const projectedStorage =
      activeStorageUsed - (currentFile?.size ?? BigInt(0)) + BigInt(uploaded.size);
    if (projectedStorage > storageQuota) {
      return fail(
        "QUOTA_EXCEEDED",
        "This upload would exceed your GyenBox plan storage.",
        413,
      );
    }

    await uploadObject({
      key: storageKey,
      body: buffer,
      contentType,
      metadata: {
        owner: actor.actorId,
        checksum,
      },
    });

    const file = await prisma.$transaction(async (tx) => {
      if (currentFile) {
        const versionNumber =
          (await tx.fileVersion.count({ where: { fileId: currentFile.id } })) +
          1;
        const updated = await tx.file.update({
          where: { id: currentFile.id },
          data: {
            name: uploaded.name,
            mimeType: contentType,
            size: BigInt(uploaded.size),
            storageKey,
            checksum,
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
            storageKey,
            size: BigInt(uploaded.size),
            checksum,
            createdById: actor.actorId,
          },
        });
        await tx.user.update({
          where: { id: actor.actorId },
          data: {
            storageUsed: {
              increment: BigInt(uploaded.size) - currentFile.size,
            },
          },
        });
        return updated;
      }

      const created = await tx.file.create({
        data: {
          name: uploaded.name,
          mimeType: contentType,
          size: BigInt(uploaded.size),
          storageKey,
          checksum,
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
          storageKey,
          size: BigInt(uploaded.size),
          checksum,
          createdById: actor.actorId,
        },
      });
      await tx.user.update({
        where: { id: actor.actorId },
        data: { storageUsed: { increment: BigInt(uploaded.size) } },
      });
      return created;
    });

    return ok({ file: fileToItem(file) }, 201);
  } catch (error) {
    return fail("UPLOAD_FAILED", "Could not store this file yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown upload error",
    });
  }
}
async function readUploadEntitlements(
  request: Request,
  actor: {
    actorId: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  },
) {
  const accessToken = getBearerToken(request);
  if (!accessToken) return { entitlements: null, response: null };

  try {
    return {
      entitlements: await getCurrentMembershipEntitlements(accessToken),
      response: null,
    };
  } catch (error) {
    if (error instanceof MembershipRequiredError) {
      try {
        await provisionFreeMembership(actor, accessToken);
        return {
          entitlements: await getCurrentMembershipEntitlements(accessToken),
          response: null,
        };
      } catch (provisionError) {
        return {
          entitlements: null,
          response: fail(
            "MEMBERSHIP_PROVISION_FAILED",
            "Could not activate GyenBox Free before uploading.",
            503,
            {
              message:
                provisionError instanceof Error
                  ? provisionError.message
                  : "Unknown membership error",
            },
          ),
        };
      }
    }

    return {
      entitlements: null,
      response: fail(
        "MEMBERSHIP_UNAVAILABLE",
        "Membership is not ready yet.",
        503,
        {
          message:
            error instanceof Error ? error.message : "Unknown membership error",
        },
      ),
    };
  }
}
