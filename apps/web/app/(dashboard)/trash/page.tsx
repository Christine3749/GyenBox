import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export default function TrashPage() {
  return (
    <EmptyState
      icon={Trash2}
      title="Trash is empty"
      description="Soft-deleted files will stay here for 30 days before policy cleanup."
      action={<Button variant="secondary">Review retention policy</Button>}
    />
  )
}
