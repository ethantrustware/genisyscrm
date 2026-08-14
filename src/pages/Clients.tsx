import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Search, X } from 'lucide-react'
import { fetchClients, isLive, type Client } from '@/lib/api'
import {
  Avatar,
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
} from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

/**
 * Clients roster — mirrors the Hub's /clients layout: stats row, search,
 * then a grid "table" with active clients first and paused tucked into a
 * dimmed group underneath.
 */
export default function Clients() {
  const [query, setQuery] = useState('')
  const { data, isLoading, isError, error } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: fetchClients,
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={
          error instanceof Error ? error.message : 'Could not load clients.'
        }
      />
    )

  const all = data ?? []
  const q = query.trim().toLowerCase()
  const filtered = q
    ? all.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.state ?? '').toLowerCase().includes(q) ||
          (c.contactName ?? '').toLowerCase().includes(q),
      )
    : all

  const active = filtered.filter((c) => c.active)
  const paused = filtered.filter((c) => !c.active)
  const totalAppts = all.reduce((s, c) => s + c.appointmentCount, 0)

  const COLS = 'grid-cols-[2fr_110px_120px_1fr_100px]'

  const Row = ({ c }: { c: Client }) => (
    <li
      className={cn(
        'grid items-center gap-3 border-t border-border-soft px-2 py-4 transition hover:bg-surface-muted',
        COLS,
        !c.active && 'opacity-80',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={c.name} color={c.color} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{c.name}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: c.color }}
            />
            {[c.state, c.contactName].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      </div>

      <div className="tabular-nums text-sm">{c.appointmentCount}</div>

      <div>
        {c.state ? (
          <span
            className="inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `${c.color}24`,
              borderColor: `${c.color}4d`,
              color: c.color,
            }}
          >
            {c.state}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      <div className="min-w-0 text-xs text-muted-foreground">
        <p className="truncate">{c.contactEmail ?? '—'}</p>
        <p className="truncate">{c.contactPhone ?? ''}</p>
      </div>

      <div>
        <Chip tone={c.active ? 'mint' : 'muted'}>
          {c.active ? 'Active' : 'Paused'}
        </Chip>
      </div>
    </li>
  )

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Clients"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Clients' }]}
        subtitle={isLive() ? undefined : 'Showing demo data.'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Active clients"
          value={all.filter((c) => c.active).length}
          sub={paused.length > 0 ? `${paused.length} paused` : 'none paused'}
        />
        <SummaryCard label="Appointments booked" value={totalAppts} />
        <SummaryCard
          label="Avg per client"
          value={all.length ? Math.round(totalAppts / all.length) : 0}
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients, states, contacts…"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-11 text-sm shadow-soft transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyCard icon={Building2}>
          No clients match “{query}”.
        </EmptyCard>
      ) : (
        <div>
          <div
            className={cn(
              'grid items-center gap-3 px-2 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
              COLS,
            )}
          >
            <span>Client</span>
            <span>Appts</span>
            <span>State</span>
            <span>Contact</span>
            <span>Status</span>
          </div>

          <ul>
            {active.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </ul>

          {paused.length > 0 && (
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400/70" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Paused · {paused.length}
                </h3>
              </div>
              <ul className="opacity-80">
                {paused.map((c) => (
                  <Row key={c.id} c={c} />
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            {all.length} client{all.length === 1 ? '' : 's'} · oldest added{' '}
            {all.length
              ? formatDate(
                  all.reduce(
                    (min, c) => (c.createdAt < min ? c.createdAt : min),
                    all[0].createdAt,
                  ),
                )
              : '—'}
          </p>
        </div>
      )}
    </div>
  )
}
