import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  Building2,
  FileText,
  GripVertical,
  KanbanSquare,
  Mail,
  MessagesSquare,
  Phone,
  Tag,
  User,
  X,
} from 'lucide-react'
import {
  addOpportunityNote,
  fetchOpportunities,
  fetchOpportunityContext,
  fetchPipelines,
  moveOpportunity,
  useIsLive,
  type Opportunity,
} from '@/lib/api'
import {
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
} from '@/components/ui'
import { cn, formatDate, money } from '@/lib/utils'

/**
 * Opportunities — a pipeline board, one column per stage.
 *
 * Sub-account first, then pipeline, then the board. GHL scopes pipelines
 * per location, so a pipeline only means anything alongside the
 * sub-account it came from.
 */

const STATUS_TONE: Record<string, 'mint' | 'pink' | 'amber' | 'blue'> = {
  won: 'mint',
  lost: 'pink',
  abandoned: 'amber',
  open: 'blue',
}

function OpportunityDetail({
  opp,
  stageName,
  subAccount,
  live,
  onClose,
}: {
  opp: Opportunity
  stageName: string | null
  subAccount: string
  live: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)

  const ctxKey = ['opp-context', subAccount, opp.contactId]
  const ctx = useQuery({
    queryKey: ctxKey,
    queryFn: () => fetchOpportunityContext(subAccount, opp.contactId ?? ''),
    enabled: !!opp.contactId,
  })

  const saveNote = useMutation({
    mutationFn: () =>
      addOpportunityNote({
        subAccount,
        contactId: opp.contactId ?? '',
        body: note.trim(),
      }),
    onSuccess: () => {
      setNote('')
      setNoteError(null)
      queryClient.invalidateQueries({ queryKey: ctxKey })
    },
    onError: (e) =>
      setNoteError(e instanceof Error ? e.message : 'Could not save the note.'),
  })

  const rows: Array<{ icon: typeof User; label: string; value: string | null; href?: string }> = [
    { icon: User, label: 'Contact', value: opp.contactName },
    {
      icon: Mail,
      label: 'Email',
      value: opp.contactEmail,
      href: opp.contactEmail ? `mailto:${opp.contactEmail}` : undefined,
    },
    {
      icon: Phone,
      label: 'Phone',
      value: opp.contactPhone,
      href: opp.contactPhone
        ? `tel:${opp.contactPhone.replace(/[^0-9+]/g, '')}`
        : undefined,
    },
    { icon: Building2, label: 'Source', value: opp.source },
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
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{opp.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {stageName ?? 'Unknown stage'}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Chip tone={STATUS_TONE[opp.status] ?? 'muted'}>{opp.status}</Chip>
            <button type="button" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Value
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {opp.value ? money(opp.value * 100) : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Created
            </p>
            <p className="mt-1 text-sm">
              {opp.createdAt ? formatDate(opp.createdAt) : '—'}
            </p>
            {opp.updatedAt && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                updated {formatDate(opp.updatedAt)}
              </p>
            )}
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const Icon = r.icon
            return (
              <li key={r.label} className="flex items-center gap-2.5 text-sm">
                <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="w-16 flex-shrink-0 text-xs text-muted-foreground">
                  {r.label}
                </span>
                {r.value ? (
                  r.href ? (
                    <a
                      href={r.href}
                      className="truncate text-primary hover:underline"
                    >
                      {r.value}
                    </a>
                  ) : (
                    <span className="truncate">{r.value}</span>
                  )
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </li>
            )
          })}
        </ul>

        {/* Tags */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Tag className="h-3 w-3" />
            Tags
          </p>
          {ctx.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (ctx.data?.tags?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">No tags.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {ctx.data!.tags.map((t) => (
                <Chip key={t} tone="blue">
                  {t}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3 w-3" />
            Notes
          </p>

          {(ctx.data?.notes?.length ?? 0) > 0 && (
            <ul className="mb-3 flex max-h-44 flex-col gap-2 overflow-y-auto">
              {ctx.data!.notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-border-soft bg-surface-muted p-2.5"
                >
                  <p className="whitespace-pre-wrap text-xs">{n.body}</p>
                  {n.createdAt && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {noteError && (
            <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              {noteError}
            </p>
          )}

          <div className="flex items-end gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!live || !opp.contactId}
              rows={2}
              placeholder={
                live
                  ? 'Add a note — saved to the contact in GoHighLevel'
                  : 'Sign in to add notes'
              }
              className="min-h-[44px] flex-1 resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!live || !note.trim() || saveNote.isPending}
              onClick={() => saveNote.mutate()}
              className="rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
            >
              {saveNote.isPending ? 'Saving…' : 'Add note'}
            </button>
          </div>
        </div>

        <p className="border-t border-border-soft pt-3 text-[11px] text-muted-foreground">
          Drag a card on the board to change its stage. Other fields are edited
          in GoHighLevel.
        </p>
      </div>
    </div>
  )
}

export default function Opportunities() {
  const live = useIsLive()
  const [sub, setSub] = useState('')
  const [pipelineId, setPipelineId] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const pipes = useQuery({
    queryKey: ['pipelines', sub],
    queryFn: () => fetchPipelines(sub),
  })

  const activeSub = sub || pipes.data?.activeSubAccount || ''
  const pipelines = pipes.data?.pipelines ?? []
  // Default to the contractor pipeline — it's the one the business runs
  // on day to day, and GHL returns pipelines in creation order, which put
  // an unrelated one first. Matched by name so renaming the pipeline in
  // GHL doesn't silently break it back to whatever is first.
  const defaultPipeline =
    pipelines.find((p) => /contractor/i.test(p.name)) ?? pipelines[0]
  const activePipeline =
    pipelines.find((p) => p.id === pipelineId) ?? defaultPipeline

  const oppsKey = ['opportunities', activeSub, activePipeline?.id]

  const opps = useQuery({
    queryKey: oppsKey,
    queryFn: () => fetchOpportunities(activeSub, activePipeline?.id ?? ''),
    enabled: !!activePipeline,
  })

  /**
   * Optimistic move: the card jumps immediately, because waiting on a
   * round-trip to GHL makes the board feel broken. If the write fails the
   * previous state is restored and the reason is shown, so a silent
   * revert never looks like a successful move.
   */
  const move = useMutation({
    mutationFn: (v: { opportunityId: string; stageId: string }) =>
      moveOpportunity({
        subAccount: activeSub,
        pipelineId: activePipeline?.id ?? '',
        ...v,
      }),
    onMutate: async (v) => {
      setMoveError(null)
      await queryClient.cancelQueries({ queryKey: oppsKey })
      const previous = queryClient.getQueryData(oppsKey)
      queryClient.setQueryData(
        oppsKey,
        (old: { opportunities: Opportunity[] } | undefined) =>
          old
            ? {
                ...old,
                opportunities: old.opportunities.map((o) =>
                  o.id === v.opportunityId ? { ...o, stageId: v.stageId } : o,
                ),
              }
            : old,
      )
      return { previous }
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(oppsKey, ctx.previous)
      setMoveError(
        err instanceof Error ? err.message : 'Could not move that card.',
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: oppsKey }),
  })

  if (pipes.isLoading) return <Loading />
  if (pipes.isError)
    return (
      <ErrorCard
        message={
          pipes.error instanceof Error
            ? pipes.error.message
            : 'Could not load pipelines.'
        }
      />
    )

  const list = opps.data?.opportunities ?? []
  const stages = activePipeline?.stages ?? []
  const subs = pipes.data?.subAccounts ?? []
  const subErrors = pipes.data?.subAccountErrors ?? []

  const byStage = new Map<string, Opportunity[]>()
  for (const o of list) {
    const key = o.stageId ?? 'unstaged'
    byStage.set(key, [...(byStage.get(key) ?? []), o])
  }

  const totalValue = list.reduce((s, o) => s + (o.value || 0), 0)
  const won = list.filter((o) => o.status === 'won').length
  const open = list.filter((o) => o.status === 'open').length
  const selected = openId ? list.find((o) => o.id === openId) : null

  const pillCls =
    'inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-soft transition hover:bg-muted focus:outline-none'

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
      <PageHeader
        title="Opportunities"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Opportunities' }]}
        subtitle={
          live
            ? `${list.length} in ${activePipeline?.name ?? 'this pipeline'}`
            : 'Showing demo data.'
        }
      />

      {subErrors.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {subErrors.length} sub-account
            {subErrors.length === 1 ? '' : 's'} could not be reached:{' '}
            {subErrors.map((e) => e.vaultName).join(', ')}.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={activeSub}
          onChange={(e) => {
            setSub(e.target.value)
            setPipelineId('')
            setOpenId(null)
          }}
          className={pillCls}
        >
          {subs.map((s) => (
            <option key={s.vaultName} value={s.vaultName}>
              {s.locationName}
            </option>
          ))}
        </select>

        {pipelines.length > 0 && (
          <select
            value={activePipeline?.id ?? ''}
            onChange={(e) => {
              setPipelineId(e.target.value)
              setOpenId(null)
            }}
            className={pillCls}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <span className="text-xs text-muted-foreground">
          {stages.length} stage{stages.length === 1 ? '' : 's'}
          {live
            ? ' · drag a card to move it'
            : ' · sign in to move cards'}
        </span>
      </div>

      {moveError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{moveError}</span>
          <button type="button" onClick={() => setMoveError(null)}>
            <X className="h-4 w-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Opportunities" value={list.length} />
        <SummaryCard label="Open" value={open} />
        <SummaryCard label="Won" value={won} tone={won > 0 ? 'good' : 'default'} />
        <SummaryCard
          label="Pipeline value"
          value={totalValue ? money(totalValue * 100) : '—'}
        />
      </div>

      {opps.isLoading ? (
        <Loading />
      ) : opps.isError ? (
        <ErrorCard
          message={
            opps.error instanceof Error
              ? opps.error.message
              : 'Could not load opportunities.'
          }
        />
      ) : stages.length === 0 ? (
        <EmptyCard icon={KanbanSquare}>
          This pipeline has no stages.
        </EmptyCard>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3" style={{ minWidth: stages.length * 240 }}>
            {stages.map((st) => {
              const cards = byStage.get(st.id) ?? []
              const value = cards.reduce((s, o) => s + (o.value || 0), 0)
              return (
                <div
                  key={st.id}
                  onDragOver={(e) => {
                    if (!live || !dragId) return
                    // Without preventDefault the browser refuses the drop.
                    e.preventDefault()
                    setOverStage(st.id)
                  }}
                  onDragLeave={() =>
                    setOverStage((cur) => (cur === st.id ? null : cur))
                  }
                  onDrop={(e) => {
                    e.preventDefault()
                    setOverStage(null)
                    const id = e.dataTransfer.getData('text/plain') || dragId
                    setDragId(null)
                    if (!live || !id) return
                    const card = list.find((o) => o.id === id)
                    if (!card || card.stageId === st.id) return
                    move.mutate({ opportunityId: id, stageId: st.id })
                  }}
                  className={cn(
                    'flex w-[236px] flex-shrink-0 flex-col rounded-2xl border bg-card transition',
                    overStage === st.id && live
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border',
                  )}
                >
                  <div className="border-b border-border-soft px-3 py-2.5">
                    <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {st.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {cards.length}
                      {value > 0 ? ` · ${money(value * 100)}` : ''}
                    </p>
                  </div>

                  <div className="flex max-h-[58vh] flex-col gap-2 overflow-y-auto p-2">
                    {cards.length === 0 ? (
                      <p className="py-6 text-center text-[11px] text-muted-foreground">
                        —
                      </p>
                    ) : (
                      cards.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          draggable={live}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', o.id)
                            e.dataTransfer.effectAllowed = 'move'
                            setDragId(o.id)
                          }}
                          onDragEnd={() => {
                            setDragId(null)
                            setOverStage(null)
                          }}
                          onClick={() => setOpenId(o.id)}
                          className={cn(
                            'group rounded-xl border border-border-soft bg-surface-muted p-2.5 text-left transition hover:border-primary/40 hover:bg-muted',
                            o.status !== 'open' && 'opacity-75',
                            live && 'cursor-grab active:cursor-grabbing',
                            dragId === o.id && 'opacity-40',
                          )}
                        >
                          <p className="flex items-start gap-1 truncate text-sm font-medium">
                            {live && (
                              <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                            )}
                            <span className="truncate">{o.name}</span>
                          </p>
                          {o.contactName && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {o.contactName}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold tabular-nums">
                              {o.value ? money(o.value * 100) : '—'}
                            </span>
                            {o.status !== 'open' && (
                              <Chip tone={STATUS_TONE[o.status] ?? 'muted'}>
                                {o.status}
                              </Chip>
                            )}
                          </div>

                          {/* Quick actions, mirroring GHL's own card row.
                              Rendered as spans inside the card button and
                              stopped from bubbling, so tapping one does not
                              also open the detail panel. */}
                          <span className="mt-2 flex items-center gap-1 border-t border-border-soft pt-1.5">
                            {o.contactPhone && (
                              <a
                                href={`tel:${o.contactPhone.replace(/[^0-9+]/g, '')}`}
                                onClick={(e) => e.stopPropagation()}
                                title={`Call ${o.contactPhone}`}
                                className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-card hover:text-primary"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <Link
                              to="/crm"
                              search={{
                                contactId: o.contactId ?? undefined,
                                subAccount: activeSub,
                                contactName: o.contactName ?? undefined,
                              }}
                              onClick={(e) => e.stopPropagation()}
                              title="View conversations"
                              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-card hover:text-primary"
                            >
                              <MessagesSquare className="h-3.5 w-3.5" />
                            </Link>
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenId(o.id)
                              }}
                              title="Tags and notes"
                              className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground transition hover:bg-card hover:text-primary"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selected && (
        <OpportunityDetail
          opp={selected}
          stageName={
            stages.find((st) => st.id === selected.stageId)?.name ?? null
          }
          subAccount={activeSub}
          live={live}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}
