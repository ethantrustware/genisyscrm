import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Stethoscope, Users, CalendarDays, AlertTriangle } from 'lucide-react'
import { fetchAttribution, useIsLive } from '@/lib/api'
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
 * Diagnostics — deliberately not in the navigation.
 *
 * This exists to answer one question before the scoreboard gets built on
 * an assumption: can we tell which rep booked a given appointment? The
 * Lead Genisys Sales sub-accounts look like one rep each, which would
 * make the sub-account the unit of attribution — but that reading came
 * from screenshots, and a scoreboard that silently mis-attributes is
 * worse than no scoreboard.
 *
 * Reachable at /diagnostics. Read-only, admin-only, safe to run anytime.
 */

const WINDOWS = [30, 60, 90] as const

function verdictTone(v: string): 'good' | 'bad' | 'warn' {
  if (v.startsWith('PER-REP')) return 'good'
  if (v.startsWith('POOLED')) return 'bad'
  return 'warn'
}

export default function Diagnostics() {
  const live = useIsLive()
  const [days, setDays] = useState<number>(30)

  const q = useQuery({
    queryKey: ['attribution', days],
    queryFn: () => fetchAttribution(days),
    enabled: live,
    // GHL is walked sequentially across every sub-account, so this is
    // slow by design. Don't re-run it on window focus.
    refetchOnWindowFocus: false,
    staleTime: 300_000,
  })

  if (!live) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Diagnostics"
          subtitle="GHL appointment attribution check."
          breadcrumbs={[{ label: 'Genisys' }, { label: 'Diagnostics' }]}
        />
        <EmptyCard icon={Stethoscope}>
          Sign in as an admin — this reads live GHL data and the demo has no
          account behind it.
        </EmptyCard>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Diagnostics"
        subtitle="Can we tell which rep booked a given appointment?"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Diagnostics' }]}
        actions={
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
        }
      />

      {q.isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-2 text-sm font-medium">
            Walking every GHL sub-account…
          </p>
          <p className="text-sm text-muted-foreground">
            Sub-accounts are queried one at a time to avoid GHL rate limits, so
            this takes a while. A throttled half-answer would look exactly like
            a rep who books nothing, which is the one result worth avoiding.
          </p>
          <Loading />
        </div>
      )}

      {q.isError && <ErrorCard message={(q.error as Error).message} />}

      {q.data && (
        <>
          {/* The answer, up front */}
          {(() => {
            const tone = verdictTone(q.data.verdict.attribution)
            return (
              <div
                className={cn(
                  'rounded-2xl border p-5',
                  tone === 'good' && 'border-emerald-500/40 bg-emerald-500/5',
                  tone === 'bad' && 'border-rose-500/40 bg-rose-500/5',
                  tone === 'warn' && 'border-amber-500/40 bg-amber-500/5',
                )}
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Verdict
                </p>
                <p className="text-sm font-medium text-foreground">
                  {q.data.verdict.attribution}
                </p>
              </div>
            )
          })()}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Appointments found"
              value={q.data.verdict.totalEvents}
              sub={`last ${q.data.window.days} days`}
            />
            <SummaryCard
              label="Sub-accounts with bookings"
              value={q.data.verdict.subAccountsWithEvents}
              sub={
                q.data.verdict.subAccountsWithEvents === 1
                  ? 'pooled into one'
                  : 'spread across reps'
              }
            />
            <SummaryCard
              label="One user per sub-account"
              value={q.data.verdict.everySubAccountHasExactlyOneUser ? 'Yes' : 'No'}
              sub="determines sub-account attribution"
            />
            <SummaryCard
              label="Events name a user"
              value={q.data.verdict.eventsCarryAssignedUserId ? 'Yes' : 'No'}
              sub="assignedUserId fallback"
            />
          </div>

          {q.data.subAccountErrors.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold">
                  Sub-accounts that could not be read
                </h2>
              </div>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {q.data.subAccountErrors.map((e) => (
                  <li key={e.vaultName}>
                    <span className="font-medium text-foreground">
                      {e.vaultName}
                    </span>{' '}
                    — {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {q.data.subAccounts.map((s) => (
              <div
                key={s.vaultName}
                className="rounded-2xl border border-border bg-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
                  <h2 className="text-sm font-semibold">{s.locationName}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={s.userCount === 1 ? 'mint' : 'amber'}>
                      <Users className="mr-1 inline h-3 w-3" />
                      {s.userCount ?? '?'} user
                      {s.userCount === 1 ? '' : 's'}
                    </Chip>
                    <Chip tone={(s.eventCount ?? 0) > 0 ? 'blue' : 'muted'}>
                      <CalendarDays className="mr-1 inline h-3 w-3" />
                      {s.eventCount ?? '?'} appointments
                    </Chip>
                  </div>
                </div>

                <div className="flex flex-col gap-3 px-5 py-4 text-sm">
                  {s.usersError && (
                    <p className="text-destructive">
                      Users: {s.usersError}
                    </p>
                  )}
                  {s.users.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Staff
                      </p>
                      <ul className="flex flex-col gap-1">
                        {s.users.map((u) => (
                          <li key={u.id ?? u.email}>
                            <span className="font-medium">
                              {u.name ?? 'Unnamed'}
                            </span>{' '}
                            <span className="text-muted-foreground">
                              {u.email} · {u.id}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {s.eventsError && (
                    <p className="text-destructive">
                      Appointments: {s.eventsError}
                    </p>
                  )}

                  {(s.distinctAssignedUserIds?.length ?? 0) > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Distinct assigned users on events
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {s.distinctAssignedUserIds!.join(', ')}
                      </p>
                    </div>
                  )}

                  {(s.sampleEvents?.length ?? 0) > 0 && (
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Sample appointments &amp; available fields
                      </summary>
                      <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-muted p-3 text-[11px] leading-relaxed">
                        {JSON.stringify(s.sampleEvents, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
