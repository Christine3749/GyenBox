import { Badge } from "@/components/ui/badge"

export function LinkSettings() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">Password optional</Badge>
      <Badge variant="outline">Expiry date</Badge>
      <Badge variant="outline">View / comment / edit</Badge>
      <Badge variant="outline">Watermark ready</Badge>
    </div>
  )
}
