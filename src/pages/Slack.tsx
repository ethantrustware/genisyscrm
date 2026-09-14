import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Hash,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Mail,
  Send,
  UserPlus,
  X,
} from 'lucide-react'
import {
  createSlackChannel,
  fetchSlackChannel,
  fetchSlackMembers,
  fetchSlackThread,
  fetchSlackWorkspace,
  inviteExternalToSlackChannel,
  inviteToSlackChannel,
  joinSlackChannel,
  postSlackMessage,
  type SlackChannel,
  type SlackMessage,
  type SlackUser,
} from '@/lib/api'
import { ErrorCard, Loading, PageHeader } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Slack — manage the workspace through the bot.
 *
 * Identity is shown first and permanently. Slack reports a revoked app,
 * a missing scope and a channel the bot isn't in with errors that all
 * read the same from outside, and `account_inactive` — the one that took
 * this integration down — is indistinguishable from a typo'd token
 * unless something checks the token on its own.
 *
 * Reading is built to be skimmed rather than parsed: newest at the
 * bottom like Slack itself, day separators, consecutive messages from
 * one person collapsed into a block, and threads opened in place instead
 * of sending anyone back to the Slack app.
 */

const timeOnly = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

/** Day heading — relative for the recent ones, dated for the rest. */
function dayHeading(d: Date): string {
  const start = (x: Date) => {
    const c = new Date(x)
    c.setHours(0, 0, 0, 0)
    return c.getTime()
  }
  const diff = Math.round((start(d) - start(new Date())) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

const dayKey = (iso: string) => new Date(iso).toDateString()

/** Resolve <@U123> mentions so messages read as they do in Slack. */
function renderText(text: string, userMap: Record<string, string>) {
  return text.split(/(<@[A-Z0-9]+>)/g).map((p, i) => {
    const m = p.match(/^<@([A-Z0-9]+)>$/)
    if (!m) return <span key={i}>{p}</span>
    return (
      <span key={i} className="rounded bg-primary-soft px-1 text-primary">
        @{userMap[m[1]] ?? m[1]}
      </span>
    )
  })
}

/* -------------------------------------------------------------------------- */

function CreateChannel({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Slack's own rule: lowercase, no spaces or dots, 80 max. Showing the
  // result up front beats having Slack silently rename it.
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  const create = useMutation({
    mutationFn: () => createSlackChannel({ name: slug, topic, isPrivate }),
    onError: (e: Error) => setError(e.message),
    onSuccess: (r) => {
      onCreated(r.channelId)
      onClose()
    },
  })

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">New channel</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="client-acme-roofing"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          {name && (
            <span className="text-[11px] text-muted-foreground">
              Slack will call it <span className="font-mono">#{slug}</span>
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Topic (optional)</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What this channel is for"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </label>

        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-xs">
            <span className="font-semibold">Private</span>
            <span className="block text-muted-foreground">
              Only invited people can see it. This cannot be changed back to
              public later from here.
            </span>
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!slug || create.isPending}
            onClick={() => {
              setError(null)
              create.mutate()
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create channel'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/**
 * Invite someone outside the workspace, by email.
 *
 * This is Slack Connect, not a workspace invite — it shares one channel
 * with them and they stay on their own Slack. Adding a real member by
 * email requires admin.users.invite, which Slack limits to Enterprise
 * Grid, so that is stated rather than offered and left to fail.
 */
function ExternalInvite({
  channelId,
  channelName,
}: {
  channelId: string
  channelName: string
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const invite = useMutation({
    mutationFn: () => inviteExternalToSlackChannel(channelId, email.trim()),
    onMutate: () => {
      setError(null)
      setDone(null)
    },
    onError: (e: Error) => setError(e.message),
    onSuccess: (r) => {
      setDone(`Invite sent to ${r.email}.`)
      setEmail('')
    },
  })

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">Invite someone outside</span>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && email.trim() && !invite.isPending) {
              invite.mutate()
            }
          }}
          placeholder="them@theircompany.com"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          type="button"
          disabled={!email.trim() || invite.isPending}
          onClick={() => invite.mutate()}
          className="flex-shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
        >
          {invite.isPending ? 'Sending…' : 'Invite'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
      {done && <p className="mt-1.5 text-[11px] text-emerald-600">{done}</p>}
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Slack Connect: shares #{channelName} with them. They stay on their own
        Slack and do not become a member of this workspace — that has to be
        done from Slack itself.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/**
 * Members panel — who is in the channel, and who can be added.
 *
 * Both lists come from one call so membership shows inline. Slack
 * rejects an entire invite batch if any one person is already in the
 * channel, so people already in it are listed but not selectable.
 */
function Members({
  channelId,
  channelName,
  onClose,
}: {
  channelId: string
  channelName: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const members = useQuery({
    queryKey: ['slack-members', channelId],
    queryFn: () => fetchSlackMembers(channelId),
  })

  const invite = useMutation({
    mutationFn: () => inviteToSlackChannel(channelId, [...picked]),
    onMutate: () => {
      setError(null)
      setDone(null)
    },
    onError: (e: Error) => setError(e.message),
    onSuccess: (r) => {
      setPicked(new Set())
      setDone(
        r.invited.length > 0
          ? `Added ${r.invited.length} ${r.invited.length === 1 ? 'person' : 'people'}.`
          : 'Everyone selected was already in the channel.',
      )
      members.refetch()
      qc.invalidateQueries({ queryKey: ['slack'] })
    },
  })

  const inChannel = new Set(members.data?.memberIds ?? [])
  const needle = q.trim().toLowerCase()
  const people = (members.data?.users ?? []).filter((u: SlackUser) =>
    needle
      ? u.name.toLowerCase().includes(needle) ||
        (u.realName ?? '').toLowerCase().includes(needle) ||
        (u.email ?? '').toLowerCase().includes(needle)
      : true,
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            People in #{channelName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {inChannel.size} in the channel
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to messages"
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </div>

      {members.isLoading && <Loading />}
      {members.data?.error && (
        <p className="px-4 py-3 text-sm text-destructive">
          {members.data.error}
        </p>
      )}

      <ul className="flex-1 overflow-y-auto">
        {people.map((u: SlackUser) => {
          const already = inChannel.has(u.id)
          const checked = picked.has(u.id)
          return (
            <li key={u.id}>
              <label
                className={cn(
                  'flex items-center gap-3 border-b border-border-soft px-4 py-2.5 last:border-0',
                  already ? 'opacity-60' : 'cursor-pointer hover:bg-surface-muted',
                )}
              >
                <input
                  type="checkbox"
                  disabled={already}
                  checked={checked}
                  onChange={(e) => {
                    const next = new Set(picked)
                    if (e.target.checked) next.add(u.id)
                    else next.delete(u.id)
                    setPicked(next)
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {u.realName ?? u.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {u.email ?? `@${u.name}`}
                  </span>
                </span>
                {already && (
                  <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    In channel
                  </span>
                )}
              </label>
            </li>
          )
        })}
        {people.length === 0 && !members.isLoading && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nobody matches.
          </li>
        )}
      </ul>

      <div className="border-t border-border p-3">
        <ExternalInvite channelId={channelId} channelName={channelName} />
      </div>

      <div className="border-t border-border p-3">
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        {done && <p className="mb-2 text-xs text-emerald-600">{done}</p>}
        <button
          type="button"
          disabled={picked.size === 0 || invite.isPending}
          onClick={() => invite.mutate()}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {invite.isPending
            ? 'Adding…'
            : picked.size === 0
              ? 'Select people to add'
              : `Add ${picked.size} to #${channelName}`}
        </button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          They are added immediately and will see the channel history.
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Thread({
  channelId,
  parent,
  userMap,
}: {
  channelId: string
  parent: SlackMessage
  userMap: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const q = useQuery({
    queryKey: ['slack-thread', channelId, parent.ts],
    queryFn: () => fetchSlackThread(channelId, parent.ts),
    enabled: open,
  })

  const count = parent.replyCount ?? 0
  if (count === 0) return null

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
      >
        <MessageSquare className="h-3 w-3" />
        {open ? 'Hide' : `${count} repl${count === 1 ? 'y' : 'ies'}`}
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5 border-l-2 border-border pl-3">
          {q.isLoading && (
            <p className="text-[11px] text-muted-foreground">Loading…</p>
          )}
          {q.data?.error && (
            <p className="text-[11px] text-destructive">{q.data.error}</p>
          )}
          {(q.data?.replies ?? []).map((r) => (
            <div key={r.ts} className="text-sm">
              <span className="mr-2 text-xs font-semibold">{r.userName}</span>
              <span className="text-[11px] text-muted-foreground">
                {timeOnly.format(new Date(r.timestamp))}
              </span>
              <p className="whitespace-pre-wrap break-words text-foreground/90">
                {renderText(r.text, userMap)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export default function Slack() {
  const qc = useQueryClient()
  const [channelId, setChannelId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const ws = useQuery({
    queryKey: ['slack'],
    queryFn: fetchSlackWorkspace,
    refetchOnWindowFocus: false,
    staleTime: 120_000,
  })

  const channel = useQuery({
    queryKey: ['slack-channel', channelId],
    queryFn: () => fetchSlackChannel(channelId!, 100),
    enabled: Boolean(channelId),
    refetchOnWindowFocus: false,
  })

  // Newest at the bottom, like Slack — so land there rather than making
  // someone scroll down to find the current conversation.
  useEffect(() => {
    if (channel.data?.messages?.length) {
      bottomRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [channel.data?.messages, channelId])

  const join = useMutation({
    mutationFn: (id: string) => joinSlackChannel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slack'] }),
  })

  const send = useMutation({
    mutationFn: () => postSlackMessage(channelId!, draft),
    onMutate: () => setSendError(null),
    onError: (e: Error) => setSendError(e.message),
    onSuccess: () => {
      setDraft('')
      channel.refetch()
    },
  })

  const identity = ws.data?.identity

  const channels = useMemo(() => {
    const all = ws.data?.channels ?? []
    const q = filter.trim().toLowerCase()
    return q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all
  }, [ws.data?.channels, filter])

  /** Group into day blocks, then collapse runs from the same author. */
  const grouped = useMemo(() => {
    const msgs = channel.data?.messages ?? []
    const days: Array<{ day: string; blocks: SlackMessage[][] }> = []
    for (const m of msgs) {
      const key = dayKey(m.timestamp)
      let day = days[days.length - 1]
      if (!day || day.day !== key) {
        day = { day: key, blocks: [] }
        days.push(day)
      }
      const last = day.blocks[day.blocks.length - 1]
      const sameAuthor = last && last[0].userId === m.userId
      // Five minutes is roughly where a reply stops feeling like part of
      // the same thought.
      const closeInTime =
        last &&
        new Date(m.timestamp).getTime() -
          new Date(last[last.length - 1].timestamp).getTime() <
          5 * 60_000
      if (sameAuthor && closeInTime) last.push(m)
      else day.blocks.push([m])
    }
    return days
  }, [channel.data?.messages])

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title="Slack"
        subtitle="Read and post to the workspace through the Genisys bot."
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Slack' }]}
        actions={
          <div className="flex items-center gap-2">
            {identity?.ok && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                New channel
              </button>
            )}
            <button
              type="button"
              onClick={() => ws.refetch()}
              disabled={ws.isFetching}
              aria-label="Refresh"
              className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={cn('h-4 w-4', ws.isFetching && 'animate-spin')}
              />
            </button>
          </div>
        }
      />

      {ws.isLoading && <Loading />}
      {ws.isError && <ErrorCard message={(ws.error as Error).message} />}

      {identity && (
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-2xl border p-4 text-sm',
            identity.ok
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-destructive/40 bg-destructive/5',
          )}
        >
          {identity.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
          )}
          <div className="min-w-0">
            {identity.ok ? (
              <p>
                Connected as{' '}
                <span className="font-semibold">{identity.botName}</span> in{' '}
                <span className="font-semibold">{identity.team}</span>.
              </p>
            ) : (
              <>
                <p className="font-semibold">Slack rejected the token.</p>
                <p className="mt-0.5 text-muted-foreground">{identity.error}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Replace the <code>Slack Bot Token</code> entry in the Vault
                  with a fresh Bot User OAuth token, then refresh.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {ws.data?.channelsError && (
        <ErrorCard message={`Channels: ${ws.data.channelsError}`} />
      )}

      {creating && (
        <CreateChannel
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            qc.invalidateQueries({ queryKey: ['slack'] })
            setChannelId(id)
          }}
        />
      )}

      {identity?.ok && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,290px)_1fr]">
          {/* Channels */}
          <div className="flex h-[calc(100vh-19rem)] min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={`Filter ${ws.data?.channels.length ?? 0} channels…`}
                  className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {channels.map((ch: SlackChannel) => (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setChannelId(ch.id)
                      setSendError(null)
                      setShowMembers(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 border-b border-border-soft px-3 py-2.5 text-left transition last:border-0',
                      ch.id === channelId
                        ? 'bg-primary-soft'
                        : 'hover:bg-surface-muted',
                    )}
                  >
                    {ch.isPrivate ? (
                      <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <Hash className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        ch.id === channelId && 'font-semibold text-primary',
                      )}
                    >
                      {ch.name}
                    </span>
                    <span className="flex-shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {ch.memberCount}
                    </span>
                    {ch.isMember === false && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          join.mutate(ch.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation()
                            join.mutate(ch.id)
                          }
                        }}
                        className="flex-shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        {join.isPending && join.variables === ch.id
                          ? '…'
                          : 'Join'}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {channels.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No channels match.
                </li>
              )}
            </ul>
          </div>

          {/* Messages */}
          <div className="flex h-[calc(100vh-19rem)] min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-border bg-card">
            {!channelId ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Pick a channel to read it.
              </div>
            ) : channel.isLoading ? (
              <Loading />
            ) : channel.data?.error ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <p className="text-sm text-destructive">{channel.data.error}</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  If this says the bot is not in the channel, use Join in the
                  list — scopes alone do not grant membership. Private channels
                  need a person to invite the bot from Slack.
                </p>
              </div>
            ) : showMembers ? (
              <Members
                channelId={channelId}
                channelName={channel.data?.channelName ?? ''}
                onClose={() => setShowMembers(false)}
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      #{channel.data?.channelName}
                    </p>
                    {channel.data?.channelTopic && (
                      <p className="truncate text-xs text-muted-foreground">
                        {channel.data.channelTopic}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMembers(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {channel.data?.memberCount} members
                    </button>
                    <button
                      type="button"
                      onClick={() => channel.refetch()}
                      disabled={channel.isFetching}
                      aria-label="Refresh messages"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      <RefreshCw
                        className={cn(
                          'h-3.5 w-3.5',
                          channel.isFetching && 'animate-spin',
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {grouped.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Nothing here yet.
                    </p>
                  ) : (
                    grouped.map((day) => (
                      <div key={day.day}>
                        <div className="my-3 flex items-center gap-3">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {dayHeading(new Date(day.day))}
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>

                        <div className="space-y-3">
                          {day.blocks.map((block) => (
                            <div key={block[0].ts} className="text-sm">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold">
                                  {block[0].userName}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {timeOnly.format(
                                    new Date(block[0].timestamp),
                                  )}
                                </span>
                              </div>
                              {block.map((m) => (
                                <div key={m.ts}>
                                  <p className="whitespace-pre-wrap break-words text-foreground/90">
                                    {renderText(
                                      m.text,
                                      channel.data?.userMap ?? {},
                                    )}
                                  </p>
                                  {channelId && (
                                    <Thread
                                      channelId={channelId}
                                      parent={m}
                                      userMap={channel.data?.userMap ?? {}}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="border-t border-border p-3">
                  {sendError && (
                    <p className="mb-2 text-xs text-destructive">{sendError}</p>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        // Enter sends, Shift+Enter is a newline — the
                        // reflex Slack itself trains.
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (draft.trim() && !send.isPending) send.mutate()
                        }
                      }}
                      placeholder={`Message #${channel.data?.channelName ?? ''}`}
                      className="min-h-[44px] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={!draft.trim() || send.isPending}
                      onClick={() => send.mutate()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {send.isPending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Posts as {identity.botName} — real people will see it.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
