import { AuthPanel } from "@/components/layout/auth-panel"
import { getPublicSupabaseConfig } from "@/lib/supabase-public-config"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  return <AuthPanel mode="login" supabaseConfig={getPublicSupabaseConfig()} />
}