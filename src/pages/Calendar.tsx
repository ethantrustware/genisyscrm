import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchCalendar, useIsLive, type CalendarAppt } from '@/lib/api'
import {
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  StatusChip,
} from '@/components/ui'
import { cn } from '@/lib/utils'

/** Monday-start week containing `d`. */
function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

const DAY_LABEL = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

const TIME = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

export default function Calendar() {
  const live = useIsLive()
  const [offset, setOffset] = useState(0)

  const start = weekStart(new Date())
  start.setDate(start.getDate() + offset * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['calendar', start.toISOString()],
    queryFn: () => fetchCalendar(start.toISOString(), end.toISOString()),
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={error instanceof Error ? error.message : 'Could not load.'}
      />
    )

  const appts = data?.appointments ?? []
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })

  const byDay = new Map<string, CalendarAppt[]>()
  for (const a of appts) {
    const key = new Date(a.apptDateTime).toDateString()
    byDay.set(key, [...(byDay.get(key) ?? []), a])
  }

  const today = new Date().toDateString()

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
      <PageHeader
        title="Calendar"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Calendar' }]}
        subtitle={
          live ? `${appts.length} this week` : 'Showing demo data.'
        }
        actions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOffset((o) => o - 1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-muted"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => o + 1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-muted"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {appts.length === 0 ? (
        <EmptyCard icon={CalendarDays}>
          Nothing scheduled this week.
        </EmptyCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {days.map((d) => {
            const list = byDay.get(d.toDateString()) ?? []
            const isToday = d.toDateString() === today
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  'rounded-2xl border bg-card p-3',
                  isToday ? 'border-primary/40 shadow-soft' : 'border-border',
                )}
              >
                <p
                  className={cn(
                    'mb-2 text-[11px] font-semibold uppercase tracking-wider',
                    isToday ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {DAY_LABEL(d)}
                  {isToday && ' · today'}
                </p>

                {list.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    —
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {list.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-border-soft bg-surface-muted p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold tabular-nums">
                            {TIME(a.apptDateTime)}
                          </span>
                          <StatusChip status={a.status} />
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">
                          {a.customerName}
                        </p>
                        {a.clientName && (
                          <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                            <span
                              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                              style={{
                                backgroundColor: a.clientColor ?? 'currentColor',
                              }}
                            />
                            {a.clientName}
                          </p>
                        )}
                        {a.address && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block truncate text-[11px] text-primary hover:underline"
                          >
                            {a.address}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
