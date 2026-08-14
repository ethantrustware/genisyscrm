import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ListChecks } from 'lucide-react'
import { fetchLeads, useIsLive, type LeadRow } from '@/lib/api'
import {
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  StatusChip,
  SummaryCard,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'

export default function Leads() {
  const live = useIsLive()
  const [service, setService] = useState('all')
  const { data, isLoading, isError, error } = useQuery<LeadRow[]>({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={error instanceof Error ? error.message : 'Could not load.'}
      />
    )

  const all = data ?? []
  const services = Array.from(
    new Set(all.map((l) => l.serviceType).filter(Boolean) as string[]),
  )
  const rows =
    service === 'all' ? all : all.filter((l) => l.serviceType === service)

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Leads"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Leads' }]}
        subtitle={live ? undefined : 'Showing demo data.'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total leads" value={all.length} />
        <SummaryCard
          label="Roofing"
          value={all.filter((l) => l.serviceType === 'roofing').length}
        />
        <SummaryCard
          label="Solar"
          value={all.filter((l) => l.serviceType === 'solar').length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-soft transition hover:bg-muted focus:outline-none"
        >
          <option value="all">All services</option>
          {services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {rows.length} of {all.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyCard icon={ListChecks}>No leads match this filter.</EmptyCard>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Lead</th>
                  <th className="px-4 py-2.5 font-semibold">Service</th>
                  <th className="px-4 py-2.5 font-semibold">Zip</th>
                  <th className="px-4 py-2.5 font-semibold">Source</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border-soft last:border-0 hover:bg-surface-muted"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {[l.phone, l.company].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={l.serviceType === 'roofing' ? 'amber' : 'blue'}>
                        {l.serviceType ?? 'other'}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {l.zip ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {l.source.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={l.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(l.createdAt)}
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
