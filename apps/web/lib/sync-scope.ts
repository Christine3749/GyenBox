import { userScope, workspaceScope, type ScopeRef } from "@gyenbox/db"
import type { ActorContext } from "@/lib/ownership"
import { getPrisma } from "@/lib/prisma"

const WORKSPACE_ID = /^[A-Za-z0-9_-]{8,160}$/

export type ResolvedSyncScope =
  | { ok: true; scope: ScopeRef }
  | { ok: false; reason: "INVALID_WORKSPACE" | "FORBIDDEN" }

// Scope selection is deliberately centralized. A caller never gets to turn an
// arbitrary workspace ID into a stream until membership has been proven.
export async function resolveSyncScope(
  actor: ActorContext,
  requestedWorkspaceId: string | null,
): Promise<ResolvedSyncScope> {
  if (!requestedWorkspaceId) return { ok: true, scope: userScope(actor.actorId) }
  if (!WORKSPACE_ID.test(requestedWorkspaceId)) return { ok: false, reason: "INVALID_WORKSPACE" }

  const membership = await getPrisma().workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: requestedWorkspaceId,
        userId: actor.actorId,
      },
    },
    select: { id: true },
  })
  if (!membership) return { ok: false, reason: "FORBIDDEN" }
  return { ok: true, scope: workspaceScope(requestedWorkspaceId) }
}
