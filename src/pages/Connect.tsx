import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Plug, ShieldAlert, Unplug } from 'lucide-react'
import {
  DEFAULT_HUB,
  clearConnection,
  getConnection,
  setConnection,
  testConnection,
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

/**
 * Connect screen — swaps the app from demo data to the live Hub.
 *
 * The token is entered here at runtime and kept in localStorage. It is
 * deliberately NOT read from an env var or committed: this repo is
 * public and Lovable previews are shareable, so a bundled token would
 * be a published credential.
 */
export default function Connect() {
  const queryClient = useQueryClient()
  const existing = getConnection()

  const [base, setBase] = useState(existing?.base ?? DEFAULT_HUB)
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
      queryClient.invalidateQueries()
    }
    setResult(r)
    setBusy(false)
  }

  const disconnect = () => {
    clearConnection()
    setToken('')
    setResult({ ok: true, message: 'Disconnected — back to demo data.' })
    queryClient.invalidateQueries()
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6">
      <PageHeader
        title="Connect to the Hub"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Connect' }]}
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
