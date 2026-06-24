import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, Command, FileUp, Menu, Search } from "lucide-react"

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </Button>
      <div className="relative hidden min-w-0 flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search files" placeholder="Search files, folders, tags, owners..." className="pl-9" />
      </div>
      <Button variant="outline" size="sm" className="hidden lg:inline-flex">
        <Command className="h-4 w-4" />
        Command
      </Button>
      <Button size="sm">
        <FileUp className="h-4 w-4" />
        Upload
      </Button>
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>
    </header>
  )
}
