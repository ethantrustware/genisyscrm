import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound,
  Pencil,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import {
  createVaultEntry,
  deleteVaultEntry,
  fetchVault,
  updateVaultEntry,
  type VaultEntry,
} from '@/lib/api'
import {
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
} from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Vault — the same entries as the Hub's /vault, minus reveal.
 *
 * Secrets are decrypted only inside the Hub, where the master key lives.
 * This surface lists, adds, edits and rotates; it never receives a
 * plaintext value back. That keeps credentials off a separately-hosted
 * domain whose frontend repo is public, and the Hub's own page is one
 * click away when somebody genuinely needs to read a key.
 *
 * Writing a secret is one-way and that is the point: you can replace a
 * key here, you just can't retrieve one.
 */

const dayFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** "3 days ago" reads better than a date for a freshness signal. */
function sinceLabel(iso: string | null): string {
  if (!iso) return 'never used'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)
  if (days <= 0) return 'used today'
  if (days === 1) return 'used yesterday'
  if (days < 30) return `used ${days}d ago`
  if (days < 365) return `used ${Math.floor(days / 30)}mo ago`
  return `used ${Math.floor(days / 365)}y ago`
}

const inputCls =
  'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary'

type FormState = {
  id: string | null
  name: string
  description: string
  tags: string
  value: string
}

const EMPTY: FormState = {
  id: null,
  name: '',
  description: '',
  tags: '',
  value: '',
}

function EntryForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: FormState
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [error, setError] = useState<string | null>(null)
  const editing = initial.id !== null

  const save = useMutation({
    mutationFn: async () => {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      if (editing) {
        await updateVaultEntry({
          id: initial.id!,
          name: form.name,
          description: form.description,
          tags,
          // Blank means "leave the stored secret alone".
          value: form.value || undefined,
        })
      } else {
        await createVaultEntry({
          name: form.name,
          description: form.description,
          tags,
          value: form.value,
        })
      }
    },
    onError: (e: Error) => setError(e.message),
    onSuccess: () => {
      onSaved()
      onClose()
    },
  })

  const canSave =
    form.name.trim().length > 0 && (editing || form.value.length > 0)

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {editing ? `Edit ${initial.name}` : 'New entry'}
        </h2>
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
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Whop API Key"
          />
          <span className="text-[11px] text-muted-foreground">
            Integrations look entries up by this exact name — renaming one
            that is in use will break it.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Description</span>
          <textarea
            className={cn(inputCls, 'min-h-[68px] resize-y')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What uses this, and where it came from."
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Tags</span>
          <input
            className={inputCls}
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="ghl, billing"
          />
          <span className="text-[11px] text-muted-foreground">
            Comma separated. The Hub finds every GHL sub-account token by
            the <code>ghl</code> tag, so that one is load-bearing.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">
            {editing ? 'Replace secret' : 'Secret'}
          </span>
          <input
            className={cn(inputCls, 'font-mono')}
            type="password"
            autoComplete="off"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            placeholder={editing ? 'Leave blank to keep the current one' : ''}
          />
          <span className="text-[11px] text-muted-foreground">
            Stored encrypted and never sent back here. To read a secret,
            use the Hub&apos;s own Vault page.
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canSave || save.isPending}
            onClick={() => {
              setError(null)
              save.mutate()
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add entry'}
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

export default function Vault() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [confirming, setConfirming] = useState<VaultEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['vault'],
    queryFn: fetchVault,
    staleTime: 60_000,
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['vault'] })

  const remove = useMutation({
    mutationFn: (id: string) => deleteVaultEntry(id),
    onError: (e: Error) => setActionError(e.message),
    onSuccess: () => {
      setConfirming(null)
      refresh()
    },
  })

  const entries = query.data ?? []

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(needle) ||
        (e.description ?? '').toLowerCase().includes(needle) ||
        e.tags.some((t) => t.includes(needle)),
    )
  }, [entries, q])

  const stale = entries.filter(
    (e) =>
      !e.lastUsedAt ||
      Date.now() - new Date(e.lastUsedAt).getTime() > 90 * 86400_000,
  ).length

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Vault"
        subtitle="API keys and secrets, encrypted in the Hub."
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Vault' }]}
        actions={
          <button
            type="button"
            onClick={() => setForm(EMPTY)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add entry
          </button>
        }
      />

      {query.isLoading && <Loading />}
      {query.isError && <ErrorCard message={(query.error as Error).message} />}

      {query.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Entries" value={entries.length} />
            <SummaryCard
              label="Unused for 90 days"
              value={stale}
              tone={stale > 0 ? 'bad' : 'default'}
              sub={stale > 0 ? 'worth reviewing' : undefined}
            />
            <SummaryCard
              label="Tags"
              value={new Set(entries.flatMap((e) => e.tags)).size}
            />
          </div>

          {form && (
            <EntryForm
              initial={form}
              onClose={() => setForm(null)}
              onSaved={refresh}
            />
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, description or tag…"
              className={cn(inputCls, 'pl-9')}
            />
          </div>

          {actionError && <ErrorCard message={actionError} />}

          {filtered.length === 0 ? (
            <EmptyCard icon={KeyRound}>
              {entries.length === 0
                ? 'No entries yet. Add your first API key above.'
                : 'Nothing matches that search.'}
            </EmptyCard>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ul>
                {filtered.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-start gap-4 border-b border-border-soft px-5 py-4 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.name}</span>
                        {e.tags.map((t) => (
                          <Chip key={t} tone="blue">
                            {t}
                          </Chip>
                        ))}
                      </div>
                      {e.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {e.description}
                        </p>
                      )}
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {sinceLabel(e.lastUsedAt)} · added{' '}
                        {dayFmt.format(new Date(e.createdAt))}
                        {e.createdBy ? ` by ${e.createdBy}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Edit ${e.name}`}
                        onClick={() =>
                          setForm({
                            id: e.id,
                            name: e.name,
                            description: e.description ?? '',
                            tags: e.tags.join(', '),
                            value: '',
                          })
                        }
                        className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${e.name}`}
                        onClick={() => {
                          setActionError(null)
                          setConfirming(e)
                        }}
                        className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deleting a key silently breaks whatever reads it, so the
              confirmation names the entry rather than asking "are you sure". */}
          {confirming && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
              <h2 className="text-sm font-semibold">
                Delete “{confirming.name}”?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Anything in the Hub that looks this entry up by name will stop
                working immediately, and the secret cannot be recovered. Its
                audit history goes with it.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(confirming.id)}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {remove.isPending ? 'Deleting…' : 'Delete permanently'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <p>
              Secrets are encrypted in the Hub and never sent to this app —
              you can add, replace and delete them here, but not read them
              back. Use the Hub&apos;s Vault page to reveal a value, which
              records who looked and when.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
