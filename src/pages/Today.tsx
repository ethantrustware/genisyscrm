import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Plus,
  Trash2,
  Video,
} from 'lucide-react'
import {
  createTask,
  deleteTask,
  fetchMeetings,
  fetchToday,
  updateTask,
  useIsLive,
  type Meeting,
  type TodayData,
} from '@/lib/api'
import {
  Card,
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SectionLabel,
  StatusChip,
  SummaryCard,
  btnPrimary,
  inputCls,
} from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

const PRIORITY_TONE = { high: 'pink', medium: 'amber', low: 'blue' } as const


/**
 * Day label for a meeting: always the weekday and date, with the
 * relative word in front where there is one.
 *
 * An earlier version showed only "Today" / "Tomorrow" for the near
 * cases. That reads well but hides the actual date, and "Today" alone
 * next to a row marked Over gives no clue whether it finished ten
 * minutes or nine hours ago. Showing both costs one short line.
 */
function dayLabel(d: Date): { relative: string | null; date: string } {
  const startOfDay = (x: Date) => {
    const c = new Date(x)
    c.setHours(0, 0, 0, 0)
    return c.getTime()
  }
  const diffDays = Math.round(
    (startOfDay(d) - startOfDay(new Date())) / 86400_000,
  )
  const relative =
    diffDays === 0
      ? 'Today'
      : diffDays === 1
        ? 'Tomorrow'
        : diffDays === -1
          ? 'Yesterday'
          : null
  return {
    relative,
    date: d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
  }
}


/**
 * Next up — the soonest booked meetings, with a join link when the
 * calendar event carries one. "Over" is shown rather than hiding the row,
 * because a meeting that just ended is still the thing you're looking for.
 */
function NextUp({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) return null
  const now = Date.now()

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">
        Next up · {meetings.length}
      </h2>
      <ul className="flex flex-col gap-2">
        {meetings.map((m) => {
          const start = m.startTime ? new Date(m.startTime) : null
          const end = m.endTime ? new Date(m.endTime) : null
          const over = end ? end.getTime() < now : false
          const live =
            start && end
              ? start.getTime() <= now && end.getTime() >= now
              : false

          return (
            <li
              key={m.id}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3',
                live ? 'border-primary/50 shadow-soft' : 'border-border',
              )}
            >
              <div className="w-[152px] flex-shrink-0">
                {start &&
                  (() => {
                    const { relative, date } = dayLabel(start)
                    return (
                      <p className="text-[11px] font-semibold leading-tight">
                        {relative && (
                          <span
                            className={cn(
                              'uppercase tracking-wide',
                              relative === 'Today'
                                ? 'text-primary'
                                : 'text-muted-foreground',
                            )}
                          >
                            {relative}
                            {' · '}
                          </span>
                        )}
                        <span className="text-muted-foreground">{date}</span>
                      </p>
                    )
                  })()}
                <p className="text-sm font-semibold tabular-nums">
                  {start
                    ? start.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
                {end && (
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    –{' '}
                    {end.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {m.contactName && (
                    <span className="font-semibold">{m.contactName} · </span>
                  )}
                  {m.title}
                </p>
                {m.calendarName && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {m.calendarName}
                  </p>
                )}
              </div>

              {live && (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Now
                </span>
              )}
              {over && !live && (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Over
                </span>
              )}

              {m.joinUrl ? (
                <a
                  href={m.joinUrl}
                  target={m.joinKind === 'phone' ? undefined : '_blank'}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90"
                >
                  <Video className="h-3.5 w-3.5" />
                  {m.joinLabel ?? 'Join'}
                </a>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  No link
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Today() {
  const live = useIsLive()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError, error: qErr } = useQuery<TodayData>({
    queryKey: ['today'],
    queryFn: fetchToday,
  })

  // Re-fetched every minute so the Now / Over badges stay honest.
  const meetings = useQuery({
    queryKey: ['meetings'],
    queryFn: fetchMeetings,
    refetchInterval: 60_000,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['today'] })
  const onErr = (e: unknown) =>
    setError(e instanceof Error ? e.message : 'Something went wrong.')

  const add = useMutation({
    mutationFn: () => createTask({ title: title.trim(), priority }),
    onSuccess: () => {
      setTitle('')
      setError(null)
      refresh()
    },
    onError: onErr,
  })

  const toggle = useMutation({
    mutationFn: (v: { id: string; done: boolean }) =>
      updateTask(v.id, { done: v.done }),
    onSuccess: refresh,
    onError: onErr,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: refresh,
    onError: onErr,
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={qErr instanceof Error ? qErr.message : 'Could not load.'}
      />
    )

  const d = data!
  const busy = add.isPending || toggle.isPending || remove.isPending

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Today"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Today' }]}
        subtitle={live ? undefined : 'Showing demo data — changes are disabled.'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard label="Open tasks" value={d.counts.openTasks} />
        <SummaryCard
          label="Appointments today"
          value={d.counts.appointmentsToday}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <SectionLabel>Tasks</SectionLabel>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && live && title.trim() && !busy) {
                add.mutate()
              }
            }}
            disabled={!live}
            placeholder={live ? 'Add a task…' : 'Sign in to add tasks'}
            className={cn(inputCls, 'min-w-[200px] flex-1')}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={!live}
            className={cn(inputCls, 'w-auto')}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            type="button"
            disabled={!live || !title.trim() || busy}
            onClick={() => add.mutate()}
            className={btnPrimary}
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {d.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on the list.</p>
        ) : (
          <ul className="flex flex-col">
            {d.tasks.map((t) => (
              <li
                key={t.id}
                className="group flex items-start gap-3 border-t border-border-soft py-3 first:border-t-0"
              >
                <button
                  type="button"
                  disabled={!live || busy}
                  onClick={() => toggle.mutate({ id: t.id, done: !t.done })}
                  className="mt-0.5 flex-shrink-0 disabled:opacity-50"
                  aria-label={t.done ? 'Reopen task' : 'Complete task'}
                >
                  {t.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      t.done && 'text-muted-foreground line-through',
                    )}
                  >
                    {t.title}
                  </p>
                  {t.notes && (
                    <p className="text-xs text-muted-foreground">{t.notes}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t.owner ?? 'Unassigned'}
                    {t.dueAt ? ` · due ${formatDate(t.dueAt)}` : ''}
                  </p>
                </div>

                <Chip
                  tone={
                    PRIORITY_TONE[t.priority as keyof typeof PRIORITY_TONE] ??
                    'muted'
                  }
                >
                  {t.priority}
                </Chip>

                {live && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Delete "${t.title}"?`)) return
                      remove.mutate(t.id)
                    }}
                    className="opacity-0 transition group-hover:opacity-100"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <NextUp meetings={meetings.data?.meetings ?? []} />

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          Appointments today
        </h2>
        {d.appointments.length === 0 ? (
          <EmptyCard icon={ClipboardList}>
            No appointments scheduled today.
          </EmptyCard>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Time</th>
                    <th className="px-4 py-2.5 font-semibold">Customer</th>
                    <th className="px-4 py-2.5 font-semibold">Client</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {d.appointments.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border-soft last:border-0 hover:bg-surface-muted"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(a.apptDateTime)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{a.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.customerPhone ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: a.clientColor ?? 'currentColor',
                            }}
                          />
                          {a.clientName ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={a.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={a.dispatchStatus} />
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
