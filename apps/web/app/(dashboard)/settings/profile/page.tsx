import { SettingsShell } from "@/components/layout/settings-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ProfileSettingsPage() {
  return (
    <SettingsShell title="Profile" description="Identity and visible workspace profile details.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Display name" defaultValue="Ethan" />
        <Input label="Email" defaultValue="ethan@example.com" type="email" />
      </div>
      <div className="flex justify-end">
        <Button>Save profile</Button>
      </div>
    </SettingsShell>
  )
}
