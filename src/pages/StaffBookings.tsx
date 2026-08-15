import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarCheck, RefreshCw, Search } from 'lucide-react'
import {
  fetchStaffBookings,
  findBooking,
  useIsLive,
  type BookingSearch,
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

const WINDOWS = [7, 14, 30] as const

const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

/** Local YYYY-MM-DD, for grouping bookings into days the viewer recognises. */
function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function StaffBookings() {
  const live = useIsLive()
  const [days, setDays] = useState<number>(14)
  const [findText, setFindText] = useState('')
  const [search, setSearch] = useState<BookingSearch | null>(null)
  const [searching, setSearching] = useState(false)

  // Deliberately manual, not a live-as-you-type query: this scans every
  // pipeline in every sub-account with no date cutoff, which is far too
  // expensive to fire on a keystroke.
  const runFind = async () => {
    const text = findText.trim()
    if (!text) return
    setSearching(true)
    try {
      setSearch(await findBooking(text, days))
    } catch (err) {
      setSearch({
        find: text,
        hits: [],
        hint: err instanceof Error ? err.message : 'Search failed.',
      })
    }
    setSearching(false)
  }

  const q = useQuery({
    queryKey: ['staff-bookings', days],
    queryFn: () => fetchStaffBookings(days),
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
  const bookedToday =
    data?.bookings.filter((b) => b.bookedAt && dayKey(b.bookedAt) === todayKey)
      .length ?? 0

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
            <div className="inline-flex rounded-xl border border-border p-1">
              {WINDOWS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    days === d
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                // Bypass the Hub's cache, then repaint from the result.
                await fetchStaffBookings(days, undefined, true)
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
            <SummaryCard
              label={`Booked in ${days} days`}
              value={data.totals.bookings}
              sub={
                data.totals.bookingsAllTime > data.totals.bookings
                  ? `${data.totals.bookingsAllTime} in booked stages overall`
                  : undefined
              }
            />
            <SummaryCard label="Reps reporting" value={activeReps} />
            <SummaryCard
              label="Sub-accounts erroring"
              value={data.totals.repsWithErrors}
              tone={data.totals.repsWithErrors > 0 ? 'bad' : 'default'}
              sub={data.totals.repsWithErrors > 0 ? 'see below' : undefined}
            />
          </div>

          {/* Missing-booking finder */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                A booking you expected isn&apos;t here?
              </h2>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Search every sub-account, every pipeline, every stage, with no
              date limit. It reports where the record actually lives and which
              filter is excluding it.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runFind()
                }}
                placeholder="Name, email or phone — e.g. Garett Curran"
                className="min-w-[16rem] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                type="button"
                onClick={runFind}
                disabled={searching || !findText.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {searching ? 'Searching…' : 'Find'}
              </button>
            </div>

            {search && (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">{search.hint}</p>
                {search.hits.map((h, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-surface-muted p-3 text-sm"
                  >
                    <p className="font-medium">{h.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.subAccount} → {h.pipeline} → {h.stage}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Chip tone={h.pipelineIsScanned ? 'mint' : 'pink'}>
                        {h.pipelineIsScanned
                          ? 'pipeline scanned'
                          : 'pipeline NOT scanned'}
                      </Chip>
                      <Chip tone={h.stageMatchesBookedFilter ? 'mint' : 'pink'}>
                        {h.stageMatchesBookedFilter
                          ? 'stage counts as booked'
                          : 'stage not counted'}
                      </Chip>
                      <Chip tone={h.withinWindow ? 'mint' : 'pink'}>
                        {h.withinWindow
                          ? 'in window'
                          : `older than ${days}d`}
                      </Chip>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                          <>
                            {r.total ?? 0}
                            {(r.totalAllTime ?? 0) > (r.total ?? 0) && (
                              <span
                                className="ml-1 text-xs font-normal text-amber-600 dark:text-amber-400"
                                title="In the booked stage, but dated outside the window. GHL's updatedAt may be missing, so an old lead booked recently looks old."
                              >
                                / {r.totalAllTime} all time
                              </span>
                            )}
                          </>
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
                          className="border-b border-border-soft transition last:border-0 hover:bg-surface-muted"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
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
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Counting pipeline stage “{data.stageFilter}”. Appointment times and
            details live in Today and Calendar — this view exists to attribute
            bookings, not to duplicate them.
          </p>
        </>
      )}
    </div>
  )
}
