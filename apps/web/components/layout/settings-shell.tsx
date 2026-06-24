import { Separator } from "@/components/ui/separator"

type SettingsShellProps = {
  title: string
  description: string
  children: React.ReactNode
}

export function SettingsShell({ title, description, children }: SettingsShellProps) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <Separator />
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-card/90 p-5">{children}</div>
    </section>
  )
}
