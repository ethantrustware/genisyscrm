import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Inbox as InboxIcon, Plus, Sparkles } from 'lucide-react'
import {
  fetchEmail,
  fetchInbox,
  useIsLive,
  type InboxRow,
} from '@/lib/api'
import {
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
} from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { ComposeWindow } from '@/components/compose'

function Reader({ id }: { id: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['email', id],
    queryFn: () => fetchEmail(id),
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={
          error instanceof Error ? error.message : 'Could not load the email.'
        }
      />
    )

  const m = data!

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">{m.subject || '(no subject)'}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {m.fromName ? `${m.fromName} · ` : ''}
          {m.from}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          to {m.to} · {formatDate(m.date)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {m.bodyText ? (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {m.bodyText}
          </pre>
        ) : m.bodyHtml ? (
          /* Rendered as text, not HTML. Injecting a remote sender's markup
             into the page would hand them script execution. */
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-muted-foreground">
            {m.bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
          </pre>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            {m.snippet || 'No body stored for this message.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default function Inbox() {
  const live = useIsLive()
  const [selected, setSelected] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)

  const { data, isLoading, isError, error } = useQuery<InboxRow[]>({
    queryKey: ['inbox'],
    queryFn: fetchInbox,
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={error instanceof Error ? error.message : 'Could not load.'}
      />
    )

  const mail = data ?? []
  const unread = mail.filter((m) => !m.isRead).length
  const leads = mail.filter((m) => m.isLead).length

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
      <PageHeader
        title="Inbox"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Inbox' }]}
        subtitle={live ? undefined : 'Showing demo data.'}
        actions={
          <button
            type="button"
            onClick={() => setComposing(true)}
            title="New email"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Compose
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Messages" value={mail.length} />
        <SummaryCard label="Unread" value={unread} />
        <SummaryCard label="Detected leads" value={leads} />
      </div>

      {mail.length === 0 ? (
        <EmptyCard icon={InboxIcon}>Inbox is empty.</EmptyCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div className="max-h-[68vh] overflow-y-auto rounded-2xl border border-border bg-card">
            <ul>
              {mail.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(m.id)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-border-soft px-4 py-3 text-left transition',
                      m.id === selected
                        ? 'bg-primary-soft'
                        : !m.isRead
                          ? 'bg-primary-soft/30 hover:bg-surface-muted'
                          : 'hover:bg-surface-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                        m.isRead ? 'bg-transparent' : 'bg-primary',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'truncate text-sm',
                            m.isRead ? 'font-medium' : 'font-semibold',
                          )}
                        >
                          {m.fromName ?? m.from}
                        </span>
                        {m.isLead && (
                          <Chip tone="mint">
                            <Sparkles className="mr-1 h-3 w-3" />
                            lead
                          </Chip>
                        )}
                      </span>
                      <span className="block truncate text-sm">
                        {m.subject}
                      </span>
                      {m.snippet && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {m.snippet}
                        </span>
                      )}
                    </span>
                    <span className="flex-shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                      {formatDate(m.date)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="max-h-[68vh] overflow-hidden rounded-2xl border border-border bg-card">
            {selected ? (
              <Reader id={selected} />
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Pick a message to read it.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {composing && (
        <ComposeWindow live={live} onClose={() => setComposing(false)} />
      )}
    </div>
  )
}
