import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const versions = [
  { label: "Head", createdAt: "2h ago", size: "14.2 MB" },
  { label: "v1.0 final", createdAt: "Yesterday", size: "14.1 MB" },
  { label: "Draft", createdAt: "3 days ago", size: "13.8 MB" },
]

export function VersionHistory() {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Version history</h2>
      <div className="mt-4 grid gap-3">
        {versions.map((version) => (
          <div key={version.label} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{version.label}</p>
                {version.label === "Head" ? <Badge variant="success">Current</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {version.createdAt} · {version.size}
              </p>
            </div>
            <Button variant="outline" size="sm">Restore</Button>
          </div>
        ))}
      </div>
    </section>
  )
}
