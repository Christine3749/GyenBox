import { SettingsShell } from "@/components/layout/settings-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react"

const items = [
  { label: "Two-factor authentication", status: "Planned", icon: Smartphone },
  { label: "Passkeys / WebAuthn", status: "Contract ready", icon: KeyRound },
  { label: "Session revocation", status: "Phase 6", icon: ShieldCheck },
]

export default function SecuritySettingsPage() {
  return (
    <SettingsShell title="Security" description="Account hardening, device visibility, and encrypted access.">
      <div className="divide-y divide-border rounded-lg border border-border">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4 text-primary" />
              <span className="text-sm">{item.label}</span>
            </div>
            <Badge variant="outline">{item.status}</Badge>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="secondary">Open audit log</Button>
      </div>
    </SettingsShell>
  )
}
