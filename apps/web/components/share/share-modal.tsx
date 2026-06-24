import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link2 } from "lucide-react"

export function ShareModal() {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Share link</h2>
      <div className="mt-4 grid gap-3">
        <Input label="Permission" defaultValue="View only" />
        <Input label="Expiry" defaultValue="7 days" />
        <Button>
          <Link2 className="h-4 w-4" />
          Create protected link
        </Button>
      </div>
    </section>
  )
}
