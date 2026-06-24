import { Progress } from "@/components/ui/progress"

const queue = [
  { name: "Q4-board-pack.pdf", progress: 74 },
  { name: "territory-map.png", progress: 31 },
]

export function UploadQueue() {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Upload queue</h2>
      <div className="mt-4 grid gap-4">
        {queue.map((item) => (
          <div key={item.name}>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="truncate">{item.name}</span>
              <span className="font-mono text-muted-foreground">{item.progress}%</span>
            </div>
            <Progress value={item.progress} />
          </div>
        ))}
      </div>
    </section>
  )
}
