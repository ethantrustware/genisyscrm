import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { fetchAgents, useIsLive, type Agent } from '@/lib/api'
import {
  Avatar,
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'

const ROLE_TONE = {
  admin: 'violet',
  member: 'blue',
  agent: 'mint',
} as const

export default function Agents() {
  const live = useIsLive()
  const { data, isLoading, isError, error } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={error instanceof Error ? error.message : 'Could not load.'}
      />
    )

  const agents = data ?? []
  const booked = agents.reduce((s, a) => s + a.appointmentCount, 0)

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Agents"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Agents' }]}
        subtitle={live ? undefined : 'Showing demo data.'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="People" value={agents.length} />
        <SummaryCard label="Appointments booked" value={booked} />
        <SummaryCard
          label="Avg per person"
          value={agents.length ? Math.round(booked / agents.length) : 0}
        />
      </div>

      {agents.length === 0 ? (
        <EmptyCard icon={Users}>No agents yet.</EmptyCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <Avatar name={a.name ?? a.email ?? '?'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {a.name ?? '—'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.email ?? ''}
                  </p>
                </div>
                <Chip
                  tone={ROLE_TONE[a.role as keyof typeof ROLE_TONE] ?? 'muted'}
                >
                  {a.role}
                </Chip>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-border-soft pt-3">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Booked
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {a.appointmentCount}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {a.lastBookingAt
                  ? `Last ${formatDate(a.lastBookingAt)}`
                  : 'No bookings yet'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
