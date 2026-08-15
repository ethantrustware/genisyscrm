import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Moon,
  Plug,
  ShieldAlert,
  Sun,
  Unplug,
} from 'lucide-react'
import {
  DEFAULT_HUB,
  clearConnection,
  getConnection,
  setConnection,
  fetchCurrentUser,
  testConnection,
  useIsLive,
} from '@/lib/api'
import {
  Card,
  PageHeader,
  SectionLabel,
  btnPrimary,
  btnSecondary,
  inputCls,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { applyTabOrder, usePrefs } from '@/lib/prefs'

/**
 * Connect screen — swaps the app from demo data to the live Hub.
 *
 * The token is entered here at runtime and kept in localStorage. It is
 * deliberately NOT read from an env var or committed: this repo is
 * public and Lovable previews are shareable, so a bundled token would
 * be a published credential.
 */

/**
 * Tabs that can be hidden. Settings is deliberately not listed: hiding it
 * would remove the only way back to unhide anything.
 */
const HIDEABLE_TABS = [
  { to: '/', label: 'Dashboard' },
  { to: '/today', label: 'Today' },
  { to: '/inbox', label: 'Inbox', owner: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/crm', label: 'CRM' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/clock', label: 'Timeclock' },
  { to: '/call-center', label: 'Call Center' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/clients', label: 'Clients', owner: true },
  { to: '/agents', label: 'Staff', owner: true },
  { to: '/documents', label: 'Documents' },
  { to: '/payments', label: 'Payments', owner: true },
]

const OWNER_ROLES = new Set(['admin', 'member'])

export default function Settings() {
  const queryClient = useQueryClient()
  const live = useIsLive()
  const me = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    enabled: live,
    staleTime: 60_000,
  })
  const who = me.data?.user?.email ?? 'demo'
  const { prefs, update } = usePrefs(who)

  // Only list tabs this person actually has. Showing a rep a row for
  // "Payments" would advertise a section they can't reach and can't do
  // anything about.
  const showOwnerTabs = live
    ? OWNER_ROLES.has(me.data?.user?.role ?? '')
    : true
  const orderedTabs = applyTabOrder(
    HIDEABLE_TABS.filter((t) => !t.owner || showOwnerTabs),
    prefs.tabOrder,
  )

  /**
   * Move a tab one place up or down.
   *
   * Writes the complete resulting order rather than a partial one, so
   * the saved preference always matches exactly what is on screen —
   * a partial order would re-sort unpredictably on the next render.
   */
  const moveTab = (index: number, direction: -1 | 1) => {
    const next = [...orderedTabs]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    update({ tabOrder: next.map((t) => t.to) })
  }

  // Server-rendered: read storage after mount, never during render.
  const [existing, setExisting] = useState<ReturnType<
    typeof getConnection
  > | null>(null)
  useEffect(() => setExisting(getConnection()), [])

  const [base, setBase] = useState(DEFAULT_HUB)
  useEffect(() => {
    const c = getConnection()
    if (c) setBase(c.base)
  }, [])
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  )

  const connect = async () => {
    setBusy(true)
    setResult(null)
    const r = await testConnection(base, token)
    if (r.ok) {
      setConnection(base, token)
      setExisting(getConnection())
      queryClient.invalidateQueries()
    }
    setResult(r)
    setBusy(false)
  }

  const disconnect = () => {
    clearConnection()
    setExisting(null)
    setToken('')
    setResult({ ok: true, message: 'Disconnected — back to demo data.' })
    queryClient.invalidateQueries()
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Settings' }]}
        subtitle="Point this frontend at the live Genisys Hub API. Without a connection it runs on demo data, which is what preview shows by default."
      />

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              existing ? 'bg-emerald-500' : 'bg-amber-400',
            )}
          />
          <p className="text-sm font-semibold">
            {existing ? 'Connected — showing live data' : 'Demo mode'}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {existing
            ? `Reading from ${existing.base}`
            : 'All screens are rendering realistic mock data. Nothing is being read from the Hub.'}
        </p>
      </Card>

      <Card>
        <SectionLabel>Connection</SectionLabel>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">Hub URL</span>
            <input
              className={inputCls}
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder={DEFAULT_HUB}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">API token</span>
            <input
              className={cn(inputCls, 'font-mono')}
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghub_…"
              autoComplete="off"
            />
            <span className="text-[11px] text-muted-foreground">
              Generate one in the Hub under Settings → API Tokens. Stored in
              this browser only.
            </span>
          </label>

          {result && (
            <div
              className={cn(
                'flex items-start gap-2 rounded-xl border p-3 text-sm',
                result.ok
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-destructive/30 bg-destructive/10 text-destructive',
              )}
            >
              {result.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              ) : (
                <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={connect}
              disabled={busy || !token.trim() || !base.trim()}
              className={btnPrimary}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plug className="h-4 w-4" />
              )}
              Connect
            </button>
            {existing && (
              <button
                type="button"
                onClick={disconnect}
                className={btnSecondary}
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ---- Appearance ---- */}
      <Card>
        <SectionLabel>Appearance</SectionLabel>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="mb-2 text-xs text-muted-foreground">
              System follows your device, including when it switches at
              sunset.
            </p>
            <div className="flex gap-1.5">
              {(
                [
                  { v: 'light', icon: Sun, label: 'Light' },
                  { v: 'dark', icon: Moon, label: 'Dark' },
                  { v: 'system', icon: Monitor, label: 'System' },
                ] as const
              ).map((o) => {
                const Icon = o.icon
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => update({ theme: o.v })}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      prefs.theme === o.v
                        ? 'bg-primary-soft text-primary'
                        : 'border border-border bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Density</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Compact tightens rows on the table-heavy screens so more fits on
              one page.
            </p>
            <div className="flex gap-1.5">
              {(['comfortable', 'compact'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update({ density: v })}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition',
                    prefs.density === v
                      ? 'bg-primary-soft text-primary'
                      : 'border border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ---- Tabs ---- */}
      <Card>
        <SectionLabel>Sidebar</SectionLabel>
        <p className="mb-3 text-xs text-muted-foreground">
          Reorder sections with the arrows, or hide the ones you are not
          using. This applies to your account on this browser only — it
          tidies the sidebar, it does not change what you can access.
        </p>

        <ul className="flex flex-col">
          {orderedTabs.map((t, i) => {
            const hidden = prefs.hiddenTabs.includes(t.to)
            return (
              <li
                key={t.to}
                className="flex items-center gap-2 border-b border-border-soft py-2 last:border-0"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${t.label} up`}
                    disabled={i === 0}
                    onClick={() => moveTab(i, -1)}
                    className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${t.label} down`}
                    disabled={i === orderedTabs.length - 1}
                    onClick={() => moveTab(i, 1)}
                    className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <span
                  className={cn(
                    'flex-1 text-sm',
                    hidden && 'text-muted-foreground line-through',
                  )}
                >
                  {t.label}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    update({
                      hiddenTabs: hidden
                        ? prefs.hiddenTabs.filter((x) => x !== t.to)
                        : [...prefs.hiddenTabs, t.to],
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
                >
                  {hidden ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Hidden
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Visible
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {(prefs.hiddenTabs.length > 0 || prefs.tabOrder.length > 0) && (
          <button
            type="button"
            onClick={() => update({ hiddenTabs: [], tabOrder: [] })}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Reset sidebar
          </button>
        )}
      </Card>

      <Card>
        <SectionLabel>How this works</SectionLabel>
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-xs text-muted-foreground">
          <li>
            This app is only a frontend. All data lives in the Hub on Render —
            nothing is stored here.
          </li>
          <li>
            It reads a curated, <strong>read-only</strong> API. There is no way
            to charge a card, send an SMS, or delete a row from this app.
          </li>
          <li>
            Customer phone numbers and emails arrive already masked from the
            Hub.
          </li>
          <li>
            The token never enters the repo or the bundle — it is typed in here
            and kept in this browser. Revoke it any time from the Hub.
          </li>
        </ul>
      </Card>
    </div>
  )
}
