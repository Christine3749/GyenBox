import { ActivityFeed } from "@/components/files/activity-feed"
import { FileRow } from "@/components/files/file-row"
import { StorageBreakdown } from "@/components/layout/storage-breakdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { mockActivity, mockFiles, storageBuckets } from "@/lib/mock-data"
import { ArrowUpRight, Clock3, FileUp, FolderPlus, ShieldCheck, Users } from "lucide-react"

const metrics = [
  { label: "Storage claimed", value: "41.2 GB", detail: "of 100 GB team pool", icon: ShieldCheck },
  { label: "Shared territories", value: "18", detail: "6 public links expiring soon", icon: Users },
  { label: "Recent changes", value: "126", detail: "last 24 hours", icon: Clock3 },
]

export default function HomePage() {
  const recentFiles = mockFiles.slice(0, 5)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col gap-4 border-b border-border/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">GSYEN ecosystem</Badge>
            <Badge variant="success">Sovereign storage online</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
            GyenBox 疆域盒子
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your data. Your territory. A Dropbox-grade workspace with ownership-first file operations,
            sharing, auditability, and encrypted storage paths.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>
            <FileUp className="h-4 w-4" />
            Upload
          </Button>
          <Button variant="secondary">
            <FolderPlus className="h-4 w-4" />
            New folder
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-border bg-card/90 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
              </div>
              <metric.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-card/90">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Recent files</h2>
              <p className="text-xs text-muted-foreground">Last opened and modified by your team</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Open files">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentFiles.map((file) => (
              <FileRow key={file.id} file={file} compact />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <StorageBreakdown buckets={storageBuckets} />
          <ActivityFeed events={mockActivity} />
        </div>
      </section>
    </div>
  )
}
