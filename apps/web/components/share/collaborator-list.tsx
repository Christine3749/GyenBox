import { Badge } from "@/components/ui/badge"

const collaborators = [
  { name: "Mina Chen", role: "Owner" },
  { name: "Lena Ortiz", role: "Editor" },
  { name: "Noah Singh", role: "Viewer" },
]

export function CollaboratorList() {
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {collaborators.map((collaborator) => (
        <div key={collaborator.name} className="flex items-center justify-between gap-3 p-3">
          <span className="text-sm">{collaborator.name}</span>
          <Badge variant="outline">{collaborator.role}</Badge>
        </div>
      ))}
    </div>
  )
}
