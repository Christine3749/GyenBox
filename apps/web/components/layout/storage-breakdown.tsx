import type { StorageBucket } from "@gyenbox/types"
import { Progress } from "@/components/ui/progress"
import { formatBytes } from "@/lib/format"

type StorageBreakdownProps = {
  buckets: StorageBucket[]
}

export function StorageBreakdown({ buckets }: StorageBreakdownProps) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.bytes, 0)
  const quota = 100 * 1024 * 1024 * 1024
  const usedPercent = (total / quota) * 100

  return (
    <section className="rounded-lg border border-border bg-card/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Storage usage</h2>
          <p className="text-xs text-muted-foreground">{formatBytes(total)} of 100 GB used</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{Math.round(usedPercent)}%</span>
      </div>
      <Progress value={usedPercent} className="mt-4" />
      <div className="mt-4 grid gap-2">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: bucket.color }} />
              <span className="text-muted-foreground">{bucket.label}</span>
            </div>
            <span className="font-mono">{formatBytes(bucket.bytes)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
