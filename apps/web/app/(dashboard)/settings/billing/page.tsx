import { BillingMembershipPanel } from "./billing-membership-panel"
import { SettingsShell } from "@/components/layout/settings-shell"
import { getPublicHsConfig } from "@/lib/hs-public-config"

export default function BillingSettingsPage() {
  return (
    <SettingsShell title="Billing" description="GyenBox membership, quota, and subscription ownership.">
      <BillingMembershipPanel supabaseConfig={getPublicHsConfig()} />
    </SettingsShell>
  )
}
