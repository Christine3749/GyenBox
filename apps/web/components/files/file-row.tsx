import type { FileItem } from "@gyenbox/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatBytes, formatRelativeDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { MoreHorizontal, Star } from "lucide-react"
import { FileIcon } from "./file-icon"

type FileRowProps = {
  file: FileItem
  compact?: boolean
}

export function FileRow({ file, compact = false }: FileRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3",
        compact
          ? "sm:grid-cols-[minmax(0,1fr)_120px_140px_40px]"
          : "sm:grid-cols-[minmax(0,1fr)_110px_120px_140px_40px]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <FileIcon kind={file.kind} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="truncate text-xs text-muted-foreground">{file.path}</p>
        </div>
      </div>
      {!compact ? (
        <div className="hidden sm:block">
          <Badge variant={file.isShared ? "secondary" : "outline"}>{file.isShared ? "Shared" : "Private"}</Badge>
        </div>
      ) : null}
      <span className="hidden font-mono text-xs text-muted-foreground sm:block">{formatBytes(file.size)}</span>
      <span className="hidden text-xs text-muted-foreground sm:block">{formatRelativeDate(file.updatedAt)}</span>
      <div className="flex items-center justify-end gap-1">
        {file.isStarred ? <Star className="h-4 w-4 fill-warning text-warning" /> : null}
        <Button variant="ghost" size="icon" aria-label={`Open actions for ${file.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}