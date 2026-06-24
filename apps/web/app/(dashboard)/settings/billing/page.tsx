import { SettingsShell } from "@/components/layout/settings-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function BillingSettingsPage() {
  return (
    <SettingsShell title="Billing" description="Workspace quota, plan controls, and subscription ownership.">
      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Business Territory</p>
            <p className="mt-1 text-xs text-muted-foreground">100 GB pooled quota for team members.</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="secondary">Manage plan</Button>
      </div>
    </SettingsShell>
  )
}
