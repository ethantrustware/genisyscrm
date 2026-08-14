import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Download,
  FileText,
  FolderOpen,
  FolderPlus,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  createFolder,
  deleteDocument,
  deleteFolder,
  downloadDocument,
  fetchDocuments,
  fetchFolders,
  moveDocument,
  uploadDocument,
  useIsLive,
  type DocRow,
} from '@/lib/api'
import {
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
  btnPrimary,
  inputCls,
} from '@/components/ui'
import { cn, fileSize, formatDate } from '@/lib/utils'

/** Mirrors the Hub's cap so a file that uploads there uploads here. */
const MAX_MB = 25

export default function Documents() {
  const live = useIsLive()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const [folder, setFolder] = useState<string>('all')
  const [newFolder, setNewFolder] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const docs = useQuery<DocRow[]>({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
  })
  const folders = useQuery({ queryKey: ['folders'], queryFn: fetchFolders })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    queryClient.invalidateQueries({ queryKey: ['folders'] })
  }
  const onErr = (e: unknown) =>
    setError(e instanceof Error ? e.message : 'Something went wrong.')

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      // Uploaded one at a time so a single rejected file reports its own
      // reason instead of failing the whole batch anonymously.
      for (const file of Array.from(files)) {
        if (file.size > MAX_MB * 1024 * 1024) {
          throw new Error(`${file.name} is over the ${MAX_MB} MB limit.`)
        }
        const r = await uploadDocument(
          file,
          folder === 'all' ? null : folder,
        )
        if (!r.ok) throw new Error(`${file.name}: ${r.error}`)
      }
    },
    onSuccess: () => {
      setError(null)
      refresh()
    },
    onError: onErr,
  })

  const addFolder = useMutation({
    mutationFn: () => createFolder(newFolder.trim()),
    onSuccess: () => {
      setNewFolder('')
      setShowNewFolder(false)
      setError(null)
      refresh()
    },
    onError: onErr,
  })

  const removeFolder = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      setFolder('all')
      refresh()
    },
    onError: onErr,
  })

  const removeDoc = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: refresh,
    onError: onErr,
  })

  const relocate = useMutation({
    mutationFn: (v: { id: string; folderId: string | null }) =>
      moveDocument(v.id, { folderId: v.folderId }),
    onSuccess: refresh,
    onError: onErr,
  })

  const grab = useMutation({
    mutationFn: async (d: DocRow) => {
      const r = await downloadDocument(d.id, d.filename)
      if (!r.ok) throw new Error(r.error ?? 'Download failed.')
    },
    onError: onErr,
  })

  if (docs.isLoading) return <Loading />
  if (docs.isError)
    return (
      <ErrorCard
        message={
          docs.error instanceof Error ? docs.error.message : 'Could not load.'
        }
      />
    )

  const all = docs.data ?? []
  const folderList = folders.data?.folders ?? []
  const rows =
    folder === 'all'
      ? all
      : all.filter((d) => {
          const f = folderList.find((x) => x.id === folder)
          return f ? d.folderName === f.name : false
        })

  const busy =
    upload.isPending ||
    addFolder.isPending ||
    removeFolder.isPending ||
    removeDoc.isPending ||
    relocate.isPending

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Documents"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Documents' }]}
        subtitle={
          live ? undefined : 'Showing demo data — changes are disabled.'
        }
        actions={
          live && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNewFolder((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold transition hover:bg-muted"
              >
                <FolderPlus className="h-4 w-4" />
                New folder
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className={btnPrimary}
              >
                {upload.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </button>
            </div>
          )
        }
      />

      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) upload.mutate(e.target.files)
          // Reset so re-picking the same file fires change again.
          e.target.value = ''
        }}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {showNewFolder && live && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFolder.trim()) addFolder.mutate()
            }}
            placeholder="Folder name"
            className={cn(inputCls, 'min-w-[220px] flex-1')}
          />
          <button
            type="button"
            disabled={!newFolder.trim() || busy}
            onClick={() => addFolder.mutate()}
            className={btnPrimary}
          >
            Create
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Files" value={all.length} />
        <SummaryCard label="Folders" value={folderList.length} />
        <SummaryCard
          label="Total size"
          value={fileSize(all.reduce((s, d) => s + d.sizeBytes, 0))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFolder('all')}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition',
            folder === 'all'
              ? 'bg-primary-soft text-primary'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted',
          )}
        >
          All files
        </button>
        {folderList.map((f) => (
          <span key={f.id} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => setFolder(f.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                folder === f.id
                  ? 'bg-primary-soft text-primary'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {f.name} · {f.documentCount}
            </button>
            {live && folder === f.id && f.documentCount === 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(`Delete the folder "${f.name}"?`)) return
                  removeFolder.mutate(f.id)
                }}
                title="Delete empty folder"
                className="ml-1 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Drop zone doubles as the file list container. */}
      <div
        onDragOver={(e) => {
          if (!live) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!live) return
          if (e.dataTransfer.files?.length) upload.mutate(e.dataTransfer.files)
        }}
        className={cn(
          'rounded-2xl border transition',
          dragging
            ? 'border-primary bg-primary-soft/40 ring-2 ring-primary/30'
            : 'border-border bg-card',
        )}
      >
        {rows.length === 0 ? (
          <div className="p-10">
            <EmptyCard icon={FolderOpen}>
              {live
                ? 'No files here yet — drop one in, or use Upload.'
                : 'No documents.'}
            </EmptyCard>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">File</th>
                  <th className="px-4 py-2.5 font-semibold">Folder</th>
                  <th className="px-4 py-2.5 font-semibold">Size</th>
                  <th className="px-4 py-2.5 font-semibold">Added</th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border-soft last:border-0 hover:bg-surface-muted"
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">
                          {d.filename}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {live ? (
                        <select
                          value={
                            folderList.find((f) => f.name === d.folderName)
                              ?.id ?? ''
                          }
                          disabled={busy}
                          onChange={(e) =>
                            relocate.mutate({
                              id: d.id,
                              folderId: e.target.value || null,
                            })
                          }
                          className="rounded-lg border border-border bg-card px-2 py-1 text-xs focus:outline-none"
                        >
                          <option value="">No folder</option>
                          {folderList.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      ) : d.folderName ? (
                        <Chip tone="blue">{d.folderName}</Chip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {fileSize(d.sizeBytes)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(d.createdAt)}
                      {d.uploadedBy ? ` · ${d.uploadedBy}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={!live || grab.isPending}
                          onClick={() => grab.mutate(d)}
                          title="Download"
                          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-primary disabled:opacity-40"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {live && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Delete "${d.filename}"? This cannot be undone.`,
                                )
                              )
                                return
                              removeDoc.mutate(d.id)
                            }}
                            title="Delete"
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-destructive disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {live && (
        <p className="text-xs text-muted-foreground">
          Drag files anywhere onto the list to upload. Max {MAX_MB} MB each —
          same limit as the Hub.
        </p>
      )}
    </div>
  )
}
