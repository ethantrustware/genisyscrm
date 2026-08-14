import { useQuery } from '@tanstack/react-query'
import { Inbox as InboxIcon, Sparkles } from 'lucide-react'
import { fetchInbox, useIsLive, type InboxRow } from '@/lib/api'
import {
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
} from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

export default function Inbox() {
  const live = useIsLive()
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
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Inbox"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Inbox' }]}
        subtitle={live ? undefined : 'Showing demo data.'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Messages" value={mail.length} />
        <SummaryCard label="Unread" value={unread} />
        <SummaryCard label="Detected leads" value={leads} />
      </div>

      {mail.length === 0 ? (
        <EmptyCard icon={InboxIcon}>Inbox is empty.</EmptyCard>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul>
            {mail.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'flex items-start gap-3 border-b border-border-soft px-4 py-3 transition last:border-0 hover:bg-surface-muted',
                  !m.isRead && 'bg-primary-soft/30',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                    m.isRead ? 'bg-transparent' : 'bg-primary',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        'truncate text-sm',
                        m.isRead ? 'font-medium' : 'font-semibold',
                      )}
                    >
                      {m.fromName ?? m.from}
                    </p>
                    {m.isLead && (
                      <Chip tone="mint">
                        <Sparkles className="mr-1 h-3 w-3" />
                        lead
                      </Chip>
                    )}
                    {m.category && <Chip tone="blue">{m.category}</Chip>}
                  </div>
                  <p className="truncate text-sm">{m.subject}</p>
                  {m.snippet && (
                    <p className="truncate text-xs text-muted-foreground">
                      {m.snippet}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(m.date)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
