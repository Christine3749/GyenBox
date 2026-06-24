import { FileIcon } from "@/components/files/file-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { mockFiles } from "@/lib/mock-data"
import { Download, LockKeyhole } from "lucide-react"

type SharePageProps = {
  params: {
    token: string
  }
}

export default function SharePage({ params }: SharePageProps) {
  const file = mockFiles[1]

  return (
    <main className="territorial-grid flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-glow">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Shared territory</p>
            <h1 className="mt-2 text-xl font-semibold">GyenBox Share</h1>
          </div>
          <Badge variant="outline">{params.token.slice(0, 8)}</Badge>
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-border bg-background/70 p-4">
          <FileIcon kind={file.kind} className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">View-only link</p>
          </div>
          <LockKeyhole className="h-4 w-4 text-success" />
        </div>
        <Button className="mt-6 w-full">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </section>
    </main>
  )
}
