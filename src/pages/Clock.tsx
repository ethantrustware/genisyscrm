import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock as ClockIcon,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import {
  addDays,
  clockPunch,
  closeShift,
  fetchClock,
  formatDuration,
  startOfWeek,
  useIsLive,
  type ClockEntry,
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
 * Clock — staff punch in/out, plus the admin view of everyone's week.
 *
 * All week math happens here, in the browser, and the resolved window is
 * sent to the Hub as explicit timestamps. The team spans timezones, so
 * "this week" only means something relative to the person looking at it.
 */

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})
const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

/**
 * Minutes of a shift that fall inside a given local day.
 *
 * A shift can straddle midnight — Mary's evening runs into the next
 * calendar day for the US team — so a shift is clipped to each day it
 * touches rather than being filed under the day it started. Otherwise
 * an 8-hour overnight shows as 8 hours on Monday and zero on Tuesday.
 */
function minutesOnDay(entry: ClockEntry, dayStart: Date, now: number): number {
  const dayEnd = addDays(dayStart, 1).getTime()
  const start = new Date(entry.clockInAt).getTime()
  const end = entry.clockOutAt ? new Date(entry.clockOutAt).getTime() : now
  const overlap =
    Math.min(end, dayEnd) - Math.max(start, dayStart.getTime())
  return overlap > 0 ? Math.round(overlap / 60000) : 0
}

function PunchCard({
  current,
  onPunch,
  pending,
  error,
}: {
  current: ClockEntry | null
  onPunch: (action: 'in' | 'out', note?: string) => void
  pending: boolean
  error: string | null
}) {
  const [note, setNote] = useState('')
  // Re-render every 30s so an open shift's running total stays honest
  // without the user reloading.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!current) return
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [current])

  const runningMinutes = current
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(current.clockInAt).getTime()) / 60000),
      )
    : 0

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full',
                current ? 'bg-emerald-500' : 'bg-muted-foreground/40',
              )}
            />
            <p className="text-sm font-medium text-foreground">
              {current ? 'On the clock' : 'Not clocked in'}
            </p>
          </div>
          {current ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Since {timeFmt.format(new Date(current.clockInAt))} ·{' '}
              <span className="tabular-nums font-medium text-foreground">
                {formatDuration(runningMinutes)}
              </span>{' '}
              so far
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Clock in when you start your shift.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            onPunch(current ? 'out' : 'in', note.trim() || undefined)
            setNote('')
          }}
          className={cn(
            'inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition',
            'disabled:cursor-not-allowed disabled:opacity-60',
            current
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-emerald-600 hover:bg-emerald-700',
          )}
        >
          {current ? (
            <LogOut className="h-4 w-4" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {pending ? 'Saving…' : current ? 'Clock out' : 'Clock in'}
        </button>
      </div>

      {current && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Optional note for this shift (what you worked on, coverage, etc.)"
          className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      )}

      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

export default function Clock() {
  const live = useIsLive()
  const qc = useQueryClient()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [scope, setScope] = useState<'me' | 'all'>('me')
  const [punchError, setPunchError] = useState<string | null>(null)

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const key = ['clock', weekStart.toISOString(), scope] as const
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchClock({ from: weekStart, to: weekEnd, scope }),
    enabled: live,
    // An open shift's elapsed time is computed server-side, so refresh
    // often enough that the roster doesn't go stale while someone
    // watches it.
    refetchInterval: 60_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['clock'] })

  const punch = useMutation({
    mutationFn: (v: { action: 'in' | 'out'; note?: string }) =>
      clockPunch(v.action, v.note),
    onSuccess: () => {
      setPunchError(null)
      invalidate()
    },
    onError: (e: Error) => setPunchError(e.message),
  })

  const close = useMutation({
    mutationFn: (id: string) => closeShift(id, new Date()),
    onSuccess: invalidate,
    onError: (e: Error) => setPunchError(e.message),
  })

  if (!live) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Clock"
          subtitle="Clock in and out of your shift."
          breadcrumbs={[{ label: 'Genisys' }, { label: 'Clock' }]}
        />
        <EmptyCard icon={ClockIcon}>
          Sign in to clock in — the demo has no account behind it.
        </EmptyCard>
      </div>
    )
  }

  if (q.isLoading) return <Loading />
  if (q.isError) {
    return <ErrorCard message={(q.error as Error).message} />
  }

  const data = q.data!
  const isAdmin = data.isAdmin
  const now = Date.now()

  // Group into rows: one per person in `all` scope, a single row in
  // `me` scope. Sorting by name keeps the grid stable across refetches
  // — otherwise rows jump as shifts open and close.
  const byUser = new Map<string, { name: string; entries: ClockEntry[] }>()
  for (const e of data.entries) {
    const row = byUser.get(e.userId)
    if (row) row.entries.push(e)
    else
      byUser.set(e.userId, {
        name: e.userName ?? e.userEmail,
        entries: [e],
      })
  }
  const rows = [...byUser.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const weekMinutes = data.entries.reduce(
    (sum, e) =>
      sum + days.reduce((d, day) => d + minutesOnDay(e, day, now), 0),
    0,
  )
  const openForgotten = data.entries.filter(
    (e) => e.open && new Date(e.clockInAt).getTime() < now - 16 * 3600_000,
  )

  const isThisWeek =
    weekStart.getTime() === startOfWeek(new Date()).getTime()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clock"
        subtitle="Clock in and out of your shift. Hours roll up by week."
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Clock' }]}
      />

      <PunchCard
        current={data.current}
        pending={punch.isPending}
        error={punchError}
        onPunch={(action, note) => punch.mutate({ action, note })}
      />

      {isAdmin && data.onNow.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              On the clock right now
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.onNow.map((e) => (
              <Chip key={e.id} tone="mint">
                {e.userName ?? e.userEmail} · {formatDuration(e.minutes)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Week navigation + scope toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[13rem] text-center text-sm font-medium text-foreground">
            {isThisWeek ? 'This week' : `Week of ${dayFmt.format(weekStart)}`}
          </span>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isThisWeek && (
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="text-sm text-primary hover:underline"
            >
              Today
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="inline-flex rounded-xl border border-border p-1">
            {(['me', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  scope === s
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s === 'me' ? 'My hours' : 'Everyone'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label={scope === 'all' ? 'Team hours this week' : 'My hours this week'}
          value={formatDuration(weekMinutes)}
        />
        {/* "People: 1" is a useless card when you're looking at your own
            hours, so that slot shows shift count instead. */}
        {scope === 'all' ? (
          <SummaryCard label="People" value={rows.length} />
        ) : (
          <SummaryCard label="Shifts this week" value={data.entries.length} />
        )}
        <SummaryCard
          label="Shifts left open"
          value={openForgotten.length}
          tone={openForgotten.length > 0 ? 'bad' : 'default'}
          sub={openForgotten.length > 0 ? 'Running over 16h' : undefined}
        />
      </div>

      {/* Weekly grid */}
      {rows.length === 0 ? (
        <EmptyCard icon={ClockIcon}>
          No shifts recorded this week.
        </EmptyCard>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Person</th>
                {days.map((d, i) => (
                  <th key={i} className="px-3 py-3 text-center font-medium">
                    <div>{DAY_LABELS[i]}</div>
                    <div className="font-normal normal-case text-muted-foreground/70">
                      {d.getDate()}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const perDay = days.map((d) =>
                  row.entries.reduce((s, e) => s + minutesOnDay(e, d, now), 0),
                )
                const total = perDay.reduce((a, b) => a + b, 0)
                return (
                  <tr
                    key={row.userId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.name}
                    </td>
                    {perDay.map((m, i) => (
                      <td
                        key={i}
                        className={cn(
                          'px-3 py-3 text-center tabular-nums',
                          m === 0
                            ? 'text-muted-foreground/40'
                            : 'text-foreground',
                        )}
                      >
                        {m === 0 ? '—' : formatDuration(m)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatDuration(total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Shift detail */}
      {data.entries.length > 0 && (
        <div className="rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">
            Shifts
          </h2>
          <ul>
            {data.entries.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-5 py-3 text-sm last:border-0"
              >
                <span className="w-36 flex-shrink-0 text-muted-foreground">
                  {dayFmt.format(new Date(e.clockInAt))}
                </span>
                {scope === 'all' && (
                  <span className="w-40 flex-shrink-0 font-medium text-foreground">
                    {e.userName ?? e.userEmail}
                  </span>
                )}
                <span className="tabular-nums text-foreground">
                  {timeFmt.format(new Date(e.clockInAt))} –{' '}
                  {e.clockOutAt
                    ? timeFmt.format(new Date(e.clockOutAt))
                    : 'now'}
                </span>
                <span className="tabular-nums font-medium text-foreground">
                  {formatDuration(e.minutes)}
                </span>
                {e.open && <Chip tone="mint">Open</Chip>}
                {e.closedByAdmin && <Chip tone="amber">Closed by admin</Chip>}
                {e.note && (
                  <span className="text-muted-foreground">{e.note}</span>
                )}
                {isAdmin && e.open && (
                  <button
                    type="button"
                    disabled={close.isPending}
                    onClick={() => close.mutate(e.id)}
                    className="ml-auto rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
                  >
                    Close now
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
