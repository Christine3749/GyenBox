import { fail } from "@/lib/api-response";
import {
  getCurrentMembershipEntitlements,
  MembershipRequiredError,
  provisionFreeMembership,
} from "@/lib/membership";
import type { ActorContext } from "@/lib/ownership";
import { getBearerToken } from "@/lib/supabase-server";

export type UploadEntitlements = Awaited<
  ReturnType<typeof getCurrentMembershipEntitlements>
>;

export async function readUploadEntitlements(
  request: Request,
  actor?: ActorContext,
) {
  const accessToken = getBearerToken(request);
  if (!accessToken)
    return { entitlements: null as UploadEntitlements | null, response: null };

  try {
    return {
      entitlements: await getCurrentMembershipEntitlements(accessToken),
      response: null,
    };
  } catch (error) {
    if (error instanceof MembershipRequiredError) {
      if (actor) {
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
          "MEMBERSHIP_REQUIRED",
          "Activate a GyenBox membership before uploading.",
          403,
        ),
      };
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

export function planAllowsUploads(entitlements: UploadEntitlements | null) {
  return entitlements?.features.web_upload !== false;
}

export function getMaxUploadBytes(entitlements: UploadEntitlements | null) {
  const configuredMaxUploadBytes = Number(
    process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024 * 1024,
  );
  return entitlements?.maxFileSizeBytes && entitlements.maxFileSizeBytes > 0
    ? entitlements.maxFileSizeBytes
    : configuredMaxUploadBytes;
}

export function getStorageQuotaBytes(
  userStorageQuota: bigint,
  entitlements: UploadEntitlements | null,
) {
  return entitlements
    ? BigInt(entitlements.storageQuotaBytes)
    : userStorageQuota;
}

export function normalizeUploadParentId(folderId?: string | null) {
  return folderId && folderId !== "root" ? folderId : null;
}
