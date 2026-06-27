'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Check, ChevronDown, LogOut, ShieldCheck, X } from 'lucide-react'

type Locale = 'zh' | 'en'

type Plan = {
  code: string
  name: string
  storageQuotaLabel: string
  maxDevices: number
  maxFileSizeLabel: string
  features?: Record<string, unknown>
}

type MembershipPayload = {
  needsProvision: boolean
  current: { planCode: string; planName: string; status: string; plan: Plan } | null
  plans: Plan[]
  storage: { usedLabel: string; quotaLabel: string }
}

type ApiEnvelope<T> = { ok: boolean; data?: T; error?: { message?: string } }

type Props = {
  session: Session | null
  locale: Locale
  storageUsedBytes: number
  storageQuotaBytes: number
  onSignOut: () => void
}

const text = {
  zh: {
    member: '会员', action: '开通', accountInfo: '账户信息', security: '安全设置', permissions: '我的权限', plans: '会员方案',
    primaryEmail: '主邮箱', accountId: '账户 ID', provider: '登录方式', hsAuth: 'HS 认证',
    hsAuthDetail: 'HalfSphere 是统一会员与权限中心。GyenBox 读取授权结果，不重复造会员表。',
    storage: '存储', devices: '设备', activate: '开通 GyenBox Free', signOut: '退出', close: '关闭',
    currentPlan: '当前方案', noPlan: '待开通', loading: '读取会员', syncBox: 'GyenBox 权限盒',
  },
  en: {
    member: 'Member', action: 'Activate', accountInfo: 'Account', security: 'Security', permissions: 'Permissions', plans: 'Plans',
    primaryEmail: 'Primary email', accountId: 'Account ID', provider: 'Sign-in', hsAuth: 'HS Auth',
    hsAuthDetail: 'HalfSphere is the membership authority. GyenBox reads grants without duplicating member truth.',
    storage: 'Storage', devices: 'Devices', activate: 'Activate GyenBox Free', signOut: 'Sign out', close: 'Close',
    currentPlan: 'Current plan', noPlan: 'Needs activation', loading: 'Loading member', syncBox: 'GyenBox permission box',
  },
} as const

export function GyenBoxMemberCenter({ session, locale, storageUsedBytes, storageQuotaBytes, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [membership, setMembership] = useState<MembershipPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = text[locale]
  const email = session?.user.email ?? 'guest@gyenbox.com'
  const displayName = useMemo(() => (email.split('@')[0]?.replace(/[^a-z0-9]/gi, '') || 'GYEN').slice(0, 12).toUpperCase(), [email])
  const currentPlan = membership?.current?.plan
  const planBadge = membership?.current?.planCode ?? (membership?.needsProvision ? t.action : t.member)
  const storageLabel = membership?.storage
    ? `${membership.storage.usedLabel} / ${membership.storage.quotaLabel}`
    : `${formatBytes(storageUsedBytes)} / ${formatBytes(storageQuotaBytes)}`

  async function loadMembership() {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/membership', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const body = (await response.json()) as ApiEnvelope<MembershipPayload>
      if (!response.ok || !body.ok || !body.data) throw new Error(body.error?.message ?? 'Membership unavailable')
      setMembership(body.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Membership unavailable')
    } finally {
      setLoading(false)
    }
  }

  async function activateFree() {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/membership', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const body = (await response.json()) as ApiEnvelope<MembershipPayload>
      if (!response.ok || !body.ok || !body.data) throw new Error(body.error?.message ?? 'Membership unavailable')
      setMembership(body.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Membership unavailable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadMembership() }, [session?.access_token])

  return (
    <>
      <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <button
          className="inline-flex h-6 items-center gap-1 border border-[var(--gb-line)] bg-[rgba(255,255,255,0.025)] px-2 gb-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gb-ink)] hover:bg-[var(--gb-iris-soft)] hover:text-[var(--gb-ink-deep)]"
          onClick={() => setOpen(true)}
          type="button"
        >
          {displayName}
          <span className="border border-[var(--gb-iris)] px-1 text-[9px] text-[var(--gb-blue)]">{planBadge}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {hovered ? (
          <div className="absolute right-0 top-8 z-200 w-72 border border-[var(--gb-line-strong)] bg-[var(--gb-paper-raised)] p-3 text-[var(--gb-ink)] shadow-[var(--gb-shadow)]">
            <div className="gb-mono text-[10px] uppercase tracking-[0.22em] text-[var(--gb-faint)]">HS · GYENBOX</div>
            <div className="mt-2 truncate text-sm font-bold">{email}</div>
            <div className="mt-1 text-xs text-[var(--gb-muted)]">
              {membership?.current ? `GyenBox ${membership.current.planName}` : t.noPlan} · {storageLabel}
            </div>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-500 flex items-center justify-center bg-[rgba(26,26,26,0.32)] px-6 py-8">
          <section className="gb-paper-grid max-h-[88vh] w-full max-w-4xl overflow-hidden border border-[var(--gb-line-strong)] bg-[var(--gb-paper)] text-[var(--gb-ink)] shadow-[var(--gb-shadow)]">
            <header className="gb-titlebar flex h-12 items-center justify-between border-b border-[var(--gb-line)] px-5">
              <div className="min-w-0">
                <div className="gb-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gb-faint)]">GYENBOX · HS MEMBER</div>
                <div className="truncate text-sm font-bold text-[var(--gb-ink-deep)]">{email}</div>
              </div>
              <button className="flex h-8 w-8 items-center justify-center border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] text-[var(--gb-muted)] hover:bg-[var(--gb-iris-soft)] hover:text-[var(--gb-ink)]" onClick={() => setOpen(false)} title={t.close}>
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="grid max-h-[calc(88vh-48px)] grid-cols-[190px_1fr] overflow-y-auto gb-scrollbar">
              <aside className="border-r border-[var(--gb-line)] bg-[var(--gb-paper-muted)] px-4 py-6">
                <div className="mb-6 border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] p-3">
                  <div className="gb-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gb-faint)]">{t.syncBox}</div>
                  <div className="mt-2 h-1.5 bg-[rgba(255,255,255,0.08)]"><div className="h-full w-1/3 bg-[var(--gb-iris)]" /></div>
                </div>
                <MemberNav locale={locale} />
              </aside>

              <main className="space-y-8 px-7 py-7">
                <Section title={t.accountInfo} subtitle={locale === 'zh' ? '账户由 HS 统一认证，GyenBox 读取身份。' : 'Identity comes from HS; GyenBox reads it.'}>
                  <InfoRow label={t.primaryEmail} value={email} badge={locale === 'zh' ? '已验证' : 'Verified'} />
                  <InfoRow label={t.accountId} value={session?.user.id.slice(0, 8) ?? 'guest'} />
                  <InfoRow label={t.provider} value="Email / Password" />
                </Section>

                <Section title={t.security} subtitle={locale === 'zh' ? '统一认证，不在各产品重复造会员表。' : 'One authority, no duplicate member tables.'}>
                  <div className="flex items-start gap-4 border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] px-5 py-4">
                    <ShieldCheck className="mt-1 h-5 w-5 text-[var(--gb-iris)]" />
                    <div>
                      <div className="font-bold text-[var(--gb-ink-deep)]">{t.hsAuth}</div>
                      <p className="mt-1 text-sm text-[var(--gb-muted)]">{t.hsAuthDetail}</p>
                    </div>
                  </div>
                </Section>

                <Section title={t.permissions} subtitle={locale === 'zh' ? '横向产品权限 + 纵向方案等级。' : 'Product access plus tier limits.'}>
                  {membership?.needsProvision ? (
                    <button className="w-full bg-[var(--gb-ink)] px-5 py-3 font-bold text-[var(--gb-paper)] hover:bg-[var(--gb-ink-deep)]" onClick={activateFree}>
                      {loading ? t.loading : t.activate}
                    </button>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metric label={t.currentPlan} value={membership?.current?.planName ?? t.noPlan} />
                    <Metric label={t.storage} value={storageLabel} />
                    <Metric label={t.devices} value={`${currentPlan?.maxDevices ?? 1}`} />
                  </div>
                  <PermissionList locale={locale} plan={currentPlan} />
                </Section>

                <Section title={t.plans} subtitle={locale === 'zh' ? '方案从 HalfSphere 同步读取。' : 'Plans are read from HalfSphere.'}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {(membership?.plans ?? []).map((plan) => <PlanCard key={plan.code} plan={plan} active={plan.code === membership?.current?.planCode} />)}
                  </div>
                  {error ? <div className="border border-[var(--gb-rose)] bg-[rgba(181,107,119,0.08)] px-4 py-3 text-sm text-[var(--gb-rose)]">{error}</div> : null}
                  <button className="inline-flex items-center gap-2 border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] px-4 py-2 text-sm hover:bg-[var(--gb-paper-muted)]" onClick={onSignOut}>
                    <LogOut className="h-4 w-4" />
                    {t.signOut}
                  </button>
                </Section>
              </main>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

function MemberNav({ locale }: { locale: Locale }) {
  const items = locale === 'zh' ? ['账户信息', '安全设置', '我的权限', '会员方案'] : ['Account', 'Security', 'Permissions', 'Plans']
  return <div className="space-y-2">{items.map((item, index) => <div key={item} className={`border px-3 py-3 text-sm ${index === 0 ? 'border-[var(--gb-line-strong)] bg-[var(--gb-iris-soft)] font-bold text-[var(--gb-ink-deep)]' : 'border-transparent text-[var(--gb-muted)] hover:border-[var(--gb-line)] hover:bg-[var(--gb-paper-raised)] hover:text-[var(--gb-ink)]'}`}>{item}</div>)}</div>
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section><div className="gb-mono text-xs font-bold uppercase tracking-[0.22em] text-[var(--gb-ink-deep)]">{title}</div><p className="mt-1 text-xs text-[var(--gb-muted)]">{subtitle}</p><div className="mt-4 space-y-3">{children}</div></section>
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return <div className="grid grid-cols-[150px_1fr] border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] px-5 py-4 text-sm"><div className="font-bold text-[var(--gb-ink-deep)]">{label}</div><div className="flex items-center gap-3 gb-mono text-xs text-[var(--gb-ink)]"><span>{value}</span>{badge ? <span className="bg-[rgba(111,143,120,0.12)] px-2 py-1 text-[10px] text-[var(--gb-green)]">{badge}</span> : null}</div></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border border-[var(--gb-line)] bg-[var(--gb-paper-raised)] px-4 py-4"><div className="gb-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gb-faint)]">{label}</div><div className="mt-2 text-lg font-bold text-[var(--gb-ink-deep)]">{value}</div></div>
}

function PermissionList({ locale, plan }: { locale: Locale; plan?: Plan }) {
  const items = [
    [locale === 'zh' ? '网页上传' : 'Web upload', true],
    [locale === 'zh' ? '桌面同步' : 'Desktop sync', Boolean(plan)],
    [locale === 'zh' ? '分享链接' : 'Share links', Boolean(plan?.features?.sharing)],
    [locale === 'zh' ? 'AI 文件搜索' : 'AI file search', Boolean(plan?.features?.ai_search)],
  ] as const
  return <div className="border border-[var(--gb-line)] bg-[var(--gb-paper-raised)]">{items.map(([label, enabled]) => <div key={label} className="flex items-center justify-between border-b border-[var(--gb-line)] px-5 py-3 last:border-b-0"><span className={enabled ? 'font-bold text-[var(--gb-ink-deep)]' : 'text-[var(--gb-faint)]'}>{label}</span><span className={enabled ? 'text-[var(--gb-iris)]' : 'text-[var(--gb-faint)]'}>{enabled ? <Check className="h-4 w-4" /> : '—'}</span></div>)}</div>
}

function PlanCard({ plan, active }: { plan: Plan; active: boolean }) {
  return <div className={`border px-5 py-4 ${active ? 'border-[var(--gb-iris)] bg-[var(--gb-iris-soft)]' : 'border-[var(--gb-line)] bg-[var(--gb-paper-raised)]'}`}><div className="flex items-center justify-between"><div className="gb-mono text-sm font-bold uppercase tracking-[0.18em] text-[var(--gb-ink-deep)]">{plan.name}</div>{active ? <span className="bg-[var(--gb-ink)] px-2 py-1 text-[10px] uppercase text-[var(--gb-paper)]">Current</span> : null}</div><div className="mt-4 space-y-1 text-sm text-[var(--gb-muted)]"><div>{plan.storageQuotaLabel}</div><div>{plan.maxDevices} devices</div><div>{plan.maxFileSizeLabel} max file</div></div></div>
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
