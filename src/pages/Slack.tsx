import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Hash,
  Lock,
  RefreshCw,
  Send,
} from 'lucide-react'
import {
  fetchSlackChannel,
  fetchSlackWorkspace,
  joinSlackChannel,
  postSlackMessage,
  type SlackChannel,
  type SlackMessage,
} from '@/lib/api'
import { ErrorCard, Loading, PageHeader } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Slack — manage the workspace through the bot.
 *
 * Identity is shown first and permanently. Slack reports a revoked app,
 * a missing scope and a channel the bot simply isn't in with errors that
 * all read the same from the outside, and `account_inactive` — the one
 * that took this integration down — is indistinguishable from a typo in
 * the token unless something checks the token on its own.
 *
 * The other recurring trap is membership: scopes grant capability, not
 * access. A correctly-scoped bot still cannot read or post in a channel
 * it has not joined, so joining is a button here rather than something
 * to go and do in Slack.
 */

const timeFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** Resolve <@U123> mentions to names so messages read as they do in Slack. */
function renderText(text: string, userMap: Record<string, string>) {
  const parts = text.split(/(<@[A-Z0-9]+>)/g)
  return parts.map((p, i) => {
    const m = p.match(/^<@([A-Z0-9]+)>$/)
    if (!m) return <span key={i}>{p}</span>
    const name = userMap[m[1]] ?? m[1]
    return (
      <span key={i} className="rounded bg-primary-soft px-1 text-primary">
        @{name}
      </span>
    )
  })
}

function ChannelRow({
  ch,
  active,
  onSelect,
  onJoin,
  joining,
}: {
  ch: SlackChannel
  active: boolean
  onSelect: () => void
  onJoin: () => void
  joining: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-2 border-b border-border-soft px-4 py-2.5 text-left transition last:border-0',
          active ? 'bg-primary-soft' : 'hover:bg-surface-muted',
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
            active ? 'font-semibold text-primary' : 'text-foreground',
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
              onJoin()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                onJoin()
              }
            }}
            className="flex-shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {joining ? '…' : 'Join'}
          </span>
        )}
      </button>
    </li>
  )
}

export default function Slack() {
  const qc = useQueryClient()
  const [channelId, setChannelId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)

  const ws = useQuery({
    queryKey: ['slack'],
    queryFn: fetchSlackWorkspace,
    refetchOnWindowFocus: false,
    staleTime: 120_000,
  })

  const channel = useQuery({
    queryKey: ['slack-channel', channelId],
    queryFn: () => fetchSlackChannel(channelId!),
    enabled: Boolean(channelId),
    refetchOnWindowFocus: false,
  })

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

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title="Slack"
        subtitle="Read and post to the workspace through the Genisys bot."
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Slack' }]}
        actions={
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
        }
      />

      {ws.isLoading && <Loading />}
      {ws.isError && <ErrorCard message={(ws.error as Error).message} />}

      {/* Connection — the first thing to know after swapping a token */}
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

      {identity?.ok && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
          {/* Channels */}
          <div className="h-[calc(100vh-19rem)] min-h-[24rem] overflow-y-auto rounded-2xl border border-border bg-card">
            <h2 className="sticky top-0 border-b border-border bg-card px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Channels ({ws.data?.channels.length ?? 0})
            </h2>
            <ul>
              {(ws.data?.channels ?? []).map((ch) => (
                <ChannelRow
                  key={ch.id}
                  ch={ch}
                  active={ch.id === channelId}
                  onSelect={() => {
                    setChannelId(ch.id)
                    setSendError(null)
                  }}
                  onJoin={() => join.mutate(ch.id)}
                  joining={join.isPending && join.variables === ch.id}
                />
              ))}
            </ul>
          </div>

          {/* Messages */}
          <div className="flex h-[calc(100vh-19rem)] min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-card">
            {!channelId ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Pick a channel to read it.
              </div>
            ) : channel.isLoading ? (
              <Loading />
            ) : channel.data?.error ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <p className="text-sm text-destructive">
                  {channel.data.error}
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  If this says the bot is not in the channel, use Join in the
                  list — scopes alone do not grant membership. Private
                  channels need a person to invite the bot from Slack.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-border px-4 py-2.5">
                  <p className="text-sm font-semibold">
                    #{channel.data?.channelName}
                  </p>
                  {channel.data?.channelTopic && (
                    <p className="truncate text-xs text-muted-foreground">
                      {channel.data.channelTopic}
                    </p>
                  )}
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {(channel.data?.messages ?? []).length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Nothing here yet.
                    </p>
                  ) : (
                    (channel.data?.messages ?? []).map((m: SlackMessage) => (
                      <div key={m.ts} className="text-sm">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold">{m.userName}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {timeFmt.format(new Date(m.timestamp))}
                          </span>
                          {(m.replyCount ?? 0) > 0 && (
                            <span className="text-[11px] text-primary">
                              {m.replyCount} repl
                              {m.replyCount === 1 ? 'y' : 'ies'}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-foreground/90">
                          {renderText(m.text, channel.data?.userMap ?? {})}
                        </p>
                      </div>
                    ))
                  )}
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
                        // Enter sends, Shift+Enter is a newline — the same
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
