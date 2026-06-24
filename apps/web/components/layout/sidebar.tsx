"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { GyenBoxLogo } from "@/components/brand/gyenbox-logo"
import {
  Bell,
  FileClock,
  Files,
  Home,
  Search,
  Settings,
  Shield,
  Star,
  Trash2,
  Users,
} from "lucide-react"

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/files", label: "Files", icon: Files },
  { href: "/shared", label: "Shared", icon: Users },
  { href: "/starred", label: "Starred", icon: Star },
  { href: "/search", label: "Search", icon: Search },
  { href: "/trash", label: "Trash", icon: Trash2 },
]

const settingsItems = [
  { href: "/settings/profile", label: "Profile", icon: Settings },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/settings/notifications", label: "Alerts", icon: Bell },
  { href: "/settings/billing", label: "Billing", icon: FileClock },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-screen w-60 shrink-0 border-r border-border bg-card/95 md:flex md:flex-col">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <GyenBoxLogo showSubtitle markClassName="h-8 w-8" wordmarkClassName="text-foreground" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href} />
        ))}
        <div className="mt-4 border-t border-border pt-4">
          {settingsItems.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-lg border border-border bg-background/80 p-3">
          <p className="text-xs font-medium text-muted-foreground">Territory health</p>
          <p className="mt-2 text-sm font-semibold">Encrypted paths ready</p>
          <p className="mt-1 text-xs text-muted-foreground">E2E upload flow is reserved for Phase 6.</p>
        </div>
      </div>
    </aside>
  )
}

type NavLinkProps = {
  item: {
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }
  active: boolean
}

function NavLink({ item, active }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/15 text-primary",
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </Link>
  )
}
