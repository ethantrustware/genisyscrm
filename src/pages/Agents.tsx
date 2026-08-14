import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, UserX, Users } from 'lucide-react'
import { fetchAgents, updateAgent, useIsLive, type Agent } from '@/lib/api'
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
  agent_denied: 'pink',
  agent_pending: 'amber',
} as const

export default function Agents() {
  const live = useIsLive()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError, error: qErr } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  })

  const act = useMutation({
    mutationFn: (v: { id: string; action: 'revoke' | 'restore' }) =>
      updateAgent(v.id, v.action),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : 'Something went wrong.'),
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={qErr instanceof Error ? qErr.message : 'Could not load.'}
      />
    )

  const agents = data ?? []
  const booked = agents.reduce((s, a) => s + a.appointmentCount, 0)

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Agents"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Agents' }]}
        subtitle={live ? undefined : 'Showing demo data — changes are disabled.'}
      />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

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
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul>
            {agents.map((a) => {
              const isAgent = a.role.startsWith('agent')
              const denied = a.role === 'agent_denied'
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3 last:border-0"
                >
                  <Avatar name={a.name ?? a.email ?? '?'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {a.name ?? '—'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.email}
                      {a.lastBookingAt
                        ? ` · last booking ${formatDate(a.lastBookingAt)}`
                        : ' · no bookings yet'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {a.appointmentCount}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      booked
                    </p>
                  </div>

                  <Chip
                    tone={ROLE_TONE[a.role as keyof typeof ROLE_TONE] ?? 'muted'}
                  >
                    {a.role.replace(/_/g, ' ')}
                  </Chip>

                  {live && isAgent && (
                    <button
                      type="button"
                      disabled={act.isPending}
                      onClick={() => {
                        if (
                          !denied &&
                          !window.confirm(
                            `Remove ${a.email}'s access? They are signed out of the CRM immediately.`,
                          )
                        )
                          return
                        act.mutate({
                          id: a.id,
                          action: denied ? 'restore' : 'revoke',
                        })
                      }}
                      className={
                        denied
                          ? 'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50'
                          : 'inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300'
                      }
                    >
                      {denied ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </>
                      ) : (
                        <>
                          <UserX className="h-3.5 w-3.5" />
                          Revoke
                        </>
                      )}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Only agent accounts can be changed here. Owner and staff roles are
        managed in the Hub — revoking one from this screen would lock them out
        of the Hub itself.
      </p>
    </div>
  )
}
