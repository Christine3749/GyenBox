import { AuthPanel } from "@/components/layout/auth-panel"
import { getPublicHsConfig } from "@/lib/hs-public-config"

export const dynamic = "force-dynamic"

export default function VerifyPage() {
  return <AuthPanel mode="verify" supabaseConfig={getPublicHsConfig()} />
}