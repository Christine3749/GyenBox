type EmptyStateProps = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-xl flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h1 className="mt-5 text-xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  )
}
