import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CalendarCheck, RefreshCw } from 'lucide-react'
import {
  fetchStaffBookings,
  setAttendance,
  useIsLive,
  type Attendance,
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
 * Staff Bookings — who booked what, attributed automatically.
 *
 * Every sales sub-account is run by exactly one rep, and a GHL
 * automation moves a lead into the booked stage the moment they take a
 * slot on a strategy-call calendar. So the sub-account a booking lands
 * in identifies the rep, with nobody logging anything by hand.
 *
 * That holds whether the lead books the link themselves or the rep books
 * it for them mid-call — both paths end at the same calendar, so the
 * same automation fires.
 *
 * This is the count-and-attribute view. Appointment times and details
 * live in Today and Calendar; duplicating them here would create a
 * second version of the truth.
 */

/**
 * One fixed window, wide enough that nothing recent falls outside it.
 *
 * There used to be a 7/14/30 selector. It stopped meaning anything once
 * out-of-window rows were shown anyway — it only changed which rows were
 * dimmed. The periods people actually ask about (today, this week) are
 * derived below from a single fetch instead.
 */
const LOOKBACK_DAYS = 90

const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * How attendance reads in the table.
 *
 * "Not marked" is a real, common answer rather than an error: GHL's
 * show/no-show is set by hand after the call, so until that becomes a
 * habit most rows will sit here. Showing it plainly is the point — it
 * makes the size of the gap visible instead of implying everyone showed.
 */
const ATTENDANCE: Record<
  Attendance,
  { label: string; tone: 'mint' | 'pink' | 'amber' | 'blue' | 'muted' }
> = {
  showed: { label: 'Showed', tone: 'mint' },
  noshow: { label: 'No-show', tone: 'pink' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  upcoming: { label: 'Upcoming', tone: 'blue' },
  unmarked: { label: 'Not marked', tone: 'amber' },
}

/**
 * Editable attendance cell.
 *
 * Writes to the GHL appointment, which is the same field GHL's own UI
 * sets — marking here and marking there are the same act, so the two can
 * never disagree.
 *
 * Only the three outcomes a person actually decides are offered.
 * "Cancelled" and "Upcoming" are states of the appointment itself rather
 * than judgements about it, so they show as text and aren't in the menu.
 */
function AttendanceCell({
  bookingKey,
  attendance,
  appointmentId,
  subAccount,
  onSaved,
}: {
  bookingKey: string
  attendance: Attendance
  appointmentId: string | null
  subAccount: string
  onSaved: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  // Held locally so the cell reflects the choice immediately; the refetch
  // behind it is what confirms GHL agreed.
  const [optimistic, setOptimistic] = useState<Attendance | null>(null)

  const save = useMutation({
    mutationFn: (status: 'showed' | 'noshow' | 'unmarked') =>
      setAttendance({ subAccount, appointmentId: appointmentId!, status }),
    onMutate: (status) => {
      setError(null)
      setOptimistic(status as Attendance)
    },
    onError: (e: Error) => {
      setOptimistic(null) // snap back rather than show a lie
      setError(e.message)
    },
    onSuccess: onSaved,
  })

  const shown = optimistic ?? attendance

  if (!appointmentId) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title="No calendar appointment is linked to this contact, so there is nothing to mark."
      >
        {ATTENDANCE[attendance].label}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label={`Attendance for ${bookingKey}`}
        value={
          shown === 'showed' || shown === 'noshow' ? shown : 'unmarked'
        }
        disabled={save.isPending}
        onChange={(e) =>
          save.mutate(e.target.value as 'showed' | 'noshow' | 'unmarked')
        }
        className={cn(
          'rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition',
          'focus:border-primary disabled:opacity-60',
          shown === 'showed' &&
            'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          shown === 'noshow' &&
            'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
          shown !== 'showed' &&
            shown !== 'noshow' &&
            'border-border bg-card text-muted-foreground',
        )}
      >
        <option value="unmarked">Not marked</option>
        <option value="showed">Showed</option>
        <option value="noshow">No show</option>
      </select>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  )
}

/** Local YYYY-MM-DD, for grouping bookings into days the viewer recognises. */
function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function StaffBookings() {
  const live = useIsLive()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['staff-bookings'],
    queryFn: () => fetchStaffBookings(LOOKBACK_DAYS),
    enabled: live,
    refetchOnWindowFocus: false,
    staleTime: 120_000,
  })

  if (!live) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Staff Bookings"
          subtitle="Who booked what, attributed by sub-account."
          breadcrumbs={[{ label: 'Genisys' }, { label: 'Staff Bookings' }]}
        />
        <EmptyCard icon={CalendarCheck}>
          Sign in to see bookings — this reads live pipeline data from
          GoHighLevel.
        </EmptyCard>
      </div>
    )
  }

  const data = q.data
  const todayKey = dayKey(new Date().toISOString())
  const all = data?.bookings ?? []

  // One fetch, three periods. Counting client-side means switching what
  // you're looking at costs nothing.
  const since = (d: number) => Date.now() - d * 86400_000
  const inLast = (d: number) =>
    all.filter((b) => b.bookedAt && new Date(b.bookedAt).getTime() >= since(d))
      .length
  const bookedToday = all.filter(
    (b) => b.bookedAt && dayKey(b.bookedAt) === todayKey,
  ).length

  // The floor is per rep per day, so the team target scales with headcount.
  const activeReps = data?.reps.filter((r) => !r.error).length ?? 0
  const dailyTarget = activeReps * 3

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Staff Bookings"
        subtitle="Every booking, attributed to the rep whose sub-account it landed in."
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Staff Bookings' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                // Bypass the Hub's cache, then repaint from the result.
                await fetchStaffBookings(LOOKBACK_DAYS, undefined, true)
                q.refetch()
              }}
              disabled={q.isFetching}
              aria-label="Refresh"
              className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={cn('h-4 w-4', q.isFetching && 'animate-spin')}
              />
            </button>
          </div>
        }
      />

      {q.isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-2 text-sm font-medium">Reading every sub-account…</p>
          <p className="text-sm text-muted-foreground">
            Sub-accounts are walked one at a time so GoHighLevel doesn&apos;t
            throttle the request. A partial answer would show up here as a rep
            who booked nothing, which is worth waiting a few seconds to avoid.
          </p>
          <Loading />
        </div>
      )}

      {q.isError && <ErrorCard message={(q.error as Error).message} />}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Booked today"
              value={bookedToday}
              sub={dailyTarget > 0 ? `team target ${dailyTarget}` : undefined}
              tone={
                dailyTarget > 0 && bookedToday >= dailyTarget ? 'good' : 'default'
              }
            />
            <SummaryCard label="Last 7 days" value={inLast(7)} />
            <SummaryCard
              label="Last 30 days"
              value={inLast(30)}
              sub={`${all.length} total in booked stages`}
            />
            <SummaryCard
              label="Sub-accounts erroring"
              value={data.totals.repsWithErrors}
              tone={data.totals.repsWithErrors > 0 ? 'bad' : 'default'}
              sub={data.totals.repsWithErrors > 0 ? 'see below' : undefined}
            />
          </div>

          {/* Per-rep totals — the leaderboard-shaped read */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Rep / sub-account</th>
                  <th className="px-4 py-2 font-semibold">Pipeline</th>
                  <th className="px-4 py-2 font-semibold">Booked stage</th>
                  <th className="px-4 py-2 text-right font-semibold">
                    Bookings
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.reps
                  .slice()
                  .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
                  .map((r) => (
                    <tr
                      key={r.vaultName}
                      className="border-b border-border-soft last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {r.locationName}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.pipelineName ?? '—'}
                        {(r.otherPipelines?.length ?? 0) > 0 && (
                          <span
                            className="ml-1 cursor-help text-amber-600 dark:text-amber-400"
                            title={`Not scanned: ${r.otherPipelines!.join(', ')}`}
                          >
                            +{r.otherPipelines!.length} not scanned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.error ? (
                          <span className="flex items-start gap-1.5 text-destructive">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            {r.error}
                          </span>
                        ) : (
                          (r.bookedStages ?? []).join(', ') || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {r.error ? (
                          '—'
                        ) : (
                          (r.totalAllTime ?? 0)
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* The bookings themselves */}
          <div>
            <h2 className="mb-3 text-sm font-semibold">
              Bookings ({data.bookings.length})
              <span className="ml-2 font-normal text-muted-foreground">
                newest first
              </span>
            </h2>
            {data.bookings.length === 0 ? (
              <EmptyCard icon={CalendarCheck}>
                No bookings in this window.
                {data.totals.bookingsAllTime > 0 ? (
                  <>
                    {' '}
                    But {data.totals.bookingsAllTime} opportunities ARE sitting
                    in booked stages — they just date outside it. Widen to 30d,
                    or use the search above: GHL not returning{' '}
                    <code>updatedAt</code> makes a recent booking on an older
                    lead look old.
                  </>
                ) : (
                  ' Nothing is sitting in a booked stage at all, so the GHL automation may not be creating opportunities.'
                )}
              </EmptyCard>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Booked</th>
                      <th className="px-4 py-2 font-semibold">Lead</th>
                      <th className="px-4 py-2 font-semibold">Contact</th>
                      <th className="px-4 py-2 font-semibold">Rep</th>
                      <th className="px-4 py-2 font-semibold">Stage</th>
                      <th className="px-4 py-2 font-semibold">Showed?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bookings
                      .slice()
                      .sort((a, b) => {
                        const ta = a.bookedAt
                          ? new Date(a.bookedAt).getTime()
                          : 0
                        const tb = b.bookedAt
                          ? new Date(b.bookedAt).getTime()
                          : 0
                        return tb - ta
                      })
                      .map((b) => (
                        <tr
                          key={`${b.vaultName}-${b.id}`}
                          className={cn(
                            'border-b border-border-soft transition last:border-0 hover:bg-surface-muted',
                          )}
                        >
                          <td
                            className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground"
                            title={`created ${b.createdAt ?? 'unknown'} · updated ${b.updatedAt ?? 'not returned by GHL'}`}
                          >
                            {b.bookedAt ? (
                              <>
                                {dayFmt.format(new Date(b.bookedAt))}
                                <span className="ml-1 opacity-60">
                                  {timeFmt.format(new Date(b.bookedAt))}
                                </span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">{b.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {b.contactPhone ?? b.contactEmail ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">{b.rep}</td>
                          <td className="px-4 py-3">
                            <Chip tone="mint">{b.stage}</Chip>
                          </td>
                          <td className="px-4 py-3">
                            {b.attendance === 'cancelled' ||
                            b.attendance === 'upcoming' ? (
                              <Chip tone={ATTENDANCE[b.attendance].tone}>
                                {ATTENDANCE[b.attendance].label}
                              </Chip>
                            ) : (
                              <AttendanceCell
                                bookingKey={b.name}
                                attendance={b.attendance}
                                appointmentId={b.appointmentId}
                                subAccount={b.subAccount}
                                onSaved={() =>
                                  qc.invalidateQueries({
                                    queryKey: ['staff-bookings'],
                                  })
                                }
                              />
                            )}
                            {b.appointmentAt && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {dayFmt.format(new Date(b.appointmentAt))}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {(() => {
            const done = data.bookings.filter(
              (b) => b.attendance === 'showed' || b.attendance === 'noshow',
            )
            const unmarked = data.bookings.filter(
              (b) => b.attendance === 'unmarked',
            ).length
            const showed = done.filter((b) => b.attendance === 'showed').length
            return (
              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                {done.length > 0 && (
                  <p>
                    <span className="font-semibold text-foreground">
                      Show rate {Math.round((showed / done.length) * 100)}%
                    </span>{' '}
                    — {showed} of {done.length} marked appointments.
                  </p>
                )}
                {unmarked > 0 && (
                  <p>
                    {unmarked} past appointment{unmarked === 1 ? '' : 's'} not
                    marked showed or no-show in GoHighLevel. Attendance is set
                    by hand after a call, so this column only becomes useful
                    once that is part of the routine — nothing here infers it.
                  </p>
                )}
                <p>
                  Counting pipeline stage “{data.stageFilter}”. Appointment
                  times and details live in Today and Calendar — this view
                  exists to attribute bookings, not to duplicate them.
                </p>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
