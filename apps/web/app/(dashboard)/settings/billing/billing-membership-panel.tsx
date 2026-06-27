"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
  setSupabaseBrowserConfig,
  type SupabaseBrowserConfig,
} from "@/lib/supabase-client"

type Plan = {
  code: string
  name: string
  description: string | null
  storageQuotaLabel: string
  monthlyPriceCents: number
  maxDevices: number
  maxFileSizeLabel: string
  aiCreditsMonthly: number
}

type CurrentMembership = {
  planCode: string
  planName: string
  status: string
  billingInterval: string
  provider: string
  plan: Plan
}

type MembershipPayload = {
  needsProvision: boolean
  current: CurrentMembership | null
  plans: Plan[]
  storage: {
    usedBytes: number
    quotaBytes: number
    usedLabel: string
    quotaLabel: string
  }
}

type BillingMembershipPanelProps = {
  supabaseConfig?: SupabaseBrowserConfig | null
}

export function BillingMembershipPanel({ supabaseConfig }: BillingMembershipPanelProps) {
  const [payload, setPayload] = useState<MembershipPayload | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "signin" | "missing" | "error">("loading")
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    setSupabaseBrowserConfig(supabaseConfig ?? null)
    if (!hasSupabaseBrowserConfig()) {
      setStatus("missing")
      return
    }
    void loadMembership()
  }, [supabaseConfig])

  async function loadMembership() {
    const nextToken = await readToken()
    if (!nextToken) return

    const response = await fetch("/api/membership", {
      headers: { authorization: `Bearer ${nextToken}` },
    })
    if (!response.ok) {
      setStatus("error")
      return
    }

    const body = await response.json()
    setPayload(body.data)
    setStatus("ready")
  }

  async function activateFreeMembership() {
    const nextToken = token ?? await readToken()
    if (!nextToken) return

    setActivating(true)
    try {
      const response = await fetch("/api/membership", {
        method: "POST",
        headers: { authorization: `Bearer ${nextToken}` },
      })
      if (!response.ok) {
        setStatus("error")
        return
      }
      const body = await response.json()
      setPayload(body.data)
      setStatus("ready")
    } finally {
      setActivating(false)
    }
  }

  async function readToken() {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase.auth.getSession()
      const nextToken = data.session?.access_token ?? null
      setToken(nextToken)
      if (!nextToken) setStatus("signin")
      return nextToken
    } catch {
      setStatus("error")
      return null
    }
  }

  if (status === "loading") return <PanelMessage title="Loading membership" detail="Checking your GyenBox plan." />
  if (status === "missing") return <PanelMessage title="Supabase key missing" detail="Set the public Supabase key before membership can load." />
  if (status === "signin") {
    return (
      <PanelMessage title="Sign in required" detail="Sign in to see your GyenBox membership.">
        <Button onClick={() => { window.location.href = "/login" }}>Sign in</Button>
      </PanelMessage>
    )
  }
  if (status === "error" || !payload) return <PanelMessage title="Membership unavailable" detail="The membership service did not respond yet." />

  const usedPercent = payload.storage.quotaBytes > 0 ? Math.min(100, (payload.storage.usedBytes / payload.storage.quotaBytes) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-border bg-background/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{payload.current?.planName ?? "No membership active"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {payload.current?.plan.description ?? "Activate the free membership before testing billing."}
            </p>
          </div>
          <Badge variant={payload.current ? "success" : "warning"}>{payload.current?.status ?? "ACTION NEEDED"}</Badge>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${usedPercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {payload.storage.usedLabel} used of {payload.storage.quotaLabel}
        </p>
        {payload.needsProvision ? (
          <Button className="mt-4" onClick={activateFreeMembership} disabled={activating}>
            {activating ? "Activating..." : "Activate free membership"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {payload.plans.map((plan) => (
          <div key={plan.code} className="rounded-lg border border-border bg-background/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{plan.name}</p>
              {plan.code === payload.current?.planCode ? <Badge>Current</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
            <p className="mt-4 text-lg font-semibold">{priceLabel(plan.monthlyPriceCents)}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>{plan.storageQuotaLabel} storage</p>
              <p>{plan.maxDevices} devices</p>
              <p>{plan.maxFileSizeLabel} max file</p>
              <p>{plan.aiCreditsMonthly} AI credits / month</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" disabled>Payment upgrade coming next</Button>
      </div>
    </div>
  )
}

function PanelMessage({ title, detail, children }: { title: string; detail: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}

function priceLabel(cents: number) {
  if (cents <= 0) return "Free"
  return `$${(cents / 100).toFixed(2)} / month`
}
