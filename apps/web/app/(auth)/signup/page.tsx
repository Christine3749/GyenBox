import { AuthPanel } from "@/components/layout/auth-panel"
import { getPublicSupabaseConfig } from "@/lib/supabase-public-config"

export const dynamic = "force-dynamic"

export default function SignupPage() {
  return <AuthPanel mode="signup" supabaseConfig={getPublicSupabaseConfig()} />
}