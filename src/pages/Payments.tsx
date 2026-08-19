import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, KeyRound, RefreshCw, Stethoscope } from 'lucide-react'
import {
  fetchWhopOrders,
  probeWhop,
  type WhopOrder,
  type WhopProbe,
} from '@/lib/api'
import {
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
} from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Payments — confirmed Whop orders.
 *
 * Replaced the NCT roofing ledger, which described a line of business
 * Genisys dropped. Clients now pay for the $297/mo package through Whop,
 * so this is the record of who is actually paying.
 *
 * Read-only on purpose: refunds, voids and retries stay in Whop's own
 * dashboard. A half-built billing UI is a good way to issue a refund
 * nobody meant to.
 *
 * Money is shown in USD from Whop's `usd_total`, which is their own
 * normalisation. Summing `total` across currencies would silently add
 * euros to dollars.
 */

const WINDOWS = [30, 90, 365] as const

const usd = (n: number | null | undefined) =>
  n === null || n === undefined
    ? '—'
    : n.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: n % 1 === 0 ? 0 : 2,
      })

const dayFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** Whop's billing_reason, in words a person would use. */
const REASON: Record<string, string> = {
  subscription_create: 'New',
  subscription_cycle: 'Renewal',
  subscription_update: 'Plan change',
  one_time: 'One-time',
  manual: 'Manual',
  subscription: 'Subscription',
}

const STATUS_TONE: Record<string, 'mint' | 'amber' | 'pink' | 'muted'> = {
  paid: 'mint',
  open: 'amber',
  pending: 'amber',
  draft: 'muted',
  void: 'muted',
  uncollectible: 'pink',
  unresolved: 'pink',
}

function OrderRow({ o }: { o: WhopOrder }) {
  const when = o.paidAt ?? o.createdAt
  const refunded = (o.refunded ?? 0) > 0
  return (
    <tr className="border-b border-border-soft transition last:border-0 hover:bg-surface-muted">
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
        {when ? dayFmt.format(new Date(when)) : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="font-medium">
          {o.customerName ?? o.customerUsername ?? 'Unknown'}
        </div>
        {o.customerEmail && (
          <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {o.productTitle ?? '—'}
      </td>
      <td className="px-4 py-3">
        {o.billingReason && (
          <Chip tone="blue">{REASON[o.billingReason] ?? o.billingReason}</Chip>
        )}
      </td>
      <td className="px-4 py-3">
        <Chip tone={STATUS_TONE[o.status] ?? 'muted'}>{o.status}</Chip>
        {refunded && (
          <span className="ml-1.5 text-[11px] text-rose-500">
            &minus;{usd(o.refunded)}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
        {o.cardBrand ? `${o.cardBrand} ····${o.cardLast4 ?? ''}` : '—'}
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums">
        {usd(o.usdTotal)}
      </td>
    </tr>
  )
}

/**
 * Diagnostic for a rejected Whop key.
 *
 * Whop answers a bad request with the same "not authorized" wording
 * whether the key lacks scopes, the company can't be inferred, or a
 * parameter is malformed. This runs the call several ways and reads the
 * answer off which ones worked, rather than leaving Alex to guess.
 *
 * It lives behind a button because the endpoint needs a bearer token —
 * pasting its URL into a browser only ever returns 401.
 */
function WhopDiagnostic() {
  const [result, setResult] = useState<WhopProbe | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      setResult(await probeWhop())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Diagnostic failed.')
    }
    setBusy(false)
  }

  // Read the verdict off the pattern of successes.
  const verdict = (() => {
    if (!result) return null
    const ok = result.attempts.filter((a) => a.ok)
    const identify = result.attempts.find((a) => a.label.startsWith('identify'))

    // The key-identity call is the fork in the road: it separates a key
    // that is wrong from a key that is merely missing payment scopes.
    if (identify && !identify.ok) {
      return {
        tone: 'bad' as const,
        text: 'Whop will not even identify this key, so it is the key itself rather than anything about payments. Two things to check: that it is a Company/Account API key and not an App key (an App key has no company of its own to read), and that it has been given Admin or full read permissions. Re-run this after changing it.',
      }
    }
    if (identify?.ok && ok.length === 1) {
      return {
        tone: 'warn' as const,
        text: 'The key is valid — Whop identified it — but every payments call was refused. That is a permissions problem specific to payments: the key needs the payment, plan, product and member read scopes. Granting Admin is the quickest way to confirm.',
      }
    }
    if (ok.length === 0) {
      return {
        tone: 'bad' as const,
        text: 'Whop refused every shape, so this is the key itself — not how we are calling it. Open the key in Whop and grant it Admin (or all read permissions). Also check it is a Company/Account key rather than an App key: an App key has no company of its own to read.',
      }
    }
    if (ok.some((a) => a.label === 'bare (no filters)') && ok.length < result.attempts.length) {
      return {
        tone: 'warn' as const,
        text: 'The plain call works and a filtered one does not, so the key is fine and our query parameters are wrong. Send this to Claude — it is a small fix.',
      }
    }
    return {
      tone: 'good' as const,
      text: 'Whop accepted the call. If orders still are not showing, the account may simply have none in this window yet.',
    }
  })()

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Work out what Whop wants</h2>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Testing…' : 'Run diagnostic'}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Sends the same request several ways and reports which Whop accepts.
        Your API key is never shown or returned.
      </p>

      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

      {result && (
        <div className="mt-4 flex flex-col gap-3">
          {verdict && (
            <div
              className={cn(
                'rounded-xl border p-3 text-sm',
                verdict.tone === 'good' &&
                  'border-emerald-500/40 bg-emerald-500/5',
                verdict.tone === 'warn' && 'border-amber-500/40 bg-amber-500/5',
                verdict.tone === 'bad' && 'border-rose-500/40 bg-rose-500/5',
              )}
            >
              {verdict.text}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Company ID configured:{' '}
            <span className="font-medium text-foreground">
              {result.companyIdConfigured ? 'yes' : 'no'}
            </span>
          </p>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[34rem] text-xs">
              <thead className="bg-surface-muted text-left uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Request</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Whop said</th>
                </tr>
              </thead>
              <tbody>
                {result.attempts.map((a) => (
                  <tr key={a.label} className="border-t border-border-soft">
                    <td className="px-3 py-2 font-medium">{a.label}</td>
                    <td className="px-3 py-2">
                      <Chip tone={a.ok ? 'mint' : 'pink'}>{a.status}</Chip>
                    </td>
                    <td className="max-w-md break-words px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {a.ok ? 'OK' : a.body || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Payments() {
  const [days, setDays] = useState<number>(90)
  const [status, setStatus] = useState<'paid' | 'all'>('paid')

  const q = useQuery({
    queryKey: ['whop-orders', days, status],
    queryFn: () => fetchWhopOrders(days, status),
    refetchOnWindowFocus: false,
    staleTime: 120_000,
  })

  const data = q.data

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Payments"
        subtitle="Confirmed orders from Whop."
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Payments' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-border p-1">
              {WINDOWS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-sm font-medium transition',
                    days === d
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {d === 365 ? '1y' : `${d}d`}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-xl border border-border p-1">
              {(['paid', 'all'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-sm font-medium capitalize transition',
                    status === s
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => q.refetch()}
              disabled={q.isFetching}
              aria-label="Refresh"
              className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={cn('h-4 w-4', q.isFetching && 'animate-spin')}
              />
            </button>
          </div>
        }
      />

      {q.isLoading && <Loading />}
      {q.isError && <ErrorCard message={(q.error as Error).message} />}

      {/* Not connected — a normal first-run state, not a failure. */}
      {data && !data.configured && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary-soft">
              <KeyRound className="size-5 text-primary" />
            </div>
            <h2 className="text-base font-semibold">
              Whop isn&apos;t connected
            </h2>
            <p className="text-sm text-muted-foreground">
              Add your Whop API key to the Hub&apos;s Vault and orders will
              appear here. Nothing else needs configuring.
            </p>
            <ul className="mt-1 w-full space-y-1.5 rounded-xl border border-border bg-surface-muted p-3 text-left text-xs">
              <li>
                <span className="font-semibold">Vault entry name:</span>{' '}
                <code>Whop API Key</code>
              </li>
              <li>
                <span className="font-semibold">Optional:</span>{' '}
                <code>Whop Company ID</code> — only needed if the key covers
                more than one company.
              </li>
              <li className="text-muted-foreground">
                The key needs read scopes for payments, members and products.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Connected but Whop refused — show its own words, they're actionable. */}
      {data?.configured && data.error && (
        <>
          <ErrorCard message={`Whop: ${data.error}`} />
          <WhopDiagnostic />
        </>
      )}

      {data?.configured && !data.error && data.summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Last 30 days"
              value={usd(data.summary.last30Usd)}
              sub={`${data.summary.last30Count} order${
                data.summary.last30Count === 1 ? '' : 's'
              }`}
            />
            <SummaryCard
              label={`Gross · ${days === 365 ? '1y' : `${days}d`}`}
              value={usd(data.summary.grossUsd)}
              sub={`${data.summary.paidCount} paid`}
            />
            <SummaryCard
              label="Net after fees"
              value={usd(data.summary.netUsd)}
              sub={
                data.summary.refundedUsd > 0
                  ? `${usd(data.summary.refundedUsd)} refunded`
                  : undefined
              }
            />
            <SummaryCard
              label="Paying customers"
              value={data.summary.customers}
              sub="distinct"
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Orders ({data.orders.length})
              </h2>
              {data.truncated && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  showing the most recent {data.orders.length} — narrow the
                  window to see all
                </span>
              )}
            </div>

            {data.orders.length === 0 ? (
              <EmptyCard icon={CreditCard}>
                No {status === 'paid' ? 'confirmed' : ''} orders in this window.
              </EmptyCard>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[52rem] text-sm">
                    <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Date</th>
                        <th className="px-4 py-2 font-semibold">Customer</th>
                        <th className="px-4 py-2 font-semibold">Product</th>
                        <th className="px-4 py-2 font-semibold">Type</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                        <th className="px-4 py-2 font-semibold">Card</th>
                        <th className="px-4 py-2 text-right font-semibold">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => (
                        <OrderRow key={o.id} o={o} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              Amounts are USD, using Whop&apos;s own conversion so mixed
              currencies add up correctly. Refunds, retries and voids are
              handled in Whop — this view is read-only.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
