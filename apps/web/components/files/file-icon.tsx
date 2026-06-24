import type { FileKind } from "@gyenbox/types"
import {
  Archive,
  AudioLines,
  Code2,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Presentation,
  Video,
} from "lucide-react"
import { cn } from "@/lib/utils"

type FileIconProps = {
  kind: FileKind
  className?: string
}

const iconMap = {
  folder: Folder,
  image: FileImage,
  video: Video,
  audio: AudioLines,
  pdf: FileText,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  code: Code2,
  archive: Archive,
  other: File,
} satisfies Record<FileKind, React.ComponentType<{ className?: string }>>

const colorMap = {
  folder: "text-warning",
  image: "text-secondary",
  video: "text-primary",
  audio: "text-success",
  pdf: "text-destructive",
  document: "text-primary",
  spreadsheet: "text-success",
  presentation: "text-warning",
  code: "text-muted-foreground",
  archive: "text-accent",
  other: "text-muted-foreground",
} satisfies Record<FileKind, string>

export function FileIcon({ kind, className }: FileIconProps) {
  const Icon = iconMap[kind]
  return <Icon className={cn("h-5 w-5", colorMap[kind], className)} />
}
