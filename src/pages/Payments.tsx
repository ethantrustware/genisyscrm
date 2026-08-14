import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { fetchPayments, useIsLive, type PaymentsData } from '@/lib/api'
import {
  Card,
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SectionLabel,
  StatusChip,
  SummaryCard,
} from '@/components/ui'
import { cn, formatDate, money } from '@/lib/utils'

/** NCT roofing-lead billing — our own ledger, not Stripe/Mercury directly. */
export default function Payments() {
  const live = useIsLive()
  const { data, isLoading, isError, error } = useQuery<PaymentsData>({
    queryKey: ['payments'],
    queryFn: fetchPayments,
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={error instanceof Error ? error.message : 'Could not load.'}
      />
    )

  const d = data!

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Payments"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Payments' }]}
        subtitle={
          live ? 'NCT roofing-lead billing.' : 'Showing demo data.'
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Billed this week"
          value={money(d.week.chargedCents)}
          sub={`${d.week.leadCount} leads`}
        />
        <SummaryCard label="NCT cost" value={money(d.week.costCents)} />
        <SummaryCard label="Margin" value={money(d.week.marginCents)} />
        <SummaryCard
          label="Needs attention"
          value={d.leads.filter((l) => l.chargeStatus !== 'charged').length}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Roofing clients</h2>
        {d.clients.length === 0 ? (
          <EmptyCard icon={Receipt}>No roofing clients configured.</EmptyCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {d.clients.map((c) => {
              const pct =
                c.weeklyCapCents > 0
                  ? Math.min(100, (c.weekSpentCents / c.weeklyCapCents) * 100)
                  : 0
              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.clientName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.contactName ?? ''}
                      </p>
                    </div>
                    <Chip tone={c.active ? 'mint' : 'muted'}>
                      {c.active ? 'Active' : 'Paused'}
                    </Chip>
                  </div>
                  <p className="mt-2 text-sm">
                    {money(c.pricePerLeadCents)} per lead
                    <span className="text-muted-foreground">
                      {' '}
                      · costs {money(c.costPerLeadCents)}
                    </span>
                  </p>
                  {!c.hasStripeId && (
                    <p className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      No Stripe customer ID — leads held
                    </p>
                  )}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">This week</span>
                      <span className="font-medium tabular-nums">
                        {money(c.weekSpentCents)}
                        {c.weeklyCapCents > 0
                          ? ` / ${money(c.weeklyCapCents)}`
                          : ' (uncapped)'}
                      </span>
                    </div>
                    {c.weeklyCapCents > 0 && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            pct >= 100
                              ? 'bg-rose-500'
                              : pct >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Recent NCT leads</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Received</th>
                  <th className="px-4 py-2.5 font-semibold">Lead</th>
                  <th className="px-4 py-2.5 font-semibold">Client</th>
                  <th className="px-4 py-2.5 font-semibold">Charged</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.leads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border-soft last:border-0 hover:bg-surface-muted"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(l.receivedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.name ?? '—'}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {l.leadId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.clientName ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {l.chargeStatus === 'charged'
                        ? money(l.amountCents)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={l.chargeStatus} />
                      {l.failureReason && (
                        <p className="mt-0.5 max-w-[220px] text-[11px] text-muted-foreground">
                          {l.failureReason}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {d.sweeps.length > 0 && (
        <Card>
          <SectionLabel>Stripe to Mercury sweeps</SectionLabel>
          <ul className="flex flex-col">
            {d.sweeps.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between border-t border-border-soft py-2 text-sm first:border-t-0"
              >
                <span className="text-xs text-muted-foreground">
                  {formatDate(s.createdAt)} · {s.method}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium tabular-nums">
                    {money(s.amountCents)}
                  </span>
                  <StatusChip status={s.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
