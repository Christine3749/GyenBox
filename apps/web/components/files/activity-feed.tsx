import type { ActivityEvent } from "@gyenbox/types"
import { formatRelativeDate } from "@/lib/format"

type ActivityFeedProps = {
  events: ActivityEvent[]
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <section className="rounded-lg border border-border bg-card/90 p-4">
      <h2 className="text-sm font-semibold">Activity</h2>
      <div className="mt-4 grid gap-3">
        {events.map((event) => (
          <div key={event.id} className="grid gap-1 border-l border-primary/50 pl-3">
            <p className="text-sm">
              <span className="font-medium">{event.actor}</span> {event.action}{" "}
              <span className="text-muted-foreground">{event.resourceName}</span>
            </p>
            <p className="text-xs text-muted-foreground">{formatRelativeDate(event.createdAt)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
