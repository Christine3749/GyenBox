import KeepApp from "@/components/notes/KeepApp"
import { getPublicSupabaseConfig } from "@/lib/supabase-public-config"

export const dynamic = "force-dynamic"

export default function KeepPage() {
  return <KeepApp supabaseConfig={getPublicSupabaseConfig()} />
}
