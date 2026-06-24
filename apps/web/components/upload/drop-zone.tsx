"use client"

import { Button } from "@/components/ui/button"
import { UploadCloud } from "lucide-react"
import { useRef, useState } from "react"

export function DropZone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileNames, setFileNames] = useState<string[]>([])

  function capture(files: FileList | null) {
    setFileNames(Array.from(files ?? []).map((file) => file.name))
  }

  return (
    <section
      className="rounded-lg border border-dashed border-primary/60 bg-card/90 p-8 text-center"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        capture(event.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => capture(event.target.files)}
      />
      <UploadCloud className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-4 text-lg font-semibold">Drop files or folders here</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload requests will use presigned S3 URLs once storage credentials are configured.
      </p>
      <Button className="mt-5" onClick={() => inputRef.current?.click()}>
        Select files
      </Button>
      {fileNames.length > 0 ? (
        <div className="mt-5 rounded-md border border-border bg-background p-3 text-left text-sm">
          {fileNames.map((name) => (
            <p key={name} className="truncate text-muted-foreground">{name}</p>
          ))}
        </div>
      ) : null}
    </section>
  )
}
