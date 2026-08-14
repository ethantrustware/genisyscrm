import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Building2, Plus, RotateCcw, Search, X } from 'lucide-react'
import {
  createClient,
  fetchClients,
  updateClient,
  useIsLive,
  type Client,
} from '@/lib/api'
import {
  Avatar,
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
  btnPrimary,
  inputCls,
} from '@/components/ui'
import { cn } from '@/lib/utils'

function NewClientForm({
  busy,
  onCancel,
  onSave,
}: {
  busy: boolean
  onCancel: () => void
  onSave: (c: Record<string, unknown>) => void
}) {
  const [f, setF] = useState({
    name: '',
    state: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
  })
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">New client</h3>
        <button type="button" onClick={onCancel}>
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['name', 'Client name *', 'Acme Roofing'],
          ['state', 'State', 'Arizona'],
          ['contactName', 'Contact name', 'Jane Doe'],
          ['contactEmail', 'Contact email', 'jane@acme.com'],
          ['contactPhone', 'Contact phone', '(555) 123-4567'],
          ['notes', 'Notes', ''],
        ].map(([k, label, ph]) => (
          <label key={k} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">{label}</span>
            <input
              className={inputCls}
              value={f[k as keyof typeof f]}
              onChange={(e) => set(k, e.target.value)}
              placeholder={ph}
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={busy || !f.name.trim()}
        onClick={() => onSave(f)}
        className={cn(btnPrimary, 'mt-4')}
      >
        Create client
      </button>
    </div>
  )
}

export default function Clients() {
  const live = useIsLive()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError, error: qErr } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: fetchClients,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['clients'] })
  const onErr = (e: unknown) =>
    setError(e instanceof Error ? e.message : 'Something went wrong.')

  const add = useMutation({
    mutationFn: (c: Record<string, unknown>) => createClient(c),
    onSuccess: () => {
      setAdding(false)
      setError(null)
      refresh()
    },
    onError: onErr,
  })

  const archive = useMutation({
    mutationFn: (v: { id: string; active: boolean }) =>
      updateClient(v.id, { active: v.active }),
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

  const all = data ?? []
  const q = query.trim().toLowerCase()
  const filtered = q
    ? all.filter((c) =>
        [c.name, c.state, c.contactName]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      )
    : all

  const active = filtered.filter((c) => c.active)
  const archived = filtered.filter((c) => !c.active)
  const busy = add.isPending || archive.isPending

  const Row = ({ c }: { c: Client }) => (
    <li
      className={cn(
        'flex flex-wrap items-center gap-3 border-t border-border-soft px-2 py-4 transition hover:bg-surface-muted',
        !c.active && 'opacity-70',
      )}
    >
      <Avatar name={c.name} color={c.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{c.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[c.state, c.contactName, c.contactEmail].filter(Boolean).join(' · ') ||
            '—'}
        </p>
      </div>
      <span className="tabular-nums text-sm text-muted-foreground">
        {c.appointmentCount}
      </span>
      <Chip tone={c.active ? 'mint' : 'muted'}>
        {c.active ? 'Active' : 'Archived'}
      </Chip>
      {live && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (
              c.active &&
              !window.confirm(
                `Archive ${c.name}? Their appointments and history are kept — they just stop appearing as active.`,
              )
            )
              return
            archive.mutate({ id: c.id, active: !c.active })
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
        >
          {c.active ? (
            <>
              <Archive className="h-3.5 w-3.5" />
              Archive
            </>
          ) : (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </>
          )}
        </button>
      )}
    </li>
  )

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Clients"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Clients' }]}
        subtitle={live ? undefined : 'Showing demo data — changes are disabled.'}
        actions={
          live && (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className={btnPrimary}
            >
              <Plus className="h-4 w-4" />
              New client
            </button>
          )
        }
      />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {adding && (
        <NewClientForm
          busy={busy}
          onCancel={() => setAdding(false)}
          onSave={(c) => add.mutate(c)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Active clients" value={active.length} />
        <SummaryCard
          label="Appointments booked"
          value={all.reduce((s, c) => s + c.appointmentCount, 0)}
        />
        <SummaryCard label="Archived" value={archived.length} />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm shadow-soft focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyCard icon={Building2}>No clients match.</EmptyCard>
      ) : (
        <div>
          <ul>
            {active.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </ul>

          {archived.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Archived · {archived.length}
              </h3>
              <ul>
                {archived.map((c) => (
                  <Row key={c.id} c={c} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
