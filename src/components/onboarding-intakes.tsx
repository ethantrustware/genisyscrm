import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Inbox } from 'lucide-react'
import {
  fetchClientIntakes,
  setIntakeStatus,
  type ClientIntake,
} from '@/lib/api'
import { Chip, EmptyCard, ErrorCard, Loading } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Onboarding submissions from the intake webhook.
 *
 * Every answer is shown, including the long-form ones, because the point
 * is having the client's own words to hand when building their site.
 * Summarising them here would just send someone off to find the original.
 *
 * Fields the form has grown since the Hub schema was written still
 * arrive in `raw`, so anything unmapped is listed and flagged rather
 * than silently dropped.
 */

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** Mapped fields, in the order someone would actually read them. */
const FIELDS: Array<[keyof ClientIntake, string, boolean?]> = [
  ['fullName', 'Contact name'],
  ['businessName', 'Business'],
  ['businessContact', 'Business email'],
  ['leadEmail', 'Lead email'],
  ['customerPhone', 'Phone'],
  ['areaCode', 'Area code'],
  ['timeZone', 'Time zone'],
  ['ein', 'EIN'],
  ['businessAddress', 'Address'],
  ['cities', 'Cities served'],
  ['website', 'Website'],
  ['socialLinks', 'Social'],
  ['brandColors', 'Brand colours'],
  ['mainServices', 'Main services', true],
  ['aboutBusiness', 'About the business', true],
  ['whyChooseYou', 'Why choose them', true],
  ['promotions', 'Promotions', true],
  ['faqs', 'FAQs', true],
]

const MAPPED = new Set(FIELDS.map(([k]) => String(k)))

const STATUS_TONE: Record<string, 'amber' | 'mint' | 'muted'> = {
  new: 'amber',
  reviewed: 'mint',
  archived: 'muted',
}

function IntakeCard({ intake }: { intake: ClientIntake }) {
  // New submissions open by default — an unread one you have to click to
  // see is one you will forget to read.
  const [open, setOpen] = useState(intake.status === 'new')
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mark = useMutation({
    mutationFn: (status: 'new' | 'reviewed' | 'archived') =>
      setIntakeStatus(intake.id, status),
    onMutate: () => setError(null),
    onError: (e: Error) => setError(e.message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-intakes'] }),
  })

  const extras = Object.entries(intake.raw ?? {}).filter(
    ([k, v]) => !MAPPED.has(k) && v !== null && v !== '',
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-surface-muted"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {intake.businessName ?? 'Unnamed business'}
            </span>
            <Chip tone={STATUS_TONE[intake.status] ?? 'muted'}>
              {intake.status}
            </Chip>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {intake.fullName ?? 'Unknown contact'}
            {intake.leadEmail ? ` · ${intake.leadEmail}` : ''} ·{' '}
            {dateFmt.format(new Date(intake.receivedAt))}
          </p>
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {FIELDS.map(([key, label, long]) => {
              const value = intake[key] as string | null
              return (
                <div key={String(key)} className={cn(long && 'sm:col-span-2')}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd
                    className={cn(
                      'mt-0.5 text-sm',
                      value
                        ? 'whitespace-pre-wrap break-words text-foreground'
                        : 'text-muted-foreground/50',
                    )}
                  >
                    {value ?? 'Not provided'}
                  </dd>
                </div>
              )
            })}

            {extras.map(([k, v]) => (
              <div key={k} className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  {k} · new form field
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm">
                  {typeof v === 'string' ? v : JSON.stringify(v)}
                </dd>
              </div>
            ))}
          </dl>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {intake.status !== 'reviewed' && (
              <button
                type="button"
                disabled={mark.isPending}
                onClick={() => mark.mutate('reviewed')}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
              >
                Mark reviewed
              </button>
            )}
            {intake.status !== 'archived' && (
              <button
                type="button"
                disabled={mark.isPending}
                onClick={() => mark.mutate('archived')}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Archive
              </button>
            )}
            {intake.status !== 'new' && (
              <button
                type="button"
                disabled={mark.isPending}
                onClick={() => mark.mutate('new')}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                Move back to new
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function OnboardingIntakes() {
  const [showArchived, setShowArchived] = useState(false)

  const q = useQuery({
    queryKey: ['client-intakes'],
    queryFn: fetchClientIntakes,
    staleTime: 60_000,
  })

  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorCard message={(q.error as Error).message} />

  const all = q.data?.intakes ?? []
  const visible = showArchived ? all : all.filter((i) => i.status !== 'archived')
  const archivedCount = all.filter((i) => i.status === 'archived').length

  return (
    <div className="flex flex-col gap-3">
      {visible.length === 0 ? (
        <EmptyCard icon={Inbox}>
          No onboarding submissions yet. They appear here the moment the
          intake form posts to the Hub.
        </EmptyCard>
      ) : (
        visible.map((i) => <IntakeCard key={i.id} intake={i} />)
      )}

      {archivedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="self-start text-xs font-medium text-primary hover:underline"
        >
          {showArchived ? 'Hide archived' : `Show ${archivedCount} archived`}
        </button>
      )}
    </div>
  )
}
