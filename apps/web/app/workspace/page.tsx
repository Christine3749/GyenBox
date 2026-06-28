import GyenboxWorkspace from "@/components/gyenbox/workspace"
import type { WorkspaceInitialData } from "@/components/gyenbox/types"
import { listFileItems } from "@/lib/file-records"
import { getPublicSupabaseConfig } from "@/lib/supabase-public-config"
import { getServerActor } from "@/lib/supabase-server-ssr"

export const dynamic = "force-dynamic"

export default async function WorkspacePage() {
  let initialData: WorkspaceInitialData | null = null

  const actor = await getServerActor()
  if (actor) {
    try {
      const payload = await listFileItems(actor, null)
      initialData = {
        actorId: actor.actorId,
        files: payload.files,
        storageUsedBytes: payload.storageUsedBytes,
        storageQuotaBytes: payload.storageQuotaBytes,
      }
    } catch {
      // DB not ready / transient — fall back to client-side load.
      initialData = null
    }
  }

  return (
    <GyenboxWorkspace
      supabaseConfig={getPublicSupabaseConfig()}
      initialData={initialData}
    />
  )
}
