import { SettingsShell } from "@/components/layout/settings-shell"
import { Button } from "@/components/ui/button"

const notificationTypes = [
  "File shared with you",
  "Comment mention",
  "File request fulfilled",
  "Storage quota warning",
  "Login from new device",
]

export default function NotificationSettingsPage() {
  return (
    <SettingsShell title="Notifications" description="Granular event routing for in-app, email, and push.">
      <div className="divide-y divide-border rounded-lg border border-border">
        {notificationTypes.map((type) => (
          <label key={type} className="flex items-center justify-between gap-4 p-4 text-sm">
            {type}
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-[hsl(var(--primary))]" />
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <Button>Save preferences</Button>
      </div>
    </SettingsShell>
  )
}
