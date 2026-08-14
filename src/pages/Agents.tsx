import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Clock,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  RotateCcw,
  ShieldCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
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
import { cn, formatDate } from '@/lib/utils'

/** Roles an admin can assign from here, in rough order of privilege. */
const ROLES = [
  { value: 'admin', label: 'Admin — full Hub access' },
  { value: 'member', label: 'Member — staff, no admin areas' },
  { value: 'agent', label: 'Agent — agent portal only' },
  { value: 'crm_user', label: 'CRM user — this app only' },
  { value: 'agent_denied', label: 'Agent (denied)' },
  { value: 'crm_denied', label: 'CRM (denied)' },
]

const ROLE_TONE: Record<string, 'violet' | 'blue' | 'mint' | 'amber' | 'pink'> =
  {
    admin: 'violet',
    member: 'blue',
    agent: 'mint',
    crm_user: 'mint',
    agent_pending: 'amber',
    crm_pending: 'amber',
    agent_denied: 'pink',
    crm_denied: 'pink',
  }

const isPending = (r: string) => r.endsWith('_pending')
const isDenied = (r: string) => r.endsWith('_denied')

type ActionFn = (p: {
  id: string
  action: string
  role?: string
}) => void

function AgentDetail({
  agent,
  canManage,
  busy,
  onClose,
  onAction,
}: {
  agent: Agent
  canManage: boolean
  busy: boolean
  onClose: () => void
  onAction: ActionFn
}) {
  const [role, setRole] = useState(agent.role)

  const rows: Array<{ icon: typeof Mail; label: string; value: string | null }> =
    [
      { icon: Mail, label: 'Email', value: agent.email },
      { icon: MapPin, label: 'State', value: agent.servicingState ?? null },
      { icon: Clock, label: 'Timezone', value: agent.timezone ?? null },
      {
        icon: KeyRound,
        label: 'Sign-in',
        value: agent.hasPassword ? 'Password set' : 'No password — cannot sign in',
      },
    ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-xl flex-col gap-5 rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={agent.name ?? agent.email ?? '?'} />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">
                {agent.name ?? '—'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {agent.email}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Chip tone={ROLE_TONE[agent.role] ?? 'muted'}>
              {agent.role.replace(/_/g, ' ')}
            </Chip>
            <button type="button" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Booked
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {agent.appointmentCount}
            </p>
          </div>
          <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Sessions
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {agent.activeSessions ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Last seen
            </p>
            <p className="mt-1 text-xs">
              {agent.lastSeenAt ? formatDate(agent.lastSeenAt) : 'never'}
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const Icon = r.icon
            return (
              <li key={r.label} className="flex items-center gap-2.5 text-sm">
                <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="w-20 flex-shrink-0 text-xs text-muted-foreground">
                  {r.label}
                </span>
                <span className="truncate">{r.value ?? '—'}</span>
              </li>
            )
          })}
          <li className="flex items-center gap-2.5 text-sm">
            <Users className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <span className="w-20 flex-shrink-0 text-xs text-muted-foreground">
              Joined
            </span>
            <span>{agent.createdAt ? formatDate(agent.createdAt) : '—'}</span>
          </li>
        </ul>

        {canManage && !agent.isSelf && (
          <div className="border-t border-border-soft pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Role
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="min-w-[240px] flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
                {!ROLES.some((r) => r.value === agent.role) && (
                  <option value={agent.role}>
                    {agent.role.replace(/_/g, ' ')} (current)
                  </option>
                )}
              </select>
              <button
                type="button"
                disabled={busy || role === agent.role}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Change ${agent.email} to "${role}"? This takes effect immediately.`,
                    )
                  )
                    return
                  onAction({ id: agent.id, action: 'setRole', role })
                  onClose()
                }}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
              >
                Save role
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(agent.activeSessions ?? 0) > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onAction({ id: agent.id, action: 'signOut' })
                    onClose()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out everywhere
                </button>
              )}
              {!isDenied(agent.role) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Remove ${agent.email}'s access? They are signed out immediately.`,
                      )
                    )
                      return
                    onAction({ id: agent.id, action: 'revoke' })
                    onClose()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <UserX className="h-3.5 w-3.5" />
                  Revoke access
                </button>
              )}
            </div>
          </div>
        )}

        {agent.isSelf && (
          <p className="border-t border-border-soft pt-4 text-xs text-muted-foreground">
            This is you. Changing your own role here is blocked — that is how
            people lock themselves out.
          </p>
        )}
        {!canManage && !agent.isSelf && (
          <p className="border-t border-border-soft pt-4 text-xs text-muted-foreground">
            Only an admin can change access.
          </p>
        )}
      </div>
    </div>
  )
}

function PersonRow({
  a,
  busy,
  canManage,
  onOpen,
  onAction,
}: {
  a: Agent
  busy: boolean
  canManage: boolean
  onOpen: () => void
  onAction: ActionFn
}) {
  const pending = isPending(a.role)
  return (
    <li
      onClick={onOpen}
      className="flex cursor-pointer flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3 transition last:border-0 hover:bg-surface-muted"
    >
      <Avatar name={a.name ?? a.email ?? '?'} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {a.name ?? '—'}
          {a.isSelf && (
            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
              you
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {a.email}
          {a.lastBookingAt
            ? ` · last booking ${formatDate(a.lastBookingAt)}`
            : ''}
        </p>
      </div>

      {!pending && (
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {a.appointmentCount}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            booked
          </p>
        </div>
      )}

      <Chip tone={ROLE_TONE[a.role] ?? 'muted'}>
        {a.role.replace(/_/g, ' ')}
      </Chip>

      {canManage && pending && (
        <div
          className="flex flex-shrink-0 gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction({ id: a.id, action: 'approve' })}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Deny ${a.email}?`)) return
              onAction({ id: a.id, action: 'deny' })
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <X className="h-3.5 w-3.5" />
            Deny
          </button>
        </div>
      )}

      {canManage && isDenied(a.role) && (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            onAction({ id: a.id, action: 'approve' })
          }}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </button>
      )}
    </li>
  )
}

export default function Agents() {
  const live = useIsLive()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const { data, isLoading, isError, error: qErr } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  })

  const act = useMutation({
    mutationFn: (p: { id: string; action: string; role?: string }) =>
      updateAgent(p),
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

  const people = data ?? []
  const me = people.find((p) => p.isSelf)
  const canManage = live && me?.role === 'admin'

  const pending = people.filter((p) => isPending(p.role))
  const denied = people.filter((p) => isDenied(p.role))
  const active = people.filter((p) => !isPending(p.role) && !isDenied(p.role))
  const booked = active.reduce((s, a) => s + a.appointmentCount, 0)
  const open = openId ? people.find((p) => p.id === openId) : null

  const Section = ({
    title,
    list,
    hint,
  }: {
    title: string
    list: Agent[]
    hint?: string
  }) =>
    list.length === 0 ? null : (
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title} · {list.length}
        </p>
        {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul>
            {list.map((a) => (
              <PersonRow
                key={a.id}
                a={a}
                busy={act.isPending}
                canManage={canManage}
                onOpen={() => setOpenId(a.id)}
                onAction={act.mutate}
              />
            ))}
          </ul>
        </div>
      </div>
    )

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Agents"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Agents' }]}
        subtitle={
          live
            ? canManage
              ? undefined
              : 'You can view the roster. Only an admin can change access.'
            : 'Showing demo data — changes are disabled.'
        }
      />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="People" value={active.length} />
        <SummaryCard label="Appointments booked" value={booked} />
        <SummaryCard
          label="Awaiting approval"
          value={pending.length}
          tone={pending.length > 0 ? 'bad' : 'default'}
        />
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldCheck className="mr-1.5 inline h-4 w-4" />
          {pending.length} {pending.length === 1 ? 'person is' : 'people are'}{' '}
          waiting for approval. They cannot sign in until approved.
        </div>
      )}

      {people.length === 0 ? (
        <EmptyCard icon={Users}>Nobody here yet.</EmptyCard>
      ) : (
        <>
          <Section title="Team" list={active} />
          <Section
            title="Awaiting approval"
            list={pending}
            hint="Registered through the CRM and waiting on a decision."
          />
          <Section
            title="No access"
            list={denied}
            hint="Denied or revoked. Restoring puts them back."
          />
        </>
      )}

      {open && (
        <AgentDetail
          agent={open}
          canManage={canManage}
          busy={act.isPending}
          onClose={() => setOpenId(null)}
          onAction={act.mutate}
        />
      )}
    </div>
  )
}
