import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, ClipboardList } from 'lucide-react'
import { fetchToday, useIsLive, type TodayData } from '@/lib/api'
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
import { cn, formatDate } from '@/lib/utils'

const PRIORITY_TONE = { high: 'pink', medium: 'amber', low: 'blue' } as const

export default function Today() {
  const live = useIsLive()
  const { data, isLoading, isError, error } = useQuery<TodayData>({
    queryKey: ['today'],
    queryFn: fetchToday,
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
        title="Today"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Today' }]}
        subtitle={live ? undefined : 'Showing demo data.'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard label="Open tasks" value={d.counts.openTasks} />
        <SummaryCard
          label="Appointments today"
          value={d.counts.appointmentsToday}
        />
      </div>

      <Card>
        <SectionLabel>Tasks</SectionLabel>
        {d.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on the list.</p>
        ) : (
          <ul className="flex flex-col">
            {d.tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 border-t border-border-soft py-3 first:border-t-0"
              >
                {t.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      t.done && 'text-muted-foreground line-through',
                    )}
                  >
                    {t.title}
                  </p>
                  {t.notes && (
                    <p className="text-xs text-muted-foreground">{t.notes}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t.owner ?? 'Unassigned'}
                    {t.dueAt ? ` · due ${formatDate(t.dueAt)}` : ''}
                  </p>
                </div>
                <Chip
                  tone={
                    PRIORITY_TONE[t.priority as keyof typeof PRIORITY_TONE] ??
                    'muted'
                  }
                >
                  {t.priority}
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold">On the calendar today</h2>
        {d.appointments.length === 0 ? (
          <EmptyCard icon={ClipboardList}>
            No appointments scheduled today.
          </EmptyCard>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Time</th>
                    <th className="px-4 py-2.5 font-semibold">Customer</th>
                    <th className="px-4 py-2.5 font-semibold">Client</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {d.appointments.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border-soft last:border-0 hover:bg-surface-muted"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(a.apptDateTime)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{a.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.customerPhone ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: a.clientColor ?? 'currentColor',
                            }}
                          />
                          {a.clientName ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={a.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={a.dispatchStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
