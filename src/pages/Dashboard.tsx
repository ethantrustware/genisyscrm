import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Inbox } from 'lucide-react'
import {
  fetchAppointments,
  fetchStats,
  useIsLive,
  type Appointment,
  type Stats,
} from '@/lib/api'
import {
  Card,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SectionLabel,
  StatusChip,
  SummaryCard,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'

export default function Dashboard() {
  const live = useIsLive()
  const stats = useQuery<Stats>({ queryKey: ['stats'], queryFn: fetchStats })
  const appts = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: fetchAppointments,
  })

  if (stats.isLoading) return <Loading />
  if (stats.isError)
    return (
      <ErrorCard
        message={
          stats.error instanceof Error
            ? stats.error.message
            : 'Could not load stats.'
        }
      />
    )

  const s = stats.data!
  const recent = (appts.data ?? []).slice(0, 6)
  const maxStatus = Math.max(1, ...s.byStatus.map((b) => b.count))

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Dashboard"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Dashboard' }]}
        subtitle={
          live
            ? undefined
            : 'Showing demo data — connect to the Hub to see live numbers.'
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Active clients" value={s.activeClients} />
        <SummaryCard
          label="Appointments booked"
          value={s.totalAppointments}
          sub="all time"
        />
        <SummaryCard
          label="Booked this week"
          value={s.appointmentsThisWeek}
          sub="last 7 days"
        />
        <SummaryCard
          label="Upcoming"
          value={s.upcomingAppointments}
          sub="not yet cancelled"
        />
      </div>

      <Card>
        <SectionLabel>Appointments by status</SectionLabel>
        <div className="flex flex-col gap-2.5">
          {s.byStatus.map((b) => (
            <div key={b.status} className="flex items-center gap-3">
              <span className="w-24 flex-shrink-0 text-xs capitalize text-muted-foreground">
                {b.status.replace(/_/g, ' ')}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(b.count / maxStatus) * 100}%` }}
                />
              </div>
              <span className="w-10 flex-shrink-0 text-right text-xs font-semibold tabular-nums">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent appointments</h2>
          <Link
            to="/calendar"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyCard icon={Inbox}>No appointments yet.</EmptyCard>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Customer</th>
                    <th className="px-4 py-2 font-semibold">Client</th>
                    <th className="px-4 py-2 font-semibold">When</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border-soft transition last:border-0 hover:bg-surface-muted"
                    >
                      <td className="px-4 py-3 font-medium">
                        {a.customerName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: a.clientColor ?? 'currentColor',
                            }}
                          />
                          <span className="text-muted-foreground">
                            {a.clientName ?? '—'}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(a.apptDateTime)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={a.status} />
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
