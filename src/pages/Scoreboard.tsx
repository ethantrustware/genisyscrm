import { useQuery } from '@tanstack/react-query'
import { Flame, Trophy } from 'lucide-react'
import { fetchStaffBookings, type Booking } from '@/lib/api'
import { ErrorCard, Loading, PageHeader } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Scoreboard — the same numbers as Staff Bookings, dressed to be looked
 * at rather than audited.
 *
 * Deliberately reads the identical endpoint. A morale screen that
 * disagrees with the operational one is worse than no morale screen,
 * because the first thing anyone does when they don't like their number
 * is go and check it somewhere else.
 *
 * The hard design problem here is the empty state, not the full one.
 * Genisys has barely any bookings yet, and a podium of zeros reads as
 * "nobody is doing anything". So an unclaimed position is framed as
 * available — "open", "first one takes it" — which is true, and reads as
 * an invitation rather than an indictment.
 */

/** Per-rep daily floor from the onboarding guide. */
const DAILY_TARGET = 3

const dayFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Monday 00:00 — a work week, not a calendar one. */
function startOfWeek(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

type Standing = {
  key: string
  name: string
  today: number
  week: number
  month: number
}

function buildStandings(
  reps: Array<{ vaultName: string; locationName: string; error?: string }>,
  bookings: Booking[],
): Standing[] {
  const today = startOfToday()
  const week = startOfWeek()
  const month = Date.now() - 30 * 86400_000

  return reps
    .filter((r) => !r.error)
    .map((r) => {
      const mine = bookings.filter((b) => b.vaultName === r.vaultName)
      const at = (b: Booking) =>
        b.bookedAt ? new Date(b.bookedAt).getTime() : 0
      return {
        key: r.vaultName,
        name: r.locationName,
        today: mine.filter((b) => at(b) >= today).length,
        week: mine.filter((b) => at(b) >= week).length,
        month: mine.filter((b) => at(b) >= month).length,
      }
    })
    .sort((a, b) => b.week - a.week || b.month - a.month)
}

/* -------------------------------------------------------------------------- */

const PODIUM = [
  {
    place: 1,
    height: 'h-28',
    ring: 'ring-amber-400/60',
    glow: 'from-amber-400/25',
    text: 'text-amber-500',
    label: '1st',
  },
  {
    place: 2,
    height: 'h-20',
    ring: 'ring-slate-400/50',
    glow: 'from-slate-400/20',
    text: 'text-slate-400',
    label: '2nd',
  },
  {
    place: 3,
    height: 'h-14',
    ring: 'ring-orange-700/50',
    glow: 'from-orange-700/20',
    text: 'text-orange-600 dark:text-orange-500',
    label: '3rd',
  },
]

function Podium({ standings }: { standings: Standing[] }) {
  // Visual order puts 2nd on the left and 1st in the middle, which is how
  // a podium actually looks.
  const order = [1, 0, 2]

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-6 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold">This week</h2>
      </div>

      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {order.map((idx) => {
          const spec = PODIUM[idx]
          const s = standings[idx]
          const claimed = s && s.week > 0

          return (
            <div
              key={spec.place}
              className="flex w-24 flex-col items-center gap-2 sm:w-32"
            >
              <span
                className={cn(
                  'text-2xl font-bold tabular-nums sm:text-3xl',
                  claimed ? spec.text : 'text-muted-foreground/30',
                )}
              >
                {claimed ? s.week : '—'}
              </span>

              <span
                className={cn(
                  'max-w-full truncate text-center text-xs font-medium',
                  claimed ? 'text-foreground' : 'text-muted-foreground/50',
                )}
                title={claimed ? s.name : undefined}
              >
                {claimed ? s.name : 'Open'}
              </span>

              <div
                className={cn(
                  'flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b to-transparent pt-2 ring-1',
                  spec.height,
                  claimed
                    ? `${spec.glow} ${spec.ring}`
                    : 'from-muted/40 ring-border',
                )}
              >
                <span
                  className={cn(
                    'text-[11px] font-bold uppercase tracking-wider',
                    claimed ? spec.text : 'text-muted-foreground/40',
                  )}
                >
                  {spec.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {standings.every((s) => s.week === 0) && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Nothing on the board yet this week. First booking takes the top
          spot.
        </p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export default function Scoreboard() {
  const q = useQuery({
    queryKey: ['staff-bookings'],
    queryFn: () => fetchStaffBookings(90),
    refetchOnWindowFocus: false,
    staleTime: 120_000,
  })

  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorCard message={(q.error as Error).message} />

  const data = q.data!
  // Stale is a "this one doesn't count" flag, so the board never sees
  // those rows — not in the standings, not in today's total, not in the
  // feed. Filtering once here means no downstream calculation can
  // accidentally include them.
  const counted = data.bookings.filter((b) => b.attendance !== 'stale')
  const standings = buildStandings(data.reps, counted)

  const teamToday = standings.reduce((n, s) => n + s.today, 0)
  const teamTarget = standings.length * DAILY_TARGET
  const pct =
    teamTarget > 0 ? Math.min(100, Math.round((teamToday / teamTarget) * 100)) : 0
  const remaining = Math.max(0, teamTarget - teamToday)

  const recent = counted
    .filter((b) => b.bookedAt)
    .sort(
      (a, b) =>
        new Date(b.bookedAt!).getTime() - new Date(a.bookedAt!).getTime(),
    )
    .slice(0, 6)

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Scoreboard"
        subtitle="Bookings, ranked. Same numbers as Staff Bookings."
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Scoreboard' }]}
      />

      {/* Today — the number that matters most, sized accordingly */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Booked today
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-5xl font-bold tabular-nums text-foreground">
                  {teamToday}
                </span>
                {teamTarget > 0 && (
                  <span className="text-lg font-medium text-muted-foreground">
                    / {teamTarget}
                  </span>
                )}
              </p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {teamTarget === 0
                ? 'No reps reporting yet'
                : remaining === 0
                  ? 'Target hit — everything from here is upside'
                  : `${remaining} to go today`}
            </p>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <Podium standings={standings} />

      {/* Full standings */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">
          Standings
        </h2>
        {standings.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No reps reporting.
          </p>
        ) : (
          <ul>
            {standings.map((s, i) => {
              const dayPct = Math.min(
                100,
                Math.round((s.today / DAILY_TARGET) * 100),
              )
              const hitToday = s.today >= DAILY_TARGET
              return (
                <li
                  key={s.key}
                  className="flex items-center gap-4 border-b border-border-soft px-5 py-3.5 last:border-0"
                >
                  <span
                    className={cn(
                      'w-6 flex-shrink-0 text-center text-sm font-bold tabular-nums',
                      i === 0 && s.week > 0
                        ? 'text-amber-500'
                        : 'text-muted-foreground/60',
                    )}
                  >
                    {i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {s.name}
                      </span>
                      {hitToday && (
                        <Flame
                          className="h-3.5 w-3.5 flex-shrink-0 text-orange-500"
                          aria-label="Hit today's target"
                        />
                      )}
                    </div>
                    <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none',
                          hitToday ? 'bg-emerald-500' : 'bg-primary/70',
                        )}
                        style={{ width: `${dayPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 gap-5 text-right">
                    {[
                      { k: 'Today', v: s.today },
                      { k: 'Week', v: s.week },
                      { k: '30d', v: s.month },
                    ].map((cell) => (
                      <div key={cell.k} className="w-10">
                        <p className="text-sm font-semibold tabular-nums">
                          {cell.v}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {cell.k}
                        </p>
                      </div>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Latest bookings — proof the board is live */}
      {recent.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">
            Latest on the board
          </h2>
          <ul>
            {recent.map((b) => (
              <li
                key={`${b.vaultName}-${b.id}`}
                className="flex items-center justify-between gap-3 border-b border-border-soft px-5 py-2.5 text-sm last:border-0"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {b.name}
                </span>
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {b.rep}
                </span>
                <span className="w-16 flex-shrink-0 text-right text-xs text-muted-foreground">
                  {dayFmt.format(new Date(b.bookedAt!))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
