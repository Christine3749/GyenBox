import type { FileItem } from "@gyenbox/types"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"
import { FileIcon } from "./file-icon"

type FilePreviewProps = {
  file: FileItem
}

export function FilePreview({ file }: FilePreviewProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <FileIcon kind={file.kind} />
          <p className="truncate text-sm font-medium">{file.name}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Download file">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close preview">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-4 flex aspect-video items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground">
        Preview renderer reserved for image, PDF, video, audio, text, and Office adapters.
      </div>
    </section>
  )
}
