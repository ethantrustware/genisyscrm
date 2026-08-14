import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarX2, ShieldCheck } from 'lucide-react'
import { fetchAppointments, useIsLive, type Appointment } from '@/lib/api'
import {
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  StatusChip,
  statusTone,
} from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

/**
 * Appointment ledger. Customer phone/email arrive already masked from
 * the Hub's external API — this app never receives raw consumer PII.
 */
export default function Appointments() {
  const live = useIsLive()
  const [client, setClient] = useState('all')
  const [status, setStatus] = useState('all')

  const { data, isLoading, isError, error } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: fetchAppointments,
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={
          error instanceof Error
            ? error.message
            : 'Could not load appointments.'
        }
      />
    )

  const all = data ?? []
  const clients = Array.from(
    new Set(all.map((a) => a.clientName).filter(Boolean) as string[]),
  )
  const statuses = Array.from(new Set(all.map((a) => a.status)))

  const rows = all.filter(
    (a) =>
      (client === 'all' || a.clientName === client) &&
      (status === 'all' || a.status === status),
  )

  const pill =
    'inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-soft transition hover:bg-muted focus:outline-none'

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Appointments"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Appointments' }]}
        subtitle={live ? undefined : 'Showing demo data.'}
      />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={client}
          onChange={(e) => setClient(e.target.value)}
          className={pill}
        >
          <option value="all">All clients</option>
          {clients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={pill}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {rows.length} of {all.length}
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border-soft bg-surface-muted p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Customer phone numbers and emails are masked by the Hub before they
          reach this app — designing against real shapes without exposing real
          contact details.
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyCard icon={CalendarX2}>
          No appointments match these filters.
        </EmptyCard>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Appointment</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold">Client</th>
                  <th className="px-4 py-2.5 font-semibold">County</th>
                  <th className="px-4 py-2.5 font-semibold">Bill</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Dispatch</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border-soft transition last:border-0 hover:bg-surface-muted"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(a.apptDateTime)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.customerPhone ?? '—'}
                      </p>
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
                      {a.county ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {a.monthlyBill ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Chip
                        tone={statusTone(a.dispatchStatus)}
                        className={cn(
                          a.dispatchStatus === 'not_dispatched' && 'opacity-70',
                        )}
                      >
                        {a.dispatchStatus.replace(/_/g, ' ')}
                      </Chip>
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
