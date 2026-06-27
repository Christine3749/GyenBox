import { BillingMembershipPanel } from "./billing-membership-panel"
import { SettingsShell } from "@/components/layout/settings-shell"
import { getPublicSupabaseConfig } from "@/lib/supabase-public-config"

export default function BillingSettingsPage() {
  return (
    <SettingsShell title="Billing" description="GyenBox membership, quota, and subscription ownership.">
      <BillingMembershipPanel supabaseConfig={getPublicSupabaseConfig()} />
    </SettingsShell>
  )
}
