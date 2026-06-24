import GyenboxWorkspace from "@/components/gyenbox/workspace"
import { getPublicSupabaseConfig } from "@/lib/supabase-public-config"

export const dynamic = "force-dynamic"

export default function WorkspacePage() {
  return <GyenboxWorkspace supabaseConfig={getPublicSupabaseConfig()} />
}