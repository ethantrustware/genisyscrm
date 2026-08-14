import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Video, X } from 'lucide-react'
import { fetchCalendarEvents, useIsLive, type CalEvent } from '@/lib/api'
import {
  ErrorCard,
  Loading,
  PageHeader,
  StatusChip,
  SummaryCard,
} from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Calendar — month grid over every sub-account's events plus iCal feeds,
 * matching the Hub's view rather than the appointment tracker.
 *
 * The grid is built from a Monday-start 6-week window so the shape never
 * jumps between months; days outside the current month are dimmed.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const timeOf = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''

function isCancelled(status: string | null) {
  const s = (status ?? '').toLowerCase()
  return s.includes('cancel') || s.includes('noshow') || s.includes('no_show')
}

export default function Calendar() {
  const live = useIsLive()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [subFilter, setSubFilter] = useState<string>('all')
  const [selected, setSelected] = useState<string | null>(null)

  // Query a slightly wider window than the month so events sitting in the
  // leading/trailing grid days are present rather than mysteriously absent.
  const { gridStart, gridEnd, monthStart, monthEnd } = useMemo(() => {
    const first = new Date(year, month, 1)
    const start = new Date(first)
    start.setDate(start.getDate() - ((first.getDay() + 6) % 7))
    const end = new Date(start)
    end.setDate(end.getDate() + 42)
    return {
      gridStart: start,
      gridEnd: end,
      monthStart: first,
      monthEnd: new Date(year, month + 1, 0, 23, 59, 59),
    }
  }, [year, month])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['calendar-events', year, month],
    queryFn: () => fetchCalendarEvents(gridStart, gridEnd),
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={error instanceof Error ? error.message : 'Could not load.'}
      />
    )

  const all = data?.events ?? []
  const subs = data?.subAccounts ?? []
  const events =
    subFilter === 'all' ? all : all.filter((e) => e.subAccount === subFilter)

  const inMonth = events.filter((e) => {
    if (!e.startTime) return false
    const t = new Date(e.startTime).getTime()
    return t >= monthStart.getTime() && t <= monthEnd.getTime()
  })

  const byDay = new Map<string, CalEvent[]>()
  for (const e of events) {
    if (!e.startTime) continue
    const key = new Date(e.startTime).toDateString()
    byDay.set(key, [...(byDay.get(key) ?? []), e])
  }

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const today = new Date().toDateString()
  const selectedEvents = selected ? (byDay.get(selected) ?? []) : []

  const step = (delta: number) => {
    const m = month + delta
    if (m < 0) {
      setMonth(11)
      setYear(year - 1)
    } else if (m > 11) {
      setMonth(0)
      setYear(year + 1)
    } else setMonth(m)
    setSelected(null)
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
      <PageHeader
        title="Calendar"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Calendar' }]}
        subtitle={live ? undefined : 'Showing demo data.'}
        actions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous month"
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-semibold">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next month"
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setYear(now.getFullYear())
                setMonth(now.getMonth())
                setSelected(null)
              }}
              className="ml-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              Today
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="This month" value={inMonth.length} />
        <SummaryCard
          label="Confirmed"
          value={inMonth.filter((e) => !isCancelled(e.status)).length}
        />
        <SummaryCard
          label="Cancelled / no show"
          value={inMonth.filter((e) => isCancelled(e.status)).length}
        />
        <SummaryCard
          label="With a join link"
          value={inMonth.filter((e) => e.joinUrl).length}
        />
      </div>

      {subs.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubFilter('all')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              subFilter === 'all'
                ? 'bg-primary-soft text-primary'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            All calendars
          </button>
          {subs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubFilter(s.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                subFilter === s.id
                  ? 'bg-primary-soft text-primary'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-surface-muted">
          {DOW.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((d) => {
            const key = d.toDateString()
            const list = byDay.get(key) ?? []
            const other = d.getMonth() !== month
            const isToday = key === today
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(list.length ? key : null)}
                className={cn(
                  'min-h-[92px] border-b border-r border-border-soft p-1.5 text-left align-top transition',
                  other && 'opacity-40',
                  isToday && 'bg-primary-soft/40',
                  list.length > 0 && 'hover:bg-surface-muted',
                  selected === key && 'ring-2 ring-inset ring-primary/50',
                )}
              >
                <span
                  className={cn(
                    'inline-block text-[11px] font-semibold tabular-nums',
                    isToday ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {d.getDate()}
                </span>

                <span className="mt-1 flex flex-col gap-1">
                  {list.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className={cn(
                        'block truncate rounded px-1 py-0.5 text-[10px]',
                        isCancelled(e.status)
                          ? 'bg-muted text-muted-foreground line-through'
                          : 'bg-primary/10 text-primary',
                      )}
                    >
                      {timeOf(e.startTime)} {e.contactName ?? e.title}
                    </span>
                  ))}
                  {list.length > 3 && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{list.length - 3} more
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {selected && selectedEvents.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {new Date(selected).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}{' '}
              · {selectedEvents.length}
            </h3>
            <button type="button" onClick={() => setSelected(null)}>
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {selectedEvents.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border-soft bg-surface-muted px-3 py-2.5"
              >
                <span className="w-[86px] flex-shrink-0 text-xs font-semibold tabular-nums">
                  {timeOf(e.startTime)}
                  {e.endTime && (
                    <span className="block font-normal text-muted-foreground">
                      – {timeOf(e.endTime)}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {e.contactName ? `${e.contactName} · ` : ''}
                    {e.title}
                  </span>
                  {e.subAccountName && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {e.subAccountName}
                    </span>
                  )}
                </span>

                {e.status && <StatusChip status={e.status} />}

                {e.joinUrl ? (
                  <a
                    href={e.joinUrl}
                    target={e.joinKind === 'phone' ? undefined : '_blank'}
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    <Video className="h-3.5 w-3.5" />
                    {e.joinLabel ?? 'Join'}
                  </a>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    No link
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {inMonth.length === 0 && (
        <p className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Nothing scheduled in {MONTHS[month]}.
        </p>
      )}
    </div>
  )
}
