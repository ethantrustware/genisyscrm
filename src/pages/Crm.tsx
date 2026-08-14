import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Mail,
  MessageSquare,
  Phone,
  Search,
  X,
} from 'lucide-react'
import {
  fetchConversations,
  fetchSubAccounts,
  fetchThread,
  useIsLive,
  type CrmConversation,
  type CrmGroup,
} from '@/lib/api'
import {
  Chip,
  ErrorCard,
  Loading,
  PageHeader,
} from '@/components/ui'
import { cn, formatDate, initials } from '@/lib/utils'

/**
 * CRM — GoHighLevel conversations.
 *
 * Sub-account first, then conversations, then the thread. The Hub loads
 * every sub-account at once, which is its slowest page; picking one
 * keeps this responsive and makes "which inbox am I in" explicit.
 */

const ALL = 'all'

function typeIcon(t: string | null) {
  if (t === 'TYPE_EMAIL') return Mail
  if (t === 'TYPE_CALL') return Phone
  return MessageSquare
}

function ConversationList({
  groups,
  selectedId,
  onSelect,
  query,
}: {
  groups: CrmGroup[]
  selectedId: string | null
  onSelect: (subAccount: string, c: CrmConversation) => void
  query: string
}) {
  const q = query.trim().toLowerCase()

  return (
    <div className="flex flex-col">
      {groups.map((g) => {
        const list = q
          ? g.conversations.filter((c) =>
              [c.contactName, c.contactEmail, c.contactPhone, c.lastMessageBody]
                .filter(Boolean)
                .some((v) => (v as string).toLowerCase().includes(q)),
            )
          : g.conversations

        return (
          <div key={g.subAccount.vaultName}>
            {groups.length > 1 && (
              <p className="sticky top-0 z-10 border-b border-border-soft bg-surface-muted px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.subAccount.locationName} · {list.length}
              </p>
            )}

            {g.error && (
              <p className="border-b border-border-soft px-4 py-3 text-xs text-destructive">
                {g.error}
              </p>
            )}

            {list.length === 0 && !g.error && (
              <p className="border-b border-border-soft px-4 py-6 text-center text-xs text-muted-foreground">
                No conversations.
              </p>
            )}

            {list.map((c) => {
              const Icon = typeIcon(c.lastMessageType)
              const active = c.id === selectedId
              const name =
                c.contactName || c.contactEmail || c.contactPhone || 'Unknown'
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(g.subAccount.vaultName, c)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-border-soft px-4 py-3 text-left transition',
                    active ? 'bg-primary-soft' : 'hover:bg-surface-muted',
                  )}
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                    {initials(name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-sm',
                          c.unreadCount > 0 ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {name}
                      </span>
                      <span className="flex flex-shrink-0 items-center gap-1.5">
                        {c.unreadCount > 0 && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            {c.unreadCount}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {c.lastMessageDate
                            ? formatDate(c.lastMessageDate)
                            : ''}
                        </span>
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <Icon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs text-muted-foreground">
                        {c.lastMessageBody || 'No message body'}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function Thread({
  subAccount,
  convId,
}: {
  subAccount: string
  convId: string
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['crm-thread', subAccount, convId],
    queryFn: () => fetchThread(subAccount, convId),
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={
          error instanceof Error ? error.message : 'Could not load the thread.'
        }
      />
    )

  const t = data!
  const c = t.contact
  const name =
    [c?.firstName, c?.lastName].filter(Boolean).join(' ') ||
    t.conversation.contactName ||
    'Unknown contact'

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[c?.phone, c?.email].filter(Boolean).join(' · ') || subAccount}
          </p>
        </div>
        {c?.source && <Chip tone="blue">{c.source}</Chip>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {t.messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages in this conversation.
          </p>
        )}

        {t.messages.map((m) => {
          const out = m.direction === 'outbound'
          return (
            <div
              key={m.id}
              className={cn('flex', out ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm',
                  out
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card',
                )}
              >
                {m.body ? (
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                ) : (
                  <p className="italic opacity-70">(no body)</p>
                )}

                {m.attachments.map((a) => (
                  <a
                    key={a}
                    href={a}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-xs underline opacity-80"
                  >
                    {a.split('/').pop()}
                  </a>
                ))}

                <p
                  className={cn(
                    'mt-1 text-[10px]',
                    out ? 'opacity-70' : 'text-muted-foreground',
                  )}
                >
                  {m.messageType?.replace('TYPE_', '').toLowerCase()}
                  {m.dateAdded ? ` · ${formatDate(m.dateAdded)}` : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        Read-only view — replies are sent from the Hub.
      </p>
    </div>
  )
}

export default function Crm() {
  const live = useIsLive()
  const [sub, setSub] = useState<string>('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<{
    subAccount: string
    id: string
  } | null>(null)

  const subs = useQuery({
    queryKey: ['crm-subaccounts'],
    queryFn: fetchSubAccounts,
  })

  // Default to the first sub-account once they load.
  const subAccounts = subs.data?.subAccounts ?? []
  const active = sub || subAccounts[0]?.vaultName || ''

  const convos = useQuery({
    queryKey: ['crm-conversations', active],
    queryFn: () => fetchConversations(active),
    enabled: !!active,
  })

  if (subs.isLoading) return <Loading />
  if (subs.isError)
    return (
      <ErrorCard
        message={
          subs.error instanceof Error
            ? subs.error.message
            : 'Could not load sub-accounts.'
        }
      />
    )

  const groups = convos.data?.groups ?? []
  const total = groups.reduce((n, g) => n + g.conversations.length, 0)

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
      <PageHeader
        title="CRM"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'CRM' }]}
        subtitle={
          live
            ? `${total} conversation${total === 1 ? '' : 's'} loaded`
            : 'Showing demo data.'
        }
      />

      {subs.data?.errors && subs.data.errors.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {subs.data.errors.length} sub-account
            {subs.data.errors.length === 1 ? '' : 's'} could not be reached:{' '}
            {subs.data.errors.map((e) => e.vaultName).join(', ')}. Their tokens
            may have expired.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={active}
          onChange={(e) => {
            setSub(e.target.value)
            setSelected(null)
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-soft transition hover:bg-muted focus:outline-none"
        >
          {subAccounts.map((s) => (
            <option key={s.vaultName} value={s.vaultName}>
              {s.locationName}
            </option>
          ))}
          <option value={ALL}>All sub-accounts (slower)</option>
        </select>

        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search loaded conversations…"
            className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-9 text-sm shadow-soft focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="max-h-[68vh] overflow-y-auto rounded-2xl border border-border bg-card">
          {convos.isLoading ? (
            <Loading />
          ) : convos.isError ? (
            <p className="p-4 text-sm text-destructive">
              {convos.error instanceof Error
                ? convos.error.message
                : 'Could not load conversations.'}
            </p>
          ) : (
            <ConversationList
              groups={groups}
              selectedId={selected?.id ?? null}
              query={query}
              onSelect={(subAccount, c) =>
                setSelected({ subAccount, id: c.id })
              }
            />
          )}
        </div>

        <div className="max-h-[68vh] overflow-hidden rounded-2xl border border-border bg-card">
          {selected ? (
            <Thread subAccount={selected.subAccount} convId={selected.id} />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Pick a conversation to read the thread.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
