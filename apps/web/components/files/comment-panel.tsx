import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const comments = [
  { author: "Mina", body: "Please keep this share view-only until legal clears it." },
  { author: "Ethan", body: "@Mina marked the named version as v1.0 final." },
]

export function CommentPanel() {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Comments</h2>
      <div className="mt-4 grid gap-3">
        {comments.map((comment) => (
          <div key={`${comment.author}-${comment.body}`} className="rounded-md border border-border p-3">
            <p className="text-xs font-medium text-primary">{comment.author}</p>
            <p className="mt-1 text-sm text-muted-foreground">{comment.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Input aria-label="Add comment" placeholder="Mention someone..." />
        <Button>Send</Button>
      </div>
    </section>
  )
}
