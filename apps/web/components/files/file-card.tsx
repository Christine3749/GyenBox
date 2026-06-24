import type { FileItem } from "@gyenbox/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatBytes, formatRelativeDate } from "@/lib/format"
import { MoreHorizontal, Star } from "lucide-react"
import { FileIcon } from "./file-icon"

type FileCardProps = {
  file: FileItem
}

export function FileCard({ file }: FileCardProps) {
  return (
    <article className="group flex min-h-44 flex-col justify-between rounded-lg border border-border bg-card/90 p-4 transition hover:border-primary/60 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-background">
          <FileIcon kind={file.kind} />
        </div>
        <Button variant="ghost" size="icon" aria-label={`Open actions for ${file.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2">
          {file.isShared ? <Badge variant="secondary">Shared</Badge> : null}
          {file.isStarred ? <Star className="h-4 w-4 fill-warning text-warning" /> : null}
        </div>
        <h3 className="line-clamp-2 text-sm font-medium leading-5">{file.name}</h3>
        <p className="mt-2 truncate text-xs text-muted-foreground">{file.path}</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-mono">{formatBytes(file.size)}</span>
          <span>{formatRelativeDate(file.updatedAt)}</span>
        </div>
      </div>
    </article>
  )
}
