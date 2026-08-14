import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
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
import { cn, formatDate } from '@/lib/utils'

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


/**
 * Client detail. Opens over the list rather than navigating, so you keep
 * your place in a long roster after closing it.
 */
function ClientDetail({
  client,
  live,
  busy,
  onClose,
  onArchive,
}: {
  client: Client
  live: boolean
  busy: boolean
  onClose: () => void
  onArchive: (active: boolean) => void
}) {
  const rows: Array<{
    icon: typeof Mail
    label: string
    value: string | null
    href?: string
  }> = [
    {
      icon: Mail,
      label: 'Email',
      value: client.contactEmail,
      href: client.contactEmail ? 'mailto:' + client.contactEmail : undefined,
    },
    {
      icon: Phone,
      label: 'Phone',
      value: client.contactPhone,
      href: client.contactPhone
        ? 'tel:' + client.contactPhone.replace(/[^0-9+]/g, '')
        : undefined,
    },
    { icon: MapPin, label: 'State', value: client.state },
    {
      icon: CalendarDays,
      label: 'Added',
      value: client.createdAt ? formatDate(client.createdAt) : null,
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
            <Avatar name={client.name} color={client.color} />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{client.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {client.contactName || 'No contact on file'}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Chip tone={client.active ? 'mint' : 'muted'}>
              {client.active ? 'Active' : 'Archived'}
            </Chip>
            <button type="button" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Appointments
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {client.appointmentCount}
            </p>
          </div>
          <div className="rounded-xl border border-border-soft bg-surface-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Brand colour
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <span
                className="h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: client.color }}
              />
              <span className="font-mono text-xs">{client.color}</span>
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </p>
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
                    <span className="text-muted-foreground">-</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {client.contactRole && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Role
            </p>
            <p className="text-sm">{client.contactRole}</p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border-soft pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted"
          >
            Close
          </button>
          {live && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  client.active &&
                  !window.confirm(
                    'Archive ' +
                      client.name +
                      '? Their appointments and history are kept - they just stop appearing as active.',
                  )
                )
                  return
                onArchive(!client.active)
                onClose()
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
            >
              {client.active ? (
                <>
                  <Archive className="h-4 w-4" />
                  Archive
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Clients() {
  const live = useIsLive()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  // Folded by default — archived clients are history, not the working list.
  const [archivedOpen, setArchivedOpen] = useState(false)
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
      onClick={() => setOpenId(c.id)}
      className={cn(
        'flex cursor-pointer flex-wrap items-center gap-3 border-t border-border-soft px-2 py-4 transition hover:bg-surface-muted',
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
          onClick={(e) => {
            e.stopPropagation()
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

      {openId &&
        (() => {
          const c = all.find((x) => x.id === openId)
          return c ? (
            <ClientDetail
              client={c}
              live={live}
              busy={busy}
              onClose={() => setOpenId(null)}
              onArchive={(active) => archive.mutate({ id: c.id, active })}
            />
          ) : null
        })()}

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
              <button
                type="button"
                onClick={() => setArchivedOpen((v) => !v)}
                aria-expanded={archivedOpen}
                className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
              >
                {archivedOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Archived · {archived.length}
              </button>
              {archivedOpen && (
                <ul className="opacity-80">
                  {archived.map((c) => (
                    <Row key={c.id} c={c} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
