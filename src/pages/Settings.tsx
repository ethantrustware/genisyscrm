import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  ShieldAlert,
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
import { usePrefs } from '@/lib/prefs'

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
  { to: '/inbox', label: 'Inbox' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/crm', label: 'CRM' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/clients', label: 'Clients' },
  { to: '/agents', label: 'Staff' },
  { to: '/documents', label: 'Documents' },
  { to: '/payments', label: 'Payments' },
]

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

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Sidebar</p>
            <p className="mb-2 text-xs text-muted-foreground">
              How the sidebar starts on a fresh browser. Collapsing it by hand
              still wins for the rest of the session.
            </p>
            <div className="flex gap-1.5">
              {(['expanded', 'collapsed'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update({ sidebarDefault: v })}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition',
                    prefs.sidebarDefault === v
                      ? 'bg-primary-soft text-primary'
                      : 'border border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Density</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Compact tightens list spacing.
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
        <SectionLabel>Tabs</SectionLabel>
        <p className="mb-3 text-xs text-muted-foreground">
          Hide sections you are not using. This is cosmetic and applies to your
          account on this browser only — it tidies the sidebar, it does not
          restrict access.
        </p>

        <ul className="flex flex-col">
          {HIDEABLE_TABS.map((t) => {
            const hidden = prefs.hiddenTabs.includes(t.to)
            return (
              <li
                key={t.to}
                className="flex items-center justify-between gap-3 border-b border-border-soft py-2.5 last:border-0"
              >
                <span
                  className={cn(
                    'text-sm',
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

        {prefs.hiddenTabs.length > 0 && (
          <button
            type="button"
            onClick={() => update({ hiddenTabs: [] })}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Show all tabs
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
