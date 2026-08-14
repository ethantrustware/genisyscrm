import { useQuery } from '@tanstack/react-query'
import { FileText, FolderOpen } from 'lucide-react'
import { fetchDocuments, useIsLive, type DocRow } from '@/lib/api'
import {
  Chip,
  EmptyCard,
  ErrorCard,
  Loading,
  PageHeader,
  SummaryCard,
} from '@/components/ui'
import { fileSize, formatDate } from '@/lib/utils'

export default function Documents() {
  const live = useIsLive()
  const { data, isLoading, isError, error } = useQuery<DocRow[]>({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
  })

  if (isLoading) return <Loading />
  if (isError)
    return (
      <ErrorCard
        message={error instanceof Error ? error.message : 'Could not load.'}
      />
    )

  const docs = data ?? []
  const folders = Array.from(
    new Set(docs.map((d) => d.folderName).filter(Boolean) as string[]),
  )
  const totalBytes = docs.reduce((s, d) => s + d.sizeBytes, 0)

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Documents"
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Documents' }]}
        subtitle={live ? undefined : 'Showing demo data.'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Files" value={docs.length} />
        <SummaryCard label="Folders" value={folders.length} />
        <SummaryCard label="Total size" value={fileSize(totalBytes)} />
      </div>

      {docs.length === 0 ? (
        <EmptyCard icon={FolderOpen}>No documents uploaded yet.</EmptyCard>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">File</th>
                  <th className="px-4 py-2.5 font-semibold">Folder</th>
                  <th className="px-4 py-2.5 font-semibold">Size</th>
                  <th className="px-4 py-2.5 font-semibold">Uploaded by</th>
                  <th className="px-4 py-2.5 font-semibold">Added</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
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
                      {d.folderName ? (
                        <Chip tone="blue">{d.folderName}</Chip>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {fileSize(d.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.uploadedBy ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(d.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
