import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, MessageSquare } from 'lucide-react'
import {
  addDays,
  fetchClock,
  fetchConversations,
  fetchOpportunities,
  fetchPipelines,
  fetchStats,
  formatDuration,
  startOfWeek,
  useIsLive,
  type Pipeline,
  type Opportunity,
  type Stats,
} from '@/lib/api'
import {
  Card,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SectionLabel,
  SummaryCard,
} from '@/components/ui'

/**
 * Dashboard.
 *
 * Rewritten 2026-08-14. Every number here used to describe solar
 * appointment-setting — bookings, upcoming appointments, appointments
 * by status — which Genisys stopped selling. Those figures weren't
 * wrong so much as about a business that no longer exists, and a
 * dashboard nobody trusts is worse than no dashboard.
 *
 * What replaced them is limited on purpose to things the system
 * actually knows: the GHL pipeline, conversations waiting on a reply,
 * who is on the clock, and the client count. There is deliberately no
 * revenue card — no Client record carries a monthly fee, so any MRR
 * figure would be a headcount multiplied by an assumption. Once
 * contractors have a real fee field, that card can be real too.
 *
 * Sections fail independently. GHL is the flakiest dependency here and
 * one slow sub-account shouldn't blank the whole page, so a failed
 * pipeline fetch shows a message in its own card while everything else
 * still renders.
 */

function StageBars({
  pipeline,
  opportunities,
  loading,
  error,
}: {
  pipeline: Pipeline | undefined
  opportunities: Opportunity[]
  loading: boolean
  error: Error | null
}) {
  if (loading) {
    return (
      <Card>
        <SectionLabel>Pipeline</SectionLabel>
        <Loading />
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <SectionLabel>Pipeline</SectionLabel>
        <p className="text-sm text-muted-foreground">
          Could not load the pipeline from GoHighLevel: {error.message}
        </p>
      </Card>
    )
  }

  if (!pipeline) {
    return (
      <Card>
        <SectionLabel>Pipeline</SectionLabel>
        <p className="text-sm text-muted-foreground">No pipelines found.</p>
      </Card>
    )
  }

  const rows = pipeline.stages
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((st) => ({
      name: st.name,
      count: opportunities.filter((o) => o.stageId === st.id).length,
    }))
  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>{pipeline.name}</SectionLabel>
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open board <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="w-32 flex-shrink-0 truncate text-xs text-muted-foreground">
              {r.name}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            <span className="w-10 flex-shrink-0 text-right text-xs font-semibold tabular-nums">
              {r.count}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const live = useIsLive()

  const stats = useQuery<Stats>({ queryKey: ['stats'], queryFn: fetchStats })

  // One pipelines fetch feeds the headline card, the stage bars, and
  // the sub-account the conversation list reads from.
  const pipes = useQuery({
    queryKey: ['pipelines', undefined],
    queryFn: () => fetchPipelines(undefined),
    staleTime: 300_000,
  })

  // Same rule the Opportunities board uses, so the two always describe
  // the same pipeline.
  const pipeline =
    pipes.data?.pipelines.find((p) => /contractor/i.test(p.name)) ??
    pipes.data?.pipelines[0]
  const activeSub = pipes.data?.activeSubAccount

  const opps = useQuery({
    queryKey: ['opportunities', activeSub, pipeline?.id],
    queryFn: () => fetchOpportunities(activeSub!, pipeline!.id),
    enabled: Boolean(activeSub && pipeline?.id),
    staleTime: 120_000,
  })

  const convos = useQuery({
    queryKey: ['conversations', activeSub],
    queryFn: () => fetchConversations(activeSub!),
    enabled: Boolean(activeSub),
    staleTime: 60_000,
  })

  const clock = useQuery({
    queryKey: ['clock', 'dashboard'],
    queryFn: () =>
      fetchClock({
        from: startOfWeek(new Date()),
        to: addDays(startOfWeek(new Date()), 7),
        scope: 'all',
      }),
    enabled: live,
    staleTime: 60_000,
  })

  if (stats.isLoading) return <Loading />
  if (stats.isError) {
    return (
      <ErrorCard
        message={
          stats.error instanceof Error
            ? stats.error.message
            : 'Could not load stats.'
        }
      />
    )
  }

  const s = stats.data!
  const opportunities = opps.data?.opportunities ?? []
  const pipeLoading = pipes.isLoading || opps.isLoading
  const pipeError = (pipes.error ?? opps.error) as Error | null

  const needsReply = (convos.data?.groups ?? [])
    .flatMap((g) => g.conversations)
    .filter((c) => c.unreadCount > 0)

  const onNow = clock.data?.onNow ?? []
  const myShift = clock.data?.current ?? null

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Dashboard"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Dashboard' }]}
        subtitle={
          live
            ? undefined
            : 'Showing demo data — connect to the Hub to see live numbers.'
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Active clients" value={s.activeClients} />
        <SummaryCard
          label="Open opportunities"
          value={pipeLoading || pipeError ? '—' : opportunities.length}
          sub={pipeError ? 'GHL unreachable' : pipeline?.name}
        />
        <SummaryCard
          label="Needs a reply"
          value={convos.isLoading || convos.isError ? '—' : needsReply.length}
          sub={convos.isError ? 'GHL unreachable' : 'unread conversations'}
          tone={needsReply.length > 0 ? 'bad' : 'default'}
        />
        <SummaryCard
          label="On the clock"
          value={
            clock.isLoading
              ? '—'
              : clock.data?.isAdmin
                ? onNow.length
                : myShift
                  ? formatDuration(myShift.minutes)
                  : 'Off'
          }
          sub={
            clock.data?.isAdmin
              ? 'staff working now'
              : myShift
                ? 'your shift so far'
                : 'you are not clocked in'
          }
        />
      </div>

      <StageBars
        pipeline={pipeline}
        opportunities={opportunities}
        loading={pipeLoading}
        error={pipeError}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conversations waiting</h2>
          {/* /crm declares search params for contact deep-linking, so
              they have to be passed even when opening the plain inbox. */}
          <Link
            to="/crm"
            search={{
              contactId: undefined,
              subAccount: undefined,
              contactName: undefined,
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open CRM <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {convos.isLoading ? (
          <Loading />
        ) : needsReply.length === 0 ? (
          <EmptyCard icon={MessageSquare}>
            Nothing waiting on a reply.
          </EmptyCard>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Contact</th>
                    <th className="px-4 py-2 font-semibold">Last message</th>
                    <th className="px-4 py-2 font-semibold">Unread</th>
                  </tr>
                </thead>
                <tbody>
                  {needsReply.slice(0, 6).map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border-soft transition last:border-0 hover:bg-surface-muted"
                    >
                      <td className="px-4 py-3 font-medium">
                        {c.contactName ?? c.contactPhone ?? 'Unknown'}
                      </td>
                      <td className="max-w-md truncate px-4 py-3 text-xs text-muted-foreground">
                        {c.lastMessageBody ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold tabular-nums">
                        {c.unreadCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
