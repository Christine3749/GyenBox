import { FileIcon } from "@/components/files/file-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPrisma } from "@/lib/prisma"
import type { FileKind } from "@gyenbox/types"
import { Download, LockKeyhole } from "lucide-react"
import { notFound } from "next/navigation"

type SharePageProps = {
  params: {
    token: string
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const share = await getPrisma().share.findUnique({
    where: { token: params.token },
    include: {
      file: { select: { name: true, mimeType: true, size: true, isTrashed: true } },
      folder: { select: { name: true, isTrashed: true } },
    },
  })

  if (!share || (share.expiresAt && share.expiresAt.getTime() < Date.now())) notFound()
  const resource = share.file ?? share.folder
  if (!resource || resource.isTrashed) notFound()

  const isFile = Boolean(share.file)
  const canDownload = isFile && !share.passwordHash
  const kind = share.file ? kindForFile(share.file.name, share.file.mimeType) : "folder"

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
          <FileIcon kind={kind} className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{resource.name}</p>
            <p className="text-xs text-muted-foreground">{share.permission.toLowerCase()} link</p>
          </div>
          <LockKeyhole className="h-4 w-4 text-success" />
        </div>
        {canDownload ? (
          <Button className="mt-6 w-full" asChild>
            <a href={`/api/share/${params.token}/download`}>
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        ) : (
          <Button className="mt-6 w-full" disabled>
            <Download className="h-4 w-4" />
            {share.passwordHash ? "Password required" : "Folder download coming soon"}
          </Button>
        )}
      </section>
    </main>
  )
}

function kindForFile(name: string, mimeType = ""): FileKind {
  const lower = name.toLowerCase()
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "document"
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv")) return "spreadsheet"
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "presentation"
  if (lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".7z")) return "archive"
  if (lower.endsWith(".ts") || lower.endsWith(".tsx") || lower.endsWith(".js") || lower.endsWith(".json")) return "code"
  return "other"
}
