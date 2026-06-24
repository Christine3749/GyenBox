"use client"

import type { FileItem } from "@gyenbox/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { FileUp, FolderPlus, Grid3X3, List, Search } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { FileCard } from "./file-card"
import { FileRow } from "./file-row"

type FileBrowserProps = {
  initialFiles: FileItem[]
  title: string
  description?: string
  searchFirst?: boolean
}

export function FileBrowser({ initialFiles, title, description, searchFirst = false }: FileBrowserProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<"grid" | "list">("grid")
  const [query, setQuery] = useState("")
  const [localFiles, setLocalFiles] = useState<FileItem[]>(initialFiles)

  const files = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return localFiles
    return localFiles.filter((file) => {
      return [file.name, file.path, file.ownerName, ...file.tags].some((value) =>
        value.toLowerCase().includes(normalized),
      )
    })
  }, [localFiles, query])

  function handleLocalUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? [])
    if (selectedFiles.length === 0) return

    const uploaded = selectedFiles.map<FileItem>((file, index) => ({
      id: `local-${file.name}-${Date.now()}-${index}`,
      name: file.name,
      kind: file.type.startsWith("image/") ? "image" : "other",
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      ownerName: "You",
      updatedAt: new Date().toISOString(),
      isStarred: false,
      isShared: false,
      path: "/My files",
      tags: ["local"],
    }))

    setLocalFiles((current) => [...uploaded, ...current])
    event.target.value = ""
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {description ?? "Own, organize, share, and recover files across your protected workspace."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleLocalUpload}
            aria-label="Upload files"
          />
          <Button onClick={() => inputRef.current?.click()}>
            <FileUp className="h-4 w-4" />
            Upload
          </Button>
          <Button variant="secondary">
            <FolderPlus className="h-4 w-4" />
            New folder
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          searchFirst && "sm:flex-row-reverse",
        )}
      >
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filter current files"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name, tag, owner..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("grid")}
            aria-label="Show grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
            aria-label="Show list view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card/90">
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_120px_140px_40px] gap-3 border-b border-border px-4 py-3 text-xs text-muted-foreground sm:grid">
            <span>Name</span>
            <span>Status</span>
            <span>Size</span>
            <span>Modified</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {files.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}